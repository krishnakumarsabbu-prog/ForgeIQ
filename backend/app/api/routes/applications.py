from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.application import Application, ApplicationType, ApplicationStatus, Repository
from ...domain.models.base import gen_id, utc_now

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
