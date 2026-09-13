from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...storage.in_memory import store
from ...domain.models.engineering_state import EngineeringDecision
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/engineering-state", tags=["engineering-state"])


class DecisionCreate(BaseModel):
    application_id: str
    decision: str
    rationale: str = ""
    decided_by: str = ""
    impact: str = "MEDIUM"
    tags: list[str] = []


@router.get("")
def list_engineering_states(tenant_id: str = "tenant_forgeiq"):
    return store.engineering_states.all(tenant_id)


@router.get("/{state_id}")
def get_engineering_state(state_id: str):
    es = store.engineering_states.get(state_id)
    if not es:
        raise HTTPException(404, "Engineering state not found")
    return es


@router.get("/application/{application_id}")
def get_application_engineering_state(application_id: str):
    for es in store.engineering_states.all():
        if es.application_id == application_id:
            return es
    raise HTTPException(404, "Engineering state not found for application")


@router.post("/decisions")
def create_decision(body: DecisionCreate):
    dec = EngineeringDecision(
        tenant_id="tenant_forgeiq",
        id=gen_id("dec_"),
        application_id=body.application_id,
        decision=body.decision,
        rationale=body.rationale,
        decided_by=body.decided_by,
        impact=body.impact,
        tags=body.tags,
        created_at=utc_now(),
    )
    store.decisions.add(dec)
    for es in store.engineering_states.all():
        if es.application_id == body.application_id:
            es.decisions.append(dec)
            es.last_updated = utc_now().isoformat()
            break
    return dec
