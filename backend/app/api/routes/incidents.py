from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.base import gen_id, utc_now
from ...domain.models.incident import (
    Incident, IncidentStatus, IncidentSeverity, IncidentSource,
    Symptom, RootCauseFinding, RemediationPlan, RemediationStep,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])


class CreateIncidentRequest(BaseModel):
    title: str
    description: str = ""
    severity: str = IncidentSeverity.HIGH.value
    source: str = IncidentSource.OBSERVABILITY.value
    application_id: str
    environment_id: str = ""
    component: str = ""
    symptoms: list[dict] = Field(default_factory=list)
    assigned_to: str = ""
    max_retries: int = 3


class AddSymptomRequest(BaseModel):
    name: str
    severity: str = "HIGH"
    component: str = ""
    metric: str = ""
    threshold: str = ""
    observed_value: str = ""
    message: str = ""


class AnalyzeRequest(BaseModel):
    execution_id: str = ""


class GeneratePlanRequest(BaseModel):
    execution_id: str = ""


class ExecuteRemediationRequest(BaseModel):
    execution_id: str = ""
    auto_deploy: bool = True
    auto_verify: bool = True
    auto_rollback_on_failure: bool = True


class RollbackFixRequest(BaseModel):
    execution_id: str = ""
    reason: str = ""


class VerifyFixRequest(BaseModel):
    execution_id: str = ""


class CloseIncidentRequest(BaseModel):
    closed_by: str = ""
    reason: str = ""


class ApproveRemediationRequest(BaseModel):
    approved_by: str = ""
    reason: str = ""


@router.get("")
def list_incidents(
    tenant_id: str = "tenant_forgeiq",
    status: Optional[str] = None,
    severity: Optional[str] = None,
    application_id: Optional[str] = None,
):
    items = store.incidents.all(tenant_id)
    if status:
        items = [i for i in items if i.status == status]
    if severity:
        items = [i for i in items if i.severity == severity]
    if application_id:
        items = [i for i in items if i.application_id == application_id]
    return sorted(items, key=lambda x: x.detected_at, reverse=True)


@router.get("/{incident_id}")
def get_incident(incident_id: str):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    return inc


@router.post("")
def create_incident(body: CreateIncidentRequest, tenant_id: str = "tenant_forgeiq"):
    app = store.applications.get(body.application_id)
    if not app:
        raise HTTPException(404, "Application not found")

    try:
        sev = IncidentSeverity(body.severity)
    except ValueError:
        raise HTTPException(400, f"Invalid severity: {body.severity}")
    try:
        src = IncidentSource(body.source)
    except ValueError:
        raise HTTPException(400, f"Invalid source: {body.source}")

    symptoms = [Symptom(**s) for s in body.symptoms]

    incident = Incident(
        tenant_id=tenant_id,
        id=gen_id("inc_"),
        title=body.title,
        description=body.description,
        severity=sev.value,
        source=src.value,
        application_id=body.application_id,
        environment_id=body.environment_id,
        component=body.component,
        symptoms=symptoms,
        assigned_to=body.assigned_to,
        max_retries=body.max_retries,
        created_at=utc_now().isoformat(),
    )

    incident.timeline.append({
        "event": "created",
        "message": f"Incident created: {body.title}",
        "actor": "system",
    })

    store.incidents.add(incident)
    return incident


@router.post("/{incident_id}/symptoms")
def add_symptom(incident_id: str, body: AddSymptomRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    symptom = Symptom(
        name=body.name,
        severity=body.severity,
        component=body.component,
        metric=body.metric,
        threshold=body.threshold,
        observed_value=body.observed_value,
        message=body.message,
    )
    inc.symptoms.append(symptom)
    inc.touch()
    return inc


@router.post("/{incident_id}/analyze")
async def analyze_incident(incident_id: str, body: AnalyzeRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    from ...runtime.incident_runtime import IncidentRuntime
    runtime = IncidentRuntime(inc.tenant_id)
    result = await runtime.analyze_incident(incident_id, body.execution_id)
    return result


@router.post("/{incident_id}/remediation-plan")
async def generate_remediation_plan(incident_id: str, body: GeneratePlanRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    from ...runtime.incident_runtime import IncidentRuntime
    runtime = IncidentRuntime(inc.tenant_id)
    result = await runtime.generate_remediation_plan(incident_id, body.execution_id)
    return result


@router.post("/{incident_id}/execute-remediation")
async def execute_remediation(incident_id: str, body: ExecuteRemediationRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    from ...runtime.incident_runtime import IncidentRuntime
    runtime = IncidentRuntime(inc.tenant_id)
    result = await runtime.execute_remediation(
        incident_id,
        body.execution_id,
        body.auto_deploy,
        body.auto_verify,
        body.auto_rollback_on_failure,
    )
    return result


@router.post("/{incident_id}/approve")
def approve_remediation(incident_id: str, body: ApproveRemediationRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    if inc.status != IncidentStatus.AWAITING_APPROVAL.value:
        raise HTTPException(400, f"Incident is not awaiting approval (current: {inc.status})")
    inc.status = IncidentStatus.REMEDIATION_IN_PROGRESS.value
    inc.timeline.append({
        "event": "approved",
        "message": f"Remediation approved by {body.approved_by}: {body.reason}",
        "actor": body.approved_by or "operator",
    })
    inc.touch()
    return {"status": "approved", "incident_id": incident_id}


@router.post("/{incident_id}/rollback")
async def rollback_fix(incident_id: str, body: RollbackFixRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    from ...runtime.incident_runtime import IncidentRuntime
    runtime = IncidentRuntime(inc.tenant_id)
    result = await runtime.rollback_fix(incident_id, body.execution_id, body.reason)
    return result


@router.post("/{incident_id}/verify")
async def verify_fix(incident_id: str, body: VerifyFixRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    from ...runtime.incident_runtime import IncidentRuntime
    runtime = IncidentRuntime(inc.tenant_id)
    result = await runtime.verify_fix(incident_id, body.execution_id)
    return result


@router.post("/{incident_id}/close")
def close_incident(incident_id: str, body: CloseIncidentRequest):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    from ...runtime.incident_runtime import IncidentRuntime
    runtime = IncidentRuntime(inc.tenant_id)
    result = runtime.close_incident(incident_id, body.closed_by, body.reason)
    return result


@router.get("/{incident_id}/evidence")
def get_incident_evidence(incident_id: str):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    evidence_list = []
    for eid in inc.evidence_ids:
        ev = store.evidence.get(eid)
        if ev:
            evidence_list.append(ev)
    return evidence_list


@router.get("/{incident_id}/timeline")
def get_incident_timeline(incident_id: str):
    inc = store.incidents.get(incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    return inc.timeline


@router.get("/severities/list")
def list_severities():
    return [{"value": s.value, "label": s.value} for s in IncidentSeverity]


@router.get("/statuses/list")
def list_statuses():
    return [{"value": s.value, "label": s.value.replace("_", " ").title()} for s in IncidentStatus]


@router.get("/sources/list")
def list_sources():
    return [{"value": s.value, "label": s.value.replace("_", " ").title()} for s in IncidentSource]
