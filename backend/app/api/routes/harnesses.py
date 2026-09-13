from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any

from ...storage.in_memory import store
from ...domain.models.harness import (
    Harness, HarnessVersion, HarnessType, HarnessLifecycle,
    HarnessTemplate, HarnessTemplateVersion, TemplateInheritanceLevel,
)
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
    template_id: Optional[str] = None


class CloneBody(BaseModel):
    display_name: Optional[str] = None


class VersionBody(BaseModel):
    changelog: str = "New version"
    graph_id: Optional[str] = None
    loop_ids: Optional[list[str]] = None
    agent_ids: Optional[list[str]] = None
    skill_ids: Optional[list[str]] = None
    tool_ids: Optional[list[str]] = None
    model_config_ids: Optional[list[str]] = None
    policy_ids: Optional[list[str]] = None
    environment: Optional[str] = None
    cost_limit_cents: Optional[int] = None
    time_limit_seconds: Optional[int] = None
    approval_required: Optional[bool] = None


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


# --- Template models ---

class TemplateCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    harness_type: HarnessType = HarnessType.CUSTOM
    inheritance_level: TemplateInheritanceLevel = TemplateInheritanceLevel.PLATFORM
    parent_template_id: Optional[str] = None
    mandatory_steps: list[str] = Field(default_factory=list)
    optional_steps: list[str] = Field(default_factory=list)
    configurable: list[str] = Field(default_factory=list)
    tenant_override_allowed: bool = True
    tenant_override_forbidden: list[str] = Field(default_factory=list)
    default_config: dict = Field(default_factory=dict)
    tenant_id: str = "tenant_forgeiq"


class TemplateUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    harness_type: Optional[HarnessType] = None
    mandatory_steps: Optional[list[str]] = None
    optional_steps: Optional[list[str]] = None
    configurable: Optional[list[str]] = None
    tenant_override_allowed: Optional[bool] = None
    tenant_override_forbidden: Optional[list[str]] = None
    default_config: Optional[dict] = None


class TemplateVersionBody(BaseModel):
    changelog: str = "New template version"
    mandatory_steps: Optional[list[str]] = None
    optional_steps: Optional[list[str]] = None
    configurable: Optional[list[str]] = None
    tenant_override_allowed: Optional[bool] = None
    tenant_override_forbidden: Optional[list[str]] = None
    default_config: Optional[dict] = None


class InstantiateTemplateBody(BaseModel):
    display_name: str
    tenant_id: str = "tenant_forgeiq"
    overrides: dict = Field(default_factory=dict)


# --- Harness CRUD ---

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
        template_id=body.template_id,
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
    if h.lifecycle == HarnessLifecycle.PUBLISHED:
        raise HTTPException(400, "Published harness is immutable. Create a new version instead.")
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

    target_v = None
    for v in h.versions:
        if v.version == version:
            target_v = v
            break
    if not target_v:
        raise HTTPException(404, "Version not found")

    if target_v.is_immutable:
        raise HTTPException(400, "Version is already published and immutable")

    target_v.published = True
    target_v.is_immutable = True
    target_v.is_default = True
    target_v.deprecated = False
    target_v.published_at = utc_now()
    h.current_version = version
    h.published = True
    h.lifecycle = HarnessLifecycle.PUBLISHED
    h.last_published_at = utc_now()
    for v in h.versions:
        if v.version != version:
            v.is_default = False
    return h


@router.post("/{harness_id}/clone")
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
        template_version=h.template_version,
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
        policy_ids=list(h.policy_ids),
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
        is_immutable=False,
        graph_id=body.graph_id or (latest.graph_id if latest else h.graph_id),
        loop_ids=body.loop_ids or (latest.loop_ids if latest else h.loop_ids),
        agent_ids=body.agent_ids or (latest.agent_ids if latest else h.agent_ids),
        skill_ids=body.skill_ids or (latest.skill_ids if latest else h.skill_ids),
        tool_ids=body.tool_ids or (latest.tool_ids if latest else h.tool_ids),
        model_config_ids=body.model_config_ids or (latest.model_config_ids if latest else h.model_config_ids),
        policy_ids=body.policy_ids or (latest.policy_ids if latest else h.policy_ids),
        environment=body.environment or (latest.environment if latest else h.environment),
        cost_limit_cents=body.cost_limit_cents or (latest.cost_limit_cents if latest else h.cost_limit_cents),
        time_limit_seconds=body.time_limit_seconds or (latest.time_limit_seconds if latest else h.time_limit_seconds),
        approval_required=body.approval_required if body.approval_required is not None else (latest.approval_required if latest else h.approval_required),
        changelog=body.changelog,
        created_at=utc_now(),
    )
    h.versions.append(new_version)
    return new_version


@router.post("/{harness_id}/rollback/{version}")
def rollback_harness_version(harness_id: str, version: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    target = next((v for v in h.versions if v.version == version), None)
    if not target:
        raise HTTPException(404, "Version not found")
    if not target.published:
        raise HTTPException(400, "Cannot rollback to an unpublished version")
    for v in h.versions:
        v.is_default = v.version == version
    h.current_version = version
    h.touch()
    return h


@router.post("/{harness_id}/deprecate/{version}")
def deprecate_harness_version(harness_id: str, version: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    target = next((v for v in h.versions if v.version == version), None)
    if not target:
        raise HTTPException(404, "Version not found")
    target.deprecated = True
    target.is_default = False
    h.touch()
    return h


@router.get("/{harness_id}/compare/{va}/{vb}")
def compare_harness_versions(harness_id: str, va: str, vb: str):
    h = store.harnesses.get(harness_id)
    if not h:
        raise HTTPException(404, "Harness not found")
    v_a = next((v for v in h.versions if v.version == va), None)
    v_b = next((v for v in h.versions if v.version == vb), None)
    if not v_a or not v_b:
        raise HTTPException(404, "Version not found")

    def _resolve_agent_names(ids: list[str]) -> list[dict]:
        result = []
        for aid in ids:
            a = store.agents.get(aid)
            result.append({"id": aid, "name": a.display_name if a else aid})
        return result

    def _resolve_tool_names(ids: list[str]) -> list[dict]:
        result = []
        for tid in ids:
            t = store.tools.get(tid)
            result.append({"id": tid, "name": t.display_name if t else tid})
        return result

    def _resolve_skill_names(ids: list[str]) -> list[dict]:
        result = []
        for sid in ids:
            s = store.skills.get(sid)
            result.append({"id": sid, "name": s.display_name if s else sid})
        return result

    def _resolve_loop_names(ids: list[str]) -> list[dict]:
        result = []
        for lid in ids:
            l = store.loops.get(lid)
            result.append({"id": lid, "name": l.display_name if l else lid})
        return result

    def _resolve_policy_names(ids: list[str]) -> list[dict]:
        result = []
        for pid in ids:
            p = store.policies.get(pid)
            result.append({"id": pid, "name": p.display_name if p else pid})
        return result

    def _resolve_model_names(ids: list[str]) -> list[dict]:
        result = []
        for mid in ids:
            m = store.models.get(mid)
            result.append({"id": mid, "name": m.display_name if m else mid})
        return result

    def _resolve_graph_name(gid: Optional[str]) -> Optional[dict]:
        if not gid:
            return None
        g = store.graphs.get(gid)
        return {"id": gid, "name": g.display_name if g else gid}

    fields = [
        "graph_id", "loop_ids", "agent_ids", "skill_ids", "tool_ids",
        "model_config_ids", "policy_ids", "environment", "cost_limit_cents",
        "time_limit_seconds", "approval_required", "changelog",
        "graph_version", "loop_versions", "agent_contract_versions", "policy_versions",
    ]
    differences: dict[str, bool] = {}
    detailed_diff: dict[str, dict] = {}
    for f in fields:
        va_val = getattr(v_a, f, None)
        vb_val = getattr(v_b, f, None)
        is_diff = va_val != vb_val
        differences[f] = is_diff
        if is_diff:
            detailed_diff[f] = {"version_a": va_val, "version_b": vb_val}

    return {
        "version_a": v_a,
        "version_b": v_b,
        "differences": differences,
        "detailed_diff": detailed_diff,
        "resolved": {
            "version_a": {
                "graph": _resolve_graph_name(v_a.graph_id),
                "agents": _resolve_agent_names(v_a.agent_ids),
                "tools": _resolve_tool_names(v_a.tool_ids),
                "skills": _resolve_skill_names(v_a.skill_ids),
                "loops": _resolve_loop_names(v_a.loop_ids),
                "policies": _resolve_policy_names(v_a.policy_ids),
                "models": _resolve_model_names(v_a.model_config_ids),
            },
            "version_b": {
                "graph": _resolve_graph_name(v_b.graph_id),
                "agents": _resolve_agent_names(v_b.agent_ids),
                "tools": _resolve_tool_names(v_b.tool_ids),
                "skills": _resolve_skill_names(v_b.skill_ids),
                "loops": _resolve_loop_names(v_b.loop_ids),
                "policies": _resolve_policy_names(v_b.policy_ids),
                "models": _resolve_model_names(v_b.model_config_ids),
            },
        },
    }


# --- Harness Templates ---

@router.get("/templates/all")
def list_harness_templates(tenant_id: str = "tenant_forgeiq"):
    return store.harness_templates.all(tenant_id)


@router.get("/templates/{template_id}")
def get_harness_template(template_id: str):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    return t


@router.post("/templates")
def create_harness_template(body: TemplateCreate):
    t = HarnessTemplate(
        tenant_id=body.tenant_id,
        id=gen_id("htmpl_"),
        name=body.name.lower().replace(" ", "-"),
        display_name=body.display_name,
        description=body.description,
        harness_type=body.harness_type,
        inheritance_level=body.inheritance_level,
        parent_template_id=body.parent_template_id,
        mandatory_steps=body.mandatory_steps,
        optional_steps=body.optional_steps,
        configurable=body.configurable,
        tenant_override_allowed=body.tenant_override_allowed,
        tenant_override_forbidden=body.tenant_override_forbidden,
        default_config=body.default_config,
        current_version="v1",
        published=False,
        created_at=utc_now(),
    )
    v1 = HarnessTemplateVersion(
        tenant_id=body.tenant_id,
        id=gen_id("htver_"),
        template_id=t.id,
        version="v1",
        published=False,
        is_default=True,
        mandatory_steps=list(body.mandatory_steps),
        optional_steps=list(body.optional_steps),
        configurable=list(body.configurable),
        tenant_override_allowed=body.tenant_override_allowed,
        tenant_override_forbidden=list(body.tenant_override_forbidden),
        default_config=dict(body.default_config),
        changelog="Initial version",
        created_at=utc_now(),
    )
    t.versions = [v1]
    store.harness_templates.add(t)
    return t


@router.put("/templates/{template_id}")
def update_harness_template(template_id: str, body: TemplateUpdate):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    if t.published:
        raise HTTPException(400, "Published template is immutable. Create a new version instead.")
    fields = [
        "display_name", "description", "harness_type",
        "mandatory_steps", "optional_steps", "configurable",
        "tenant_override_allowed", "tenant_override_forbidden", "default_config",
    ]
    for f in fields:
        val = getattr(body, f, None)
        if val is not None:
            setattr(t, f, val)
    t.touch()
    return t


@router.post("/templates/{template_id}/publish/{version}")
def publish_template_version(template_id: str, version: str):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    target = next((v for v in t.versions if v.version == version), None)
    if not target:
        raise HTTPException(404, "Template version not found")
    target.published = True
    target.is_immutable = True
    target.is_default = True
    t.published = True
    t.current_version = version
    t.last_published_at = utc_now()
    for v in t.versions:
        if v.version != version:
            v.is_default = False
    return t


@router.get("/templates/{template_id}/versions")
def get_template_versions(template_id: str):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    return t.versions


@router.post("/templates/{template_id}/versions")
def create_template_version(template_id: str, body: TemplateVersionBody):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    version_num = len(t.versions) + 1
    latest = t.versions[-1] if t.versions else None
    new_v = HarnessTemplateVersion(
        tenant_id=t.tenant_id,
        id=gen_id("htver_"),
        template_id=template_id,
        version=f"v{version_num}",
        published=False,
        is_default=False,
        is_immutable=False,
        mandatory_steps=body.mandatory_steps or (latest.mandatory_steps if latest else t.mandatory_steps),
        optional_steps=body.optional_steps or (latest.optional_steps if latest else t.optional_steps),
        configurable=body.configurable or (latest.configurable if latest else t.configurable),
        tenant_override_allowed=body.tenant_override_allowed if body.tenant_override_allowed is not None else (latest.tenant_override_allowed if latest else t.tenant_override_allowed),
        tenant_override_forbidden=body.tenant_override_forbidden or (latest.tenant_override_forbidden if latest else t.tenant_override_forbidden),
        default_config=body.default_config or (latest.default_config if latest else t.default_config),
        changelog=body.changelog,
        created_at=utc_now(),
    )
    t.versions.append(new_v)
    return new_v


@router.get("/templates/{template_id}/compare/{va}/{vb}")
def compare_template_versions(template_id: str, va: str, vb: str):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    v_a = next((v for v in t.versions if v.version == va), None)
    v_b = next((v for v in t.versions if v.version == vb), None)
    if not v_a or not v_b:
        raise HTTPException(404, "Version not found")
    fields = [
        "mandatory_steps", "optional_steps", "configurable",
        "tenant_override_allowed", "tenant_override_forbidden", "default_config",
        "changelog",
    ]
    differences: dict[str, bool] = {}
    detailed_diff: dict[str, dict] = {}
    for f in fields:
        va_val = getattr(v_a, f, None)
        vb_val = getattr(v_b, f, None)
        is_diff = va_val != vb_val
        differences[f] = is_diff
        if is_diff:
            detailed_diff[f] = {"version_a": va_val, "version_b": vb_val}
    return {
        "version_a": v_a,
        "version_b": v_b,
        "differences": differences,
        "detailed_diff": detailed_diff,
    }


@router.post("/templates/{template_id}/instantiate")
def instantiate_template(template_id: str, body: InstantiateTemplateBody):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")

    # Apply overrides but never bypass mandatory steps
    overrides = body.overrides or {}
    mandatory = set(t.mandatory_steps)
    if "mandatory_steps" in overrides:
        overridden_mandatory = set(overrides["mandatory_steps"])
        if not mandatory.issubset(overridden_mandatory):
            missing = mandatory - overridden_mandatory
            raise HTTPException(400, f"Cannot remove mandatory steps: {', '.join(missing)}")

    # If tenant_override_forbidden is set, prevent overriding those fields
    for forbidden_field in t.tenant_override_forbidden:
        if forbidden_field in overrides:
            raise HTTPException(400, f"Override forbidden for: {forbidden_field}")

    if not t.tenant_override_allowed and overrides:
        raise HTTPException(400, "Tenant overrides are not allowed for this template")

    config = {**t.default_config, **overrides}
    h = Harness(
        tenant_id=body.tenant_id,
        id=gen_id("harness_"),
        name=body.display_name.lower().replace(" ", "-"),
        display_name=body.display_name,
        purpose=f"Instantiated from template: {t.display_name}",
        harness_type=t.harness_type,
        environment=config.get("environment", "development"),
        cost_limit_cents=config.get("cost_limit_cents", 5000),
        time_limit_seconds=config.get("time_limit_seconds", 3600),
        approval_required=config.get("approval_required", False),
        template_id=template_id,
        template_version=t.current_version,
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
        environment=h.environment,
        cost_limit_cents=h.cost_limit_cents,
        time_limit_seconds=h.time_limit_seconds,
        approval_required=h.approval_required,
        changelog=f"Instantiated from template {t.display_name} v{t.current_version}",
        created_at=utc_now(),
    )
    h.versions = [v1]
    store.harnesses.add(h)
    return h


@router.get("/templates/{template_id}/inheritance")
def get_template_inheritance(template_id: str):
    t = store.harness_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    chain: list[dict] = []
    current = t
    while current:
        chain.append({
            "id": current.id,
            "name": current.display_name,
            "inheritance_level": current.inheritance_level.value,
            "mandatory_steps": current.mandatory_steps,
            "tenant_override_allowed": current.tenant_override_allowed,
            "tenant_override_forbidden": current.tenant_override_forbidden,
            "current_version": current.current_version,
            "published": current.published,
        })
        if current.parent_template_id:
            current = store.harness_templates.get(current.parent_template_id)
        else:
            current = None
    return {
        "template_id": template_id,
        "chain": chain,
        "depth": len(chain),
        "governance_enforced": all(
            step in (s["mandatory_steps"] for s in chain)
            for step in (t.mandatory_steps or [])
        ),
    }
