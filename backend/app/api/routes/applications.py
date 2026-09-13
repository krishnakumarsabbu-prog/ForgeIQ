from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.application import Application, ApplicationType, ApplicationStatus, Repository
from ...domain.models.base import gen_id, utc_now
from ...services.engineering_planner import get_planner

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplicationCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    type: ApplicationType = ApplicationType.GREENFIELD
    technologies: list[str] = Field(default_factory=list)
    team: str = "Platform Engineering"
    risk_level: str = "MEDIUM"
    tenant_id: str = "tenant_forgeiq"


class PlanCreateRequest(BaseModel):
    requirement_text: str
    tenant_id: str = "tenant_forgeiq"


class PlanApproveRequest(BaseModel):
    decided_by: str = "Engineering Lead"
    reason: str = ""


class PlanRejectRequest(BaseModel):
    decided_by: str = "Engineering Lead"
    reason: str = ""


class PlanStageModifyRequest(BaseModel):
    harness_id: str | None = None
    approval_required: bool | None = None
    environment: str | None = None
    description: str | None = None


@router.get("")
def list_applications(tenant_id: str = "tenant_forgeiq"):
    return store.applications.all(tenant_id)


@router.get("/{app_id}")
def get_application(app_id: str):
    app = store.applications.get(app_id)
    if not app:
        raise HTTPException(404, "Application not found")
    return app


@router.post("")
def create_application(body: ApplicationCreate):
    app = Application(
        tenant_id=body.tenant_id,
        id=gen_id("app_"),
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        type=body.type,
        status=ApplicationStatus.ACTIVE,
        technologies=body.technologies,
        team=body.team,
        risk_level=body.risk_level,
        created_at=utc_now(),
    )
    store.applications.add(app)
    return app


@router.get("/{app_id}/requirements")
def get_application_requirements(app_id: str):
    return [r for r in store.requirements.all() if r.application_id == app_id]


@router.get("/{app_id}/engineering-state")
def get_application_engineering_state(app_id: str):
    for es in store.engineering_states.all():
        if es.application_id == app_id:
            return es
    raise HTTPException(404, "Engineering state not found")


@router.get("/{app_id}/pipelines")
def get_application_pipelines(app_id: str):
    return [p for p in store.pipelines.all() if p.application_id == app_id]


@router.get("/{app_id}/executions")
def get_application_executions(app_id: str):
    return [e for e in store.executions.all() if e.application_id == app_id]


@router.get("/{app_id}/evidence")
def get_application_evidence(app_id: str):
    exec_ids = [e.id for e in store.executions.all() if e.application_id == app_id]
    return [ev for ev in store.evidence.all() if ev.execution_id in exec_ids]


@router.get("/{app_id}/deployments")
def get_application_deployments(app_id: str):
    return [d for d in store.deployments.all() if d.application_id == app_id]


# ─── Engineering Plan endpoints ──────────────────────────────────────

@router.post("/engineering-plan")
def create_engineering_plan(body: PlanCreateRequest):
    planner = get_planner(body.tenant_id)
    plan = planner.create_plan(body.requirement_text, body.tenant_id)
    store.engineering_plans.add(plan)
    return plan


@router.get("/engineering-plan/{plan_id}")
def get_engineering_plan(plan_id: str):
    plan = store.engineering_plans.get(plan_id)
    if not plan:
        raise HTTPException(404, "Engineering plan not found")
    return plan


@router.get("/engineering-plan/{plan_id}/stages/{stage_id}")
def get_plan_stage(plan_id: str, stage_id: str):
    plan = store.engineering_plans.get(plan_id)
    if not plan:
        raise HTTPException(404, "Engineering plan not found")
    for stage in plan.stages:
        if stage.id == stage_id:
            return stage
    raise HTTPException(404, "Stage not found")


@router.put("/engineering-plan/{plan_id}/stages/{stage_id}")
def modify_plan_stage(plan_id: str, stage_id: str, body: PlanStageModifyRequest):
    plan = store.engineering_plans.get(plan_id)
    if not plan:
        raise HTTPException(404, "Engineering plan not found")
    if plan.status != "draft":
        raise HTTPException(400, "Plan is no longer editable")
    planner = get_planner(plan.tenant_id)
    modifications = {k: v for k, v in body.model_dump().items() if v is not None}
    plan = planner.modify_stage(plan, stage_id, modifications)
    return plan


@router.post("/engineering-plan/{plan_id}/approve")
def approve_engineering_plan(plan_id: str, body: PlanApproveRequest):
    plan = store.engineering_plans.get(plan_id)
    if not plan:
        raise HTTPException(404, "Engineering plan not found")
    if plan.status != "draft":
        raise HTTPException(400, f"Plan is already {plan.status}")
    planner = get_planner(plan.tenant_id)
    plan = planner.approve_plan(plan, body.decided_by, body.reason)
    return plan


@router.post("/engineering-plan/{plan_id}/reject")
def reject_engineering_plan(plan_id: str, body: PlanRejectRequest):
    plan = store.engineering_plans.get(plan_id)
    if not plan:
        raise HTTPException(404, "Engineering plan not found")
    if plan.status != "draft":
        raise HTTPException(400, f"Plan is already {plan.status}")
    planner = get_planner(plan.tenant_id)
    plan = planner.reject_plan(plan, body.decided_by, body.reason)
    return plan


@router.post("/engineering-plan/{plan_id}/execute")
def execute_engineering_plan(plan_id: str):
    plan = store.engineering_plans.get(plan_id)
    if not plan:
        raise HTTPException(404, "Engineering plan not found")
    if plan.status != "approved":
        raise HTTPException(400, "Plan must be approved before execution")

    from ...domain.models.execution import Execution, ExecutionEvent, EventType
    from ...runtime.pipeline_runtime import PipelineRuntime
    import asyncio

    pipeline_id = plan.recommended_pipeline.get("pipeline_id")
    if not pipeline_id:
        first_harness = None
        for stage in plan.stages:
            if stage.harness_id:
                first_harness = stage.harness_id
                break

        execution = Execution(
            tenant_id=plan.tenant_id,
            id=gen_id("exec_"),
            application_id=plan.application_id,
            requirement_id=plan.requirement_id,
            harness_id=first_harness,
            status="PENDING",
            trigger="greenfield_engineering",
            trigger_reason=f"Greenfield engineering: {plan.application_name}",
            created_at=utc_now(),
        )
        store.executions.add(execution)

        start_evt = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution.id,
            event_type=EventType.EXECUTION_STARTED,
            message=f"Greenfield engineering execution started for '{plan.application_name}'",
        )
        store.events.append(start_evt)
        execution.events.append(start_evt)

        plan.execution_id = execution.id
        plan.status = "executing"
        return {"execution_id": execution.id, "plan_id": plan.id, "status": "started"}

    execution = Execution(
        tenant_id=plan.tenant_id,
        id=gen_id("exec_"),
        pipeline_id=pipeline_id,
        application_id=plan.application_id,
        requirement_id=plan.requirement_id,
        status="PENDING",
        trigger="greenfield_engineering",
        trigger_reason=f"Greenfield engineering: {plan.application_name}",
        created_at=utc_now(),
    )
    store.executions.add(execution)

    start_evt = ExecutionEvent(
        id=gen_id("evt_"),
        execution_id=execution.id,
        event_type=EventType.EXECUTION_STARTED,
        message=f"Greenfield engineering execution started for '{plan.application_name}'",
    )
    store.events.append(start_evt)
    execution.events.append(start_evt)

    asyncio.create_task(PipelineRuntime(plan.tenant_id).execute(
        pipeline_id=pipeline_id,
        execution_id=execution.id,
        application_id=plan.application_id,
        requirement_id=plan.requirement_id,
    ))

    plan.execution_id = execution.id
    plan.status = "executing"
    return {"execution_id": execution.id, "plan_id": plan.id, "status": "started"}
