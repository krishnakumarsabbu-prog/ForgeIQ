from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.loop import Loop, LoopType
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/loops", tags=["loops"])


class LoopCreate(BaseModel):
    name: str
    display_name: str = ""
    loop_type: LoopType = LoopType.RETRY
    trigger: str = "on_failure"
    evaluation: str = ""
    action: str = ""
    max_iterations: int = 3
    exit_condition: str = "success"
    failure_handling: str = "escalate"
    escalation: str = "human_approval"
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_loops(tenant_id: str = "tenant_forgeiq"):
    return store.loops.all(tenant_id)


@router.get("/{loop_id}")
def get_loop(loop_id: str):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    return l


@router.post("")
def create_loop(body: LoopCreate):
    l = Loop(
        tenant_id=body.tenant_id,
        id=gen_id("loop_"),
        name=body.name,
        display_name=body.display_name or body.name,
        loop_type=body.loop_type,
        trigger=body.trigger,
        evaluation=body.evaluation,
        action=body.action,
        max_iterations=body.max_iterations,
        exit_condition=body.exit_condition,
        failure_handling=body.failure_handling,
        escalation=body.escalation,
        version="v1",
        published=False,
        created_at=utc_now(),
    )
    store.loops.add(l)
    return l
