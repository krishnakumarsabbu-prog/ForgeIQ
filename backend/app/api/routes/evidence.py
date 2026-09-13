from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ...storage.in_memory import store

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.get("")
def list_evidence(tenant_id: str = "tenant_forgeiq"):
    return store.evidence.all(tenant_id)


@router.get("/{evidence_id}")
def get_evidence(evidence_id: str):
    e = store.evidence.get(evidence_id)
    if not e:
        raise HTTPException(404, "Evidence not found")
    return e


@router.get("/execution/{execution_id}")
def get_execution_evidence(execution_id: str):
    return [e for e in store.evidence.all() if e.execution_id == execution_id]
