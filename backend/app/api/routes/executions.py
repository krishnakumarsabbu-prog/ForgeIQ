from __future__ import annotations

import asyncio
import json
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...storage.in_memory import store
from ...domain.models.execution import Execution, ExecutionEvent, EventType, Approval
from ...domain.models.base import gen_id, utc_now
from ...runtime.pipeline_runtime import PipelineRuntime
from ...runtime.harness_runtime import HarnessRuntime

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
    status: str  # "approved" or "rejected"
    reason: str = ""


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

    start_evt = ExecutionEvent(
        id=gen_id("evt_"),
        execution_id=execution.id,
        event_type=EventType.EXECUTION_STARTED,
        message=f"Execution started - trigger: {body.trigger}",
    )
    store.events.append(start_evt)
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
        fail_evt = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.EXECUTION_FAILED,
            message=f"Execution failed: {e}",
        )
        store.events.append(fail_evt)


@router.get("/{execution_id}/stream")
async def stream_execution(execution_id: str):
    async def event_generator() -> AsyncGenerator[str, None]:
        sent = 0
        while True:
            events = [evt for evt in store.events if evt.execution_id == execution_id]
            new_events = events[sent:]
            for evt in new_events:
                yield f"data: {json.dumps(evt.model_dump(), default=str)}\n\n"
                sent += 1
            execution = store.executions.get(execution_id)
            if execution and execution.status in ("COMPLETED", "FAILED", "CANCELLED"):
                yield f"data: {json.dumps({'type': 'DONE', 'execution_id': execution_id, 'status': execution.status})}\n\n"
                break
            await asyncio.sleep(0.2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{execution_id}/approvals")
def get_execution_approvals(execution_id: str):
    return [a for a in store.approvals.all() if a.execution_id == execution_id]


@router.post("/{execution_id}/approvals")
def create_approval(execution_id: str, requested_by: str = "system", risk_level: str = "MEDIUM"):
    approval = Approval(
        tenant_id="tenant_forgeiq",
        id=gen_id("appr_"),
        execution_id=execution_id,
        requested_by=requested_by,
        risk_level=risk_level,
    )
    store.approvals.add(approval)
    execution = store.executions.get(execution_id)
    if execution:
        execution.approval_ids.append(approval.id)
    evt = ExecutionEvent(
        id=gen_id("evt_"),
        execution_id=execution_id,
        event_type=EventType.APPROVAL_REQUESTED,
        message=f"Approval requested by {requested_by}",
    )
    store.events.append(evt)
    return approval


@router.post("/{execution_id}/approvals/{approval_id}/decide")
def decide_approval(execution_id: str, approval_id: str, body: ApprovalDecision):
    approval = store.approvals.get(approval_id)
    if not approval:
        raise HTTPException(404, "Approval not found")
    approval.status = body.status
    approval.decided_by = body.decided_by
    approval.decided_at = utc_now().isoformat()
    approval.reason = body.reason

    evt_type = EventType.APPROVAL_GRANTED if body.status == "approved" else EventType.APPROVAL_REJECTED
    evt = ExecutionEvent(
        id=gen_id("evt_"),
        execution_id=execution_id,
        event_type=evt_type,
        message=f"Approval {body.status} by {body.decided_by}: {body.reason}",
    )
    store.events.append(evt)
    return approval
