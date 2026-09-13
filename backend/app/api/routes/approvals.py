from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...storage.in_memory import store
from ...domain.models.execution import (
    Approval, ApprovalType, ApprovalStatus, EscalationTarget,
    EventType,
)
from ...domain.models.evidence import EvidenceType, EvidenceStatus
from ...domain.models.base import gen_id, utc_now
from ...runtime.evidence_engine import EvidenceEngine
from ...runtime.harness_runtime import HarnessRuntime
from ...runtime.pipeline_runtime import PipelineRuntime
from ...events.emit import emit_event

router = APIRouter(prefix="/approvals", tags=["approvals"])


class ApprovalDecisionBody(BaseModel):
    decided_by: str
    decision: str  # approved | rejected | changes_requested | escalated
    reason: str = ""
    escalate_to: Optional[str] = None


class ApprovalCreateBody(BaseModel):
    execution_id: str
    approval_type: str = ApprovalType.HIGH_RISK_CHANGE.value
    requested_by: str = "system"
    risk_level: str = "MEDIUM"
    requested_action: str = ""
    reason: str = ""
    impact: str = ""
    node_id: Optional[str] = None
    harness_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    application_id: Optional[str] = None


@router.get("")
def list_approvals(
    tenant_id: str = "tenant_forgeiq",
    status: Optional[str] = None,
    approval_type: Optional[str] = None,
    risk_level: Optional[str] = None,
):
    approvals = store.approvals.all(tenant_id)
    if status:
        approvals = [a for a in approvals if a.status == status]
    if approval_type:
        approvals = [a for a in approvals if a.approval_type == approval_type]
    if risk_level:
        approvals = [a for a in approvals if a.risk_level == risk_level]
    return approvals


@router.get("/types")
def list_approval_types():
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in ApprovalType]


@router.get("/escalation-targets")
def list_escalation_targets():
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in EscalationTarget]


@router.get("/{approval_id}")
def get_approval(approval_id: str):
    a = store.approvals.get(approval_id)
    if not a:
        raise HTTPException(404, "Approval not found")
    return a


@router.post("")
def create_approval(body: ApprovalCreateBody):
    execution = store.executions.get(body.execution_id)
    if not execution:
        raise HTTPException(404, "Execution not found")

    approval = Approval(
        tenant_id="tenant_forgeiq",
        id=gen_id("appr_"),
        execution_id=body.execution_id,
        node_id=body.node_id,
        harness_id=body.harness_id,
        pipeline_id=body.pipeline_id,
        application_id=body.application_id or execution.application_id,
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
        execution_id=body.execution_id,
        event_type=EventType.APPROVAL_REQUESTED,
        node_id=body.node_id,
        harness_id=body.harness_id,
        message=f"Approval requested ({body.approval_type}) by {body.requested_by}: {body.reason}",
        data={
            "approval_id": approval.id,
            "approval_type": body.approval_type,
            "risk_level": body.risk_level,
            "requested_action": body.requested_action,
        },
    )
    emit_event(
        execution_id=body.execution_id,
        event_type=EventType.EXECUTION_WAITING,
        message=f"Execution waiting for approval ({body.approval_type})",
        data={"approval_id": approval.id},
    )
    return approval


@router.post("/{approval_id}/decide")
async def decide_approval(approval_id: str, body: ApprovalDecisionBody):
    approval = store.approvals.get(approval_id)
    if not approval:
        raise HTTPException(404, "Approval not found")
    if approval.status != ApprovalStatus.PENDING.value:
        raise HTTPException(400, f"Approval already decided ({approval.status})")

    valid_decisions = {
        ApprovalStatus.APPROVED.value,
        ApprovalStatus.REJECTED.value,
        ApprovalStatus.CHANGES_REQUESTED.value,
        ApprovalStatus.ESCALATED.value,
    }
    if body.decision not in valid_decisions:
        raise HTTPException(400, f"Invalid decision: {body.decision}")

    approval.decision = body.decision
    approval.decided_by = body.decided_by
    approval.decided_at = utc_now().isoformat()
    approval.reason = body.reason

    execution = store.executions.get(approval.execution_id)

    if body.decision == ApprovalStatus.ESCALATED.value:
        approval.status = ApprovalStatus.ESCALATED.value
        approval.escalated_to = body.escalate_to or EscalationTarget.ENGINEERING_LEAD.value

        escalated = Approval(
            tenant_id=approval.tenant_id,
            id=gen_id("appr_"),
            execution_id=approval.execution_id,
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
            execution_id=approval.execution_id,
            event_type=EventType.APPROVAL_ESCALATED,
            node_id=approval.node_id,
            harness_id=approval.harness_id,
            message=f"Approval escalated to {approval.escalated_to} by {body.decided_by}: {body.reason}",
            data={
                "approval_id": escalated.id,
                "escalated_from": approval.id,
                "escalated_to": approval.escalated_to,
            },
        )
        _create_approval_evidence(approval, execution, "escalated")
        return escalated

    approval.status = body.decision

    evt_map = {
        ApprovalStatus.APPROVED.value: EventType.APPROVAL_GRANTED,
        ApprovalStatus.REJECTED.value: EventType.APPROVAL_REJECTED,
        ApprovalStatus.CHANGES_REQUESTED.value: EventType.APPROVAL_CHANGES_REQUESTED,
    }
    emit_event(
        execution_id=approval.execution_id,
        event_type=evt_map[body.decision],
        node_id=approval.node_id,
        harness_id=approval.harness_id,
        message=f"Approval {body.decision} by {body.decided_by}: {body.reason}",
        data={
            "approval_id": approval.id,
            "decision": body.decision,
            "decided_by": body.decided_by,
        },
    )

    _create_approval_evidence(approval, execution, body.decision)

    if execution:
        if body.decision == ApprovalStatus.APPROVED.value:
            execution.waiting_approval_id = None
            execution.status = "RUNNING"
            emit_event(
                execution_id=execution.id,
                event_type=EventType.EXECUTION_RESUMED,
                message="Execution resumed after approval",
                data={"approval_id": approval.id},
            )
            asyncio.create_task(_resume_execution(execution.id, approval))
        elif body.decision == ApprovalStatus.REJECTED.value:
            execution.waiting_approval_id = None
            execution.status = "REJECTED"
            execution.completed_at = utc_now().isoformat()
        elif body.decision == ApprovalStatus.CHANGES_REQUESTED.value:
            execution.waiting_approval_id = None
            execution.status = "CHANGES_REQUESTED"
            execution.completed_at = utc_now().isoformat()

    return approval


@router.post("/{approval_id}/escalate")
async def escalate_approval(approval_id: str, body: ApprovalDecisionBody):
    body.decision = ApprovalStatus.ESCALATED.value
    return await decide_approval(approval_id, body)


def _create_approval_evidence(approval: Approval, execution, decision: str) -> None:
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


async def _resume_execution(execution_id: str, approval: Approval) -> None:
    await asyncio.sleep(0.1)
    try:
        if approval.checkpoint_pipeline_id:
            runtime = PipelineRuntime(approval.tenant_id)
            await runtime.execute(
                pipeline_id=approval.checkpoint_pipeline_id,
                execution_id=execution_id,
                application_id=approval.application_id,
            )
        elif approval.checkpoint_harness_id:
            runtime = HarnessRuntime(approval.tenant_id)
            await runtime.execute(
                harness_id=approval.checkpoint_harness_id,
                execution_id=execution_id,
                application_id=approval.application_id,
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
