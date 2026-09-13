from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.harness import Harness, HarnessVersion, HarnessType, HarnessLifecycle
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


class CloneBody(BaseModel):
    display_name: Optional[str] = None


class VersionBody(BaseModel):
    changelog: str = "New version"


class HarnessUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    purpose: Optional[str] = None
    harness_type: Optional[HarnessType] = None
    graph_id: Optional[str] = None
    loop_ids: Optional[list[str]] = None
    agent_ids: Optional[list[str]] = None
    skill_ids: Optional[list[str]] = None
    tool_ids: Optional[list[str]] = None
    model_config_ids: Optional[list[str]] = None
    policy_ids: Optional[list[str]] = None
    permissions: Optional[list[str]] = None
    environment: Optional[str] = None
    execution_rules: Optional[dict] = None
    retry_rules: Optional[dict] = None
    failure_rules: Optional[dict] = None
    approval_rules: Optional[dict] = None
    escalation_rules: Optional[dict] = None
    cost_limit_cents: Optional[int] = None
    time_limit_seconds: Optional[int] = None
    approval_required: Optional[bool] = None
    evidence_requirements: Optional[list[str]] = None
    inputs: Optional[list[str]] = None
    outputs: Optional[list[str]] = None
    context: Optional[dict] = None
    tags: Optional[list[str]] = None


@router.get("")
def list_harnesses(tenant_id: str = "tenant_forgeiq", harness_type: Optional[str] = None):
    items = store.harnesses.all(tenant_id)
    if harness_type:
        items = [h for h in items if h.harness_type.value == harness_type]
    return items


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
        lifecycle=HarnessLifecycle.DRAFT,
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
        model_config_ids=body.model_config_ids,
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


@router.put("/{harness_id}")
def update_harness(harness_id: str, body: HarnessUpdate):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    fields = [
        "name", "display_name", "purpose", "harness_type", "graph_id",
        "loop_ids", "agent_ids", "skill_ids", "tool_ids", "model_config_ids",
        "policy_ids", "permissions", "environment", "execution_rules",
        "retry_rules", "failure_rules", "approval_rules", "escalation_rules",
        "cost_limit_cents", "time_limit_seconds", "approval_required",
        "evidence_requirements", "inputs", "outputs", "context", "tags",
    ]
    for f in fields:
        val = getattr(body, f, None)
        if val is not None:
            setattr(h, f, val)
    h.touch()
    return h


@router.post("/{harness_id}/publish/{version}")
def publish_harness_version(harness_id: str, version: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")

    # Validate graph before publish
    if h.graph_id:
        from ...domain.models.graph import GraphNodeType
        g = store.graphs.get(h.graph_id)
        if g:
            errors = []
            node_ids = {n.id for n in g.nodes}
            for e in g.edges:
                if e.source_node_id not in node_ids or e.target_node_id not in node_ids:
                    errors.append("Invalid edge references")
                    break
            for n in g.nodes:
                if n.node_type in (GraphNodeType.AGENT, GraphNodeType.TOOL, GraphNodeType.SKILL) and not n.ref_id:
                    errors.append(f"Node '{n.label}' missing {n.node_type.value} reference")
            if errors:
                raise HTTPException(400, f"Graph validation failed: {'; '.join(errors)}")

    for v in h.versions:
        if v.version == version:
            v.published = True
            v.is_default = True
            v.deprecated = False
            h.current_version = version
            h.published = True
            h.lifecycle = HarnessLifecycle.PUBLISHED
            h.last_published_at = utc_now()
        else:
            v.is_default = False
    return h
def clone_harness(harness_id: str, body: CloneBody):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    new_name = body.display_name or f"{h.display_name} (Clone)"
    new_h = Harness(
        tenant_id=h.tenant_id,
        id=gen_id("harness_"),
        name=new_name.lower().replace(" ", "-"),
        display_name=new_name,
        purpose=h.purpose,
        harness_type=h.harness_type,
        inputs=list(h.inputs),
        outputs=list(h.outputs),
        context=dict(h.context),
        graph_id=h.graph_id,
        loop_ids=list(h.loop_ids),
        agent_ids=list(h.agent_ids),
        skill_ids=list(h.skill_ids),
        tool_ids=list(h.tool_ids),
        model_config_ids=list(h.model_config_ids),
        policy_ids=list(h.policy_ids),
        permissions=list(h.permissions),
        environment=h.environment,
        execution_rules=dict(h.execution_rules),
        retry_rules=dict(h.retry_rules),
        failure_rules=dict(h.failure_rules),
        approval_rules=dict(h.approval_rules),
        escalation_rules=dict(h.escalation_rules),
        cost_limit_cents=h.cost_limit_cents,
        time_limit_seconds=h.time_limit_seconds,
        approval_required=h.approval_required,
        evidence_requirements=list(h.evidence_requirements),
        current_version="v1",
        template_id=h.template_id,
        published=False,
        lifecycle=HarnessLifecycle.DRAFT,
        tags=list(h.tags),
        created_at=utc_now(),
    )
    v1 = HarnessVersion(
        tenant_id=h.tenant_id,
        id=gen_id("hver_"),
        harness_id=new_h.id,
        version="v1",
        published=False,
        is_default=True,
        graph_id=h.graph_id,
        loop_ids=list(h.loop_ids),
        agent_ids=list(h.agent_ids),
        skill_ids=list(h.skill_ids),
        tool_ids=list(h.tool_ids),
        model_config_ids=list(h.model_config_ids),
        environment=h.environment,
        cost_limit_cents=h.cost_limit_cents,
        time_limit_seconds=h.time_limit_seconds,
        approval_required=h.approval_required,
        changelog="Cloned from " + h.display_name,
        created_at=utc_now(),
    )
    new_h.versions = [v1]
    store.harnesses.add(new_h)
    return new_h


@router.post("/{harness_id}/archive")
def archive_harness(harness_id: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    h.archived = True
    h.lifecycle = HarnessLifecycle.ARCHIVED
    h.touch()
    return h


@router.get("/{harness_id}/versions")
def get_harness_versions(harness_id: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    return h.versions


@router.post("/{harness_id}/versions")
def create_harness_version(harness_id: str, body: VersionBody):
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
        deprecated=False,
        graph_id=latest.graph_id if latest else h.graph_id,
        loop_ids=latest.loop_ids if latest else h.loop_ids,
        agent_ids=latest.agent_ids if latest else h.agent_ids,
        skill_ids=latest.skill_ids if latest else h.skill_ids,
        tool_ids=latest.tool_ids if latest else h.tool_ids,
        model_config_ids=latest.model_config_ids if latest else h.model_config_ids,
        environment=latest.environment if latest else h.environment,
        cost_limit_cents=latest.cost_limit_cents if latest else h.cost_limit_cents,
        time_limit_seconds=latest.time_limit_seconds if latest else h.time_limit_seconds,
        approval_required=latest.approval_required if latest else h.approval_required,
        changelog=body.changelog,
        created_at=utc_now(),
    )
    h.versions.append(new_version)
    return new_version


@router.get("/{harness_id}/compare/{va}/{vb}")
def compare_harness_versions(harness_id: str, va: str, vb: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    v_a = next((v for v in h.versions if v.version == va), None)
    v_b = next((v for v in h.versions if v.version == vb), None)
    if not v_a or not v_b:
        raise HTTPException(404, "Version not found")
    fields = [
        "graph_id", "loop_ids", "agent_ids", "skill_ids", "tool_ids",
        "model_config_ids", "environment", "cost_limit_cents",
        "time_limit_seconds", "approval_required", "changelog",
    ]
    differences = {}
    for f in fields:
        va_val = getattr(v_a, f, None)
        vb_val = getattr(v_b, f, None)
        differences[f] = va_val != vb_val
    return {
        "version_a": v_a,
        "version_b": v_b,
        "differences": differences,
    }


@router.get("/templates/all")
def list_harness_templates(tenant_id: str = "tenant_forgeiq"):
    return store.harness_templates.all(tenant_id)
