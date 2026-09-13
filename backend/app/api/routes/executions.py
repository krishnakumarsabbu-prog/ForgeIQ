from __future__ import annotations

import asyncio
import json
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...storage.in_memory import store
from ...domain.models.execution import (
    Execution, ExecutionEvent, EventType, Approval,
    ApprovalType, ApprovalStatus, EscalationTarget,
)
from ...domain.models.evidence import EvidenceType, EvidenceStatus
from ...domain.models.base import gen_id, utc_now
from ...runtime.pipeline_runtime import PipelineRuntime
from ...runtime.harness_runtime import HarnessRuntime
from ...runtime.evidence_engine import EvidenceEngine
from ...events.event_bus import event_bus
from ...events.emit import emit_event

router = APIRouter(prefix="/executions", tags=["executions"])


class ExecutionCreate(BaseModel):
    pipeline_id: Optional[str] = None
    harness_id: Optional[str] = None
    application_id: Optional[str] = None
    requirement_id: Optional[str] = None
    trigger: str = "manual"
    trigger_reason: str = ""
    tenant_id: str = "tenant_forgeiq"


class ApprovalDecision(BaseModel):
    decided_by: str
    decision: str  # approved | rejected | changes_requested | escalated
    reason: str = ""
    escalate_to: Optional[str] = None


class ApprovalCreateBody(BaseModel):
    approval_type: str = ApprovalType.HIGH_RISK_CHANGE.value
    requested_by: str = "system"
    risk_level: str = "MEDIUM"
    requested_action: str = ""
    reason: str = ""
    impact: str = ""
    node_id: Optional[str] = None
    harness_id: Optional[str] = None


@router.get("")
def list_executions(tenant_id: str = "tenant_forgeiq"):
    return store.executions.all(tenant_id)


@router.get("/{execution_id}")
def get_execution(execution_id: str):
    e = store.executions.get(execution_id)
    if not e:
        raise HTTPException(404, "Execution not found")
    return e


@router.get("/{execution_id}/events")
def get_execution_events(execution_id: str):
    return [evt for evt in store.events if evt.execution_id == execution_id]


@router.post("")
async def create_execution(body: ExecutionCreate):
    execution = Execution(
        tenant_id=body.tenant_id,
        id=gen_id("exec_"),
        pipeline_id=body.pipeline_id,
        harness_id=body.harness_id,
        application_id=body.application_id,
        requirement_id=body.requirement_id,
        status="PENDING",
        trigger=body.trigger,
        trigger_reason=body.trigger_reason,
        created_at=utc_now(),
    )
    store.executions.add(execution)

    start_evt = emit_event(
        execution_id=execution.id,
        event_type=EventType.EXECUTION_STARTED,
        message=f"Execution started - trigger: {body.trigger}",
    )
    execution.events.append(start_evt)

    asyncio.create_task(_run_execution(execution.id, body.pipeline_id, body.harness_id, body.application_id, body.requirement_id, body.tenant_id))

    return execution


async def _run_execution(execution_id: str, pipeline_id: Optional[str], harness_id: Optional[str], application_id: Optional[str], requirement_id: Optional[str], tenant_id: str):
    await asyncio.sleep(0.1)
    try:
        if pipeline_id:
            runtime = PipelineRuntime(tenant_id)
            await runtime.execute(
                pipeline_id=pipeline_id,
                execution_id=execution_id,
                application_id=application_id,
                requirement_id=requirement_id,
            )
        elif harness_id:
            runtime = HarnessRuntime(tenant_id)
            await runtime.execute(
                harness_id=harness_id,
                execution_id=execution_id,
                application_id=application_id,
                requirement_id=requirement_id,
            )
    except Exception as e:
        execution = store.executions.get(execution_id)
        if execution:
            execution.status = "FAILED"
            execution.error_message = str(e)
            execution.completed_at = utc_now().isoformat()
        emit_event(
            execution_id=execution_id,
            event_type=EventType.EXECUTION_FAILED,
            message=f"Execution failed: {e}",
        )


@router.get("/{execution_id}/stream")
async def stream_execution(execution_id: str):
    async def event_generator() -> AsyncGenerator[str, None]:
        async for chunk in event_bus.stream(execution_id=execution_id, include_history=True):
            yield chunk
        execution = store.executions.get(execution_id)
        if execution and execution.status not in ("COMPLETED", "FAILED", "CANCELLED", "REJECTED", "CHANGES_REQUESTED"):
            async for chunk in event_bus.stream(execution_id=execution_id, include_history=False):
                yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/{execution_id}/approvals")
def get_execution_approvals(execution_id: str):
    return [a for a in store.approvals.all() if a.execution_id == execution_id]


@router.post("/{execution_id}/approvals")
def create_approval(execution_id: str, body: ApprovalCreateBody):
    execution = store.executions.get(execution_id)
    if not execution:
        raise HTTPException(404, "Execution not found")
    approval = Approval(
        tenant_id="tenant_forgeiq",
        id=gen_id("appr_"),
        execution_id=execution_id,
        node_id=body.node_id,
        harness_id=body.harness_id or execution.harness_id,
        pipeline_id=execution.pipeline_id,
        application_id=execution.application_id,
        approval_type=body.approval_type,
        requested_by=body.requested_by,
        risk_level=body.risk_level,
        requested_action=body.requested_action,
        reason=body.reason,
        impact=body.impact,
        status=ApprovalStatus.PENDING.value,
        checkpoint_node_id=execution.current_node,
        checkpoint_harness_id=execution.harness_id,
        checkpoint_pipeline_id=execution.pipeline_id,
    )
    store.approvals.add(approval)
    execution.approval_ids.append(approval.id)
    execution.status = "WAITING_FOR_APPROVAL"
    execution.waiting_approval_id = approval.id
    emit_event(
        execution_id=execution_id,
        event_type=EventType.APPROVAL_REQUESTED,
        message=f"Approval requested ({body.approval_type}) by {body.requested_by}: {body.reason}",
        data={"approval_id": approval.id, "approval_type": body.approval_type, "risk_level": body.risk_level},
    )
    emit_event(
        execution_id=execution_id,
        event_type=EventType.EXECUTION_WAITING,
        message=f"Execution waiting for approval ({body.approval_type})",
        data={"approval_id": approval.id},
    )
    return approval


@router.post("/{execution_id}/approvals/{approval_id}/decide")
async def decide_approval(execution_id: str, approval_id: str, body: ApprovalDecision):
    approval = store.approvals.get(approval_id)
    if not approval:
        raise HTTPException(404, "Approval not found")
    if approval.status != ApprovalStatus.PENDING.value:
        raise HTTPException(400, f"Approval already decided ({approval.status})")

    valid = {ApprovalStatus.APPROVED.value, ApprovalStatus.REJECTED.value,
             ApprovalStatus.CHANGES_REQUESTED.value, ApprovalStatus.ESCALATED.value}
    if body.decision not in valid:
        raise HTTPException(400, f"Invalid decision: {body.decision}")

    approval.decision = body.decision
    approval.decided_by = body.decided_by
    approval.decided_at = utc_now().isoformat()
    approval.reason = body.reason
    execution = store.executions.get(execution_id)

    if body.decision == ApprovalStatus.ESCALATED.value:
        approval.status = ApprovalStatus.ESCALATED.value
        approval.escalated_to = body.escalate_to or EscalationTarget.ENGINEERING_LEAD.value
        escalated = Approval(
            tenant_id=approval.tenant_id,
            id=gen_id("appr_"),
            execution_id=execution_id,
            node_id=approval.node_id,
            harness_id=approval.harness_id,
            pipeline_id=approval.pipeline_id,
            application_id=approval.application_id,
            approval_type=approval.approval_type,
            requested_by=body.decided_by,
            risk_level=approval.risk_level,
            requested_action=approval.requested_action,
            reason=f"Escalated from {approval_id}: {body.reason}",
            impact=approval.impact,
            status=ApprovalStatus.PENDING.value,
            escalated_from_id=approval.id,
            checkpoint_node_id=approval.checkpoint_node_id,
            checkpoint_harness_id=approval.checkpoint_harness_id,
            checkpoint_pipeline_id=approval.checkpoint_pipeline_id,
        )
        store.approvals.add(escalated)
        if execution:
            execution.approval_ids.append(escalated.id)
            execution.waiting_approval_id = escalated.id
        emit_event(
            execution_id=execution_id,
            event_type=EventType.APPROVAL_ESCALATED,
            message=f"Approval escalated to {approval.escalated_to} by {body.decided_by}: {body.reason}",
            data={"approval_id": escalated.id, "escalated_from": approval.id, "escalated_to": approval.escalated_to},
        )
        _create_evidence(approval, execution, "escalated")
        return escalated

    approval.status = body.decision
    evt_map = {
        ApprovalStatus.APPROVED.value: EventType.APPROVAL_GRANTED,
        ApprovalStatus.REJECTED.value: EventType.APPROVAL_REJECTED,
        ApprovalStatus.CHANGES_REQUESTED.value: EventType.APPROVAL_CHANGES_REQUESTED,
    }
    emit_event(
        execution_id=execution_id,
        event_type=evt_map[body.decision],
        message=f"Approval {body.decision} by {body.decided_by}: {body.reason}",
        data={"approval_id": approval.id, "decision": body.decision},
    )
    _create_evidence(approval, execution, body.decision)

    if execution:
        if body.decision == ApprovalStatus.APPROVED.value:
            execution.waiting_approval_id = None
            execution.status = "RUNNING"
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_RESUMED,
                message="Execution resumed after approval",
                data={"approval_id": approval.id},
            )
            asyncio.create_task(_resume_execution(execution_id, approval))
        elif body.decision == ApprovalStatus.REJECTED.value:
            execution.waiting_approval_id = None
            execution.status = "REJECTED"
            execution.completed_at = utc_now().isoformat()
        elif body.decision == ApprovalStatus.CHANGES_REQUESTED.value:
            execution.waiting_approval_id = None
            execution.status = "CHANGES_REQUESTED"
            execution.completed_at = utc_now().isoformat()
    return approval


@router.post("/{execution_id}/resume")
async def resume_execution(execution_id: str):
    execution = store.executions.get(execution_id)
    if not execution:
        raise HTTPException(404, "Execution not found")
    if execution.status not in ("WAITING_FOR_APPROVAL", "PAUSED", "CHANGES_REQUESTED"):
        raise HTTPException(400, f"Cannot resume execution in status {execution.status}")
    execution.status = "RUNNING"
    emit_event(
        execution_id=execution_id,
        event_type=EventType.EXECUTION_RESUMED,
        message="Execution resumed manually",
    )
    approval = None
    if execution.approval_ids:
        approval = store.approvals.get(execution.approval_ids[-1])
    asyncio.create_task(_resume_execution(execution_id, approval))
    return {"status": "RUNNING", "execution_id": execution_id}


def _create_evidence(approval: Approval, execution, decision: str) -> None:
    engine = EvidenceEngine(approval.tenant_id)
    evidence = engine.create_evidence(
        execution_id=approval.execution_id,
        evidence_type=EvidenceType.APPROVAL,
        application_id=approval.application_id or (execution.application_id if execution else None),
        pipeline_id=approval.pipeline_id or (execution.pipeline_id if execution else None),
        harness_id=approval.harness_id or (execution.harness_id if execution else None),
        node_id=approval.node_id,
        approvals=[{
            "approver": approval.decided_by or "",
            "decision": decision,
            "reason": approval.reason,
            "timestamp": approval.decided_at or "",
        }],
        inputs={
            "approval_type": approval.approval_type,
            "requested_action": approval.requested_action,
            "risk_level": approval.risk_level,
            "requested_by": approval.requested_by,
        },
        outputs={
            "decision": decision,
            "decided_by": approval.decided_by,
            "reason": approval.reason,
        },
        status=EvidenceStatus.SUCCESS if decision == "approved" else EvidenceStatus.WARNING,
        summary=f"Approval {decision} ({approval.approval_type}) by {approval.decided_by}",
    )
    store.evidence.add(evidence)
    approval.evidence_id = evidence.id
    if execution:
        execution.evidence_ids.append(evidence.id)
    emit_event(
        execution_id=approval.execution_id,
        event_type=EventType.EVIDENCE_CREATED,
        message=f"Evidence created for approval decision ({decision})",
        data={"evidence_id": evidence.id, "approval_id": approval.id},
    )


async def _resume_execution(execution_id: str, approval: Optional[Approval]) -> None:
    await asyncio.sleep(0.1)
    try:
        if approval and approval.checkpoint_pipeline_id:
            runtime = PipelineRuntime(approval.tenant_id)
            await runtime.execute(
                pipeline_id=approval.checkpoint_pipeline_id,
                execution_id=execution_id,
                application_id=approval.application_id,
            )
        elif approval and approval.checkpoint_harness_id:
            runtime = HarnessRuntime(approval.tenant_id)
            await runtime.execute(
                harness_id=approval.checkpoint_harness_id,
                execution_id=execution_id,
                application_id=approval.application_id,
            )
        else:
            execution = store.executions.get(execution_id)
            if execution and execution.pipeline_id:
                runtime = PipelineRuntime(execution.tenant_id)
                await runtime.execute(
                    pipeline_id=execution.pipeline_id,
                    execution_id=execution_id,
                    application_id=execution.application_id,
                )
            elif execution and execution.harness_id:
                runtime = HarnessRuntime(execution.tenant_id)
                await runtime.execute(
                    harness_id=execution.harness_id,
                    execution_id=execution_id,
                    application_id=execution.application_id,
                )
    except Exception as e:
        execution = store.executions.get(execution_id)
        if execution:
            execution.status = "FAILED"
            execution.error_message = str(e)
            execution.completed_at = utc_now().isoformat()
        emit_event(
            execution_id=execution_id,
            event_type=EventType.EXECUTION_FAILED,
            message=f"Execution failed after resume: {e}",
        )
