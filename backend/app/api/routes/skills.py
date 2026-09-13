from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.skill import Skill, SkillCategory
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/skills", tags=["skills"])


class SkillCreate(BaseModel):
    name: str
    display_name: str
    category: SkillCategory = SkillCategory.ENGINEERING
    description: str = ""
    language: str = ""
    framework: str = ""
    capabilities: list[str] = Field(default_factory=list)
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_skills(tenant_id: str = "tenant_forgeiq"):
    return store.skills.all(tenant_id)


@router.get("/{skill_id}")
def get_skill(skill_id: str):
    s = store.skills.get(skill_id)
    if not s:
        raise HTTPException(404, "Skill not found")
    return s


@router.post("")
def create_skill(body: SkillCreate):
    s = Skill(
        tenant_id=body.tenant_id,
        id=gen_id("skill_"),
        name=body.name.lower().replace(" ", "-"),
        display_name=body.display_name,
        category=body.category,
        description=body.description,
        language=body.language,
        framework=body.framework,
        capabilities=body.capabilities,
        created_at=utc_now(),
    )
    store.skills.add(s)
    return s
