from __future__ import annotations

from typing import Optional, Any
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Query

from ...storage.in_memory import store
from ...runtime.evidence_engine import EvidenceEngine

router = APIRouter(prefix="/evidence", tags=["evidence"])

TENANT_ID = "tenant_forgeiq"


def _engine(tenant_id: str = TENANT_ID) -> EvidenceEngine:
    return EvidenceEngine(tenant_id)


class EvidenceCreate(BaseModel):
    execution_id: str
    evidence_type: str = "action"
    application_id: Optional[str] = None
    requirement_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    pipeline_version: Optional[str] = None
    harness_id: Optional[str] = None
    harness_version: Optional[str] = None
    graph_id: Optional[str] = None
    graph_version: Optional[str] = None
    loop_id: Optional[str] = None
    loop_iteration: Optional[int] = None
    node_id: Optional[str] = None
    agent_id: Optional[str] = None
    agent_version: Optional[str] = None
    model_used: Optional[str] = None
    model_provider: Optional[str] = None
    context_reference: Optional[str] = None
    tool_id: Optional[str] = None
    tool_operation: Optional[str] = None
    inputs: Optional[Any] = None
    outputs: Optional[Any] = None
    code_changes: Optional[Any] = None
    test_results: Optional[Any] = None
    security_results: Optional[Any] = None
    build_results: Optional[Any] = None
    release_results: Optional[Any] = None
    approvals: Optional[Any] = None
    policies_applied: Optional[Any] = None
    policy_decisions: Optional[Any] = None
    deployment: Optional[Any] = None
    verification: Optional[Any] = None
    status: str = "success"
    environment: str = ""
    summary: str = ""
    tenant_id: str = TENANT_ID


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
def get_evidence(evidence_id: str, tenant_id: str = TENANT_ID):
    e = store.evidence.get(evidence_id)
    if not e:
        raise HTTPException(404, "Evidence not found")
    if e.tenant_id != tenant_id:
        raise HTTPException(404, "Evidence not found")
    return e


@router.get("/execution/{execution_id}")
def get_execution_evidence(execution_id: str, tenant_id: str = TENANT_ID):
    engine = _engine(tenant_id)
    return engine.get_timeline(execution_id)


@router.get("/execution/{execution_id}/chain-verify")
def verify_evidence_chain(execution_id: str, tenant_id: str = TENANT_ID):
    return _engine(tenant_id).verify_chain(execution_id)


@router.get("/application/{application_id}")
def get_application_evidence(application_id: str, tenant_id: str = TENANT_ID):
    return [
        e for e in store.evidence.all(tenant_id) if e.application_id == application_id
    ]


@router.post("/")
def create_evidence(body: EvidenceCreate):
    """Create an evidence record. Once created, it cannot be modified or deleted."""
    from ...domain.models.evidence import EvidenceType, EvidenceStatus

    try:
        etype = EvidenceType(body.evidence_type)
    except ValueError:
        raise HTTPException(400, f"Invalid evidence_type: {body.evidence_type}")

    try:
        status = EvidenceStatus(body.status)
    except ValueError:
        raise HTTPException(400, f"Invalid status: {body.status}")

    engine = _engine(body.tenant_id)
    evidence = engine.create_evidence(
        execution_id=body.execution_id,
        evidence_type=etype,
        application_id=body.application_id,
        requirement_id=body.requirement_id,
        pipeline_id=body.pipeline_id,
        pipeline_version=body.pipeline_version,
        harness_id=body.harness_id,
        harness_version=body.harness_version,
        graph_id=body.graph_id,
        graph_version=body.graph_version,
        loop_id=body.loop_id,
        loop_iteration=body.loop_iteration,
        node_id=body.node_id,
        agent_id=body.agent_id,
        agent_version=body.agent_version,
        model_used=body.model_used,
        model_provider=body.model_provider,
        context_reference=body.context_reference,
        tool_id=body.tool_id,
        tool_operation=body.tool_operation,
        inputs=body.inputs,
        outputs=body.outputs,
        code_changes=body.code_changes,
        test_results=body.test_results,
        security_results=body.security_results,
        build_results=body.build_results,
        release_results=body.release_results,
        approvals=body.approvals,
        policies_applied=body.policies_applied,
        policy_decisions=body.policy_decisions,
        deployment=body.deployment,
        verification=body.verification,
        status=status,
        environment=body.environment,
        summary=body.summary,
    )
    return evidence


@router.put("/{evidence_id}")
def update_evidence(evidence_id: str):
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
