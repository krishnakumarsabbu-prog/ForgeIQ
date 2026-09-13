from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.requirement import Requirement, RequirementStatus, RequirementPriority
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/requirements", tags=["requirements"])


class RequirementCreate(BaseModel):
    title: str
    description: str
    application_id: str
    priority: RequirementPriority = RequirementPriority.MEDIUM
    tags: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_requirements(tenant_id: str = "tenant_forgeiq"):
    return store.requirements.all(tenant_id)


@router.get("/{requirement_id}")
def get_requirement(requirement_id: str):
    r = store.requirements.get(requirement_id)
    if not r:
        raise HTTPException(404, "Requirement not found")
    return r


@router.post("")
def create_requirement(body: RequirementCreate):
    r = Requirement(
        tenant_id=body.tenant_id,
        id=gen_id("req_"),
        title=body.title,
        description=body.description,
        application_id=body.application_id,
        status=RequirementStatus.DRAFT,
        priority=body.priority,
        tags=body.tags,
        acceptance_criteria=body.acceptance_criteria,
        created_at=utc_now(),
    )
    store.requirements.add(r)
    app = store.applications.get(body.application_id)
    if app:
        app.requirement_ids.append(r.id)
    return r
