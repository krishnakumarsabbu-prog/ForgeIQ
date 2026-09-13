from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...storage.in_memory import store
from ...domain.models.engineering_state import EngineeringDecision, StateChangeRecord
from ...domain.models.base import gen_id, utc_now
from ...runtime.engineering_state import EngineeringStateEngine
from ...runtime.context_engine import ContextEngine

router = APIRouter(prefix="/engineering-state", tags=["engineering-state"])


class DecisionCreate(BaseModel):
    application_id: str
    decision: str
    rationale: str = ""
    decided_by: str = ""
    impact: str = "MEDIUM"
    tags: list[str] = []


class StateUpdateBody(BaseModel):
    updates: dict


class ContextQueryBody(BaseModel):
    application_id: str
    query: str = ""


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


@router.put("/application/{application_id}")
def update_application_engineering_state(application_id: str, body: StateUpdateBody):
    engine = EngineeringStateEngine("tenant_forgeiq")
    es = engine.update_state(application_id, body.updates)
    if not es:
        raise HTTPException(404, "Engineering state not found for application")
    return es


@router.get("/application/{application_id}/history")
def get_state_history(application_id: str, limit: int = 100):
    engine = EngineeringStateEngine("tenant_forgeiq")
    return engine.get_history(application_id, limit=limit)


@router.get("/state/{state_id}/history")
def get_state_history_by_id(state_id: str, limit: int = 100):
    engine = EngineeringStateEngine("tenant_forgeiq")
    return engine.get_history_by_state(state_id, limit=limit)


@router.post("/context")
def retrieve_engineering_context(body: ContextQueryBody):
    engine = ContextEngine("tenant_forgeiq")
    return engine.retrieve_engineering_context(body.application_id, body.query)


@router.get("/application/{application_id}/context")
def get_engineering_context(application_id: str, query: str = ""):
    engine = ContextEngine("tenant_forgeiq")
    return engine.retrieve_engineering_context(application_id, query)


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
            change = StateChangeRecord(
                tenant_id="tenant_forgeiq",
                id=gen_id("sch_"),
                application_id=body.application_id,
                state_id=es.id,
                change_type="decision_recorded",
                description=f"Decision recorded: {body.decision}",
                category="governance",
                severity="info",
                metadata={"decision_id": dec.id, "impact": body.impact},
            )
            store.state_changes.add(change)
            es.change_history_ids.append(change.id)
            break
    return dec
