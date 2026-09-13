from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ...storage.in_memory import store
from ...runtime.evidence_engine import EvidenceEngine

router = APIRouter(prefix="/evidence", tags=["evidence"])

TENANT_ID = "tenant_forgeiq"


def _engine() -> EvidenceEngine:
    return EvidenceEngine(TENANT_ID)


@router.get("")
def list_evidence(
    tenant_id: str = TENANT_ID,
    application_id: Optional[str] = Query(None),
    execution_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    harness_id: Optional[str] = Query(None),
    pipeline_id: Optional[str] = Query(None),
    tool_id: Optional[str] = Query(None),
    model_used: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    evidence_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    engine = EvidenceEngine(tenant_id)
    return engine.filter(
        application_id=application_id,
        execution_id=execution_id,
        agent_id=agent_id,
        harness_id=harness_id,
        pipeline_id=pipeline_id,
        tool_id=tool_id,
        model_used=model_used,
        environment=environment,
        evidence_type=evidence_type,
        status=status,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/stats")
def evidence_stats(tenant_id: str = TENANT_ID):
    return EvidenceEngine(tenant_id).stats()


@router.get("/types")
def evidence_types():
    from ...domain.models.evidence import EvidenceType, EvidenceStatus
    return {
        "types": [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in EvidenceType],
        "statuses": [{"value": s.value, "label": s.value.title()} for s in EvidenceStatus],
    }


@router.get("/{evidence_id}")
def get_evidence(evidence_id: str):
    e = store.evidence.get(evidence_id)
    if not e:
        raise HTTPException(404, "Evidence not found")
    return e


@router.get("/execution/{execution_id}")
def get_execution_evidence(execution_id: str):
    engine = _engine()
    return engine.get_timeline(execution_id)


@router.get("/execution/{execution_id}/chain-verify")
def verify_evidence_chain(execution_id: str):
    return _engine().verify_chain(execution_id)


@router.get("/application/{application_id}")
def get_application_evidence(application_id: str):
    return [
        e for e in store.evidence.all() if e.application_id == application_id
    ]


@router.post("/")
def create_evidence(body: dict):
    """Create an evidence record. Once created, it cannot be modified or deleted."""
    from ...domain.models.evidence import EvidenceType, EvidenceStatus

    try:
        etype = EvidenceType(body.get("evidence_type", "action"))
    except ValueError:
        raise HTTPException(400, f"Invalid evidence_type")

    try:
        status = EvidenceStatus(body.get("status", "success"))
    except ValueError:
        raise HTTPException(400, f"Invalid status")

    engine = _engine()
    evidence = engine.create_evidence(
        execution_id=body["execution_id"],
        evidence_type=etype,
        application_id=body.get("application_id"),
        requirement_id=body.get("requirement_id"),
        pipeline_id=body.get("pipeline_id"),
        pipeline_version=body.get("pipeline_version"),
        harness_id=body.get("harness_id"),
        harness_version=body.get("harness_version"),
        graph_id=body.get("graph_id"),
        graph_version=body.get("graph_version"),
        loop_id=body.get("loop_id"),
        loop_iteration=body.get("loop_iteration"),
        node_id=body.get("node_id"),
        agent_id=body.get("agent_id"),
        agent_version=body.get("agent_version"),
        model_used=body.get("model_used"),
        model_provider=body.get("model_provider"),
        context_reference=body.get("context_reference"),
        tool_id=body.get("tool_id"),
        tool_operation=body.get("tool_operation"),
        inputs=body.get("inputs"),
        outputs=body.get("outputs"),
        code_changes=body.get("code_changes"),
        test_results=body.get("test_results"),
        security_results=body.get("security_results"),
        build_results=body.get("build_results"),
        release_results=body.get("release_results"),
        approvals=body.get("approvals"),
        policies_applied=body.get("policies_applied"),
        policy_decisions=body.get("policy_decisions"),
        deployment=body.get("deployment"),
        verification=body.get("verification"),
        status=status,
        environment=body.get("environment", ""),
        summary=body.get("summary", ""),
    )
    return evidence


@router.put("/{evidence_id}")
def update_evidence(evidence_id: str, body: dict):
    """Evidence is immutable. Updates are not allowed."""
    e = store.evidence.get(evidence_id)
    if not e:
        raise HTTPException(404, "Evidence not found")
    raise HTTPException(403, "Evidence records are immutable and cannot be modified")


@router.delete("/{evidence_id}")
def delete_evidence(evidence_id: str):
    """Evidence is immutable. Deletion is not allowed."""
    e = store.evidence.get(evidence_id)
    if not e:
        raise HTTPException(404, "Evidence not found")
    raise HTTPException(403, "Evidence records are immutable and cannot be deleted")
