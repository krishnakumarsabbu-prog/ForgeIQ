from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.harness import Harness, HarnessVersion, HarnessType
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/harnesses", tags=["harnesses"])


class HarnessCreate(BaseModel):
    name: str
    display_name: str
    purpose: str = ""
    harness_type: HarnessType = HarnessType.DEVELOPMENT
    graph_id: Optional[str] = None
    loop_ids: list[str] = Field(default_factory=list)
    agent_ids: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    model_config_ids: list[str] = Field(default_factory=list)
    environment: str = "development"
    cost_limit_cents: int = 5000
    time_limit_seconds: int = 3600
    approval_required: bool = False
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_harnesses(tenant_id: str = "tenant_forgeiq"):
    return store.harnesses.all(tenant_id)


@router.get("/{harness_id}")
def get_harness(harness_id: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    return h


@router.post("")
def create_harness(body: HarnessCreate):
    h = Harness(
        tenant_id=body.tenant_id,
        id=gen_id("harness_"),
        name=body.name.lower().replace(" ", "-"),
        display_name=body.display_name,
        purpose=body.purpose,
        harness_type=body.harness_type,
        graph_id=body.graph_id,
        loop_ids=body.loop_ids,
        agent_ids=body.agent_ids,
        skill_ids=body.skill_ids,
        tool_ids=body.tool_ids,
        model_config_ids=body.model_config_ids,
        environment=body.environment,
        cost_limit_cents=body.cost_limit_cents,
        time_limit_seconds=body.time_limit_seconds,
        approval_required=body.approval_required,
        published=False,
        current_version="v1",
        created_at=utc_now(),
    )
    v1 = HarnessVersion(
        tenant_id=body.tenant_id,
        id=gen_id("hver_"),
        harness_id=h.id,
        version="v1",
        published=False,
        is_default=True,
        graph_id=body.graph_id,
        loop_ids=body.loop_ids,
        agent_ids=body.agent_ids,
        skill_ids=body.skill_ids,
        tool_ids=body.tool_ids,
        environment=body.environment,
        cost_limit_cents=body.cost_limit_cents,
        time_limit_seconds=body.time_limit_seconds,
        approval_required=body.approval_required,
        changelog="Initial version",
        created_at=utc_now(),
    )
    h.versions = [v1]
    store.harnesses.add(h)
    return h


@router.get("/{harness_id}/versions")
def get_harness_versions(harness_id: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    return h.versions


@router.post("/{harness_id}/versions")
def create_harness_version(harness_id: str, changelog: str = "New version"):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    version_num = len(h.versions) + 1
    latest = h.versions[-1] if h.versions else None
    new_version = HarnessVersion(
        tenant_id=h.tenant_id,
        id=gen_id("hver_"),
        harness_id=harness_id,
        version=f"v{version_num}",
        published=False,
        is_default=False,
        graph_id=latest.graph_id if latest else h.graph_id,
        loop_ids=latest.loop_ids if latest else h.loop_ids,
        agent_ids=latest.agent_ids if latest else h.agent_ids,
        skill_ids=latest.skill_ids if latest else h.skill_ids,
        tool_ids=latest.tool_ids if latest else h.tool_ids,
        environment=latest.environment if latest else h.environment,
        cost_limit_cents=latest.cost_limit_cents if latest else h.cost_limit_cents,
        time_limit_seconds=latest.time_limit_seconds if latest else h.time_limit_seconds,
        approval_required=latest.approval_required if latest else h.approval_required,
        changelog=changelog,
        created_at=utc_now(),
    )
    h.versions.append(new_version)
    return new_version


@router.post("/{harness_id}/publish/{version}")
def publish_harness_version(harness_id: str, version: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    for v in h.versions:
        if v.version == version:
            v.published = True
            v.is_default = True
            h.current_version = version
            h.published = True
        else:
            v.is_default = False
    return h


@router.get("/templates/all")
def list_harness_templates(tenant_id: str = "tenant_forgeiq"):
    return store.harness_templates.all(tenant_id)
