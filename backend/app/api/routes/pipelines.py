from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any

from ...storage.in_memory import store
from ...domain.models.pipeline import (
    Pipeline, PipelineStage, PipelineStageType, StageConfig, FailureStrategy,
    PipelineTemplate, PipelineTemplateVersion,
)
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


# --- Request models ---

class StageConfigCreate(BaseModel):
    harness_version: Optional[str] = None
    input_mapping: dict = Field(default_factory=dict)
    output_mapping: dict = Field(default_factory=dict)
    environment: Optional[str] = None
    conditions: list[str] = Field(default_factory=list)
    failure_strategy: FailureStrategy = FailureStrategy.ABORT
    approval_required: bool = False
    timeout_seconds: Optional[int] = None
    parallel_stage_ids: list[str] = Field(default_factory=list)


class StageCreate(BaseModel):
    name: str
    stage_type: PipelineStageType
    harness_id: Optional[str] = None
    order: int = 0
    required: bool = True
    condition: Optional[str] = None
    parallel_with: list[str] = Field(default_factory=list)
    config: StageConfigCreate = Field(default_factory=StageConfigCreate)


class PipelineCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    application_id: Optional[str] = None
    stages: list[StageCreate] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    tenant_id: str = "tenant_forgeiq"
    template_id: Optional[str] = None


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    application_id: Optional[str] = None
    stages: Optional[list[StageCreate]] = None
    tags: Optional[list[str]] = None
    active: Optional[bool] = None


class VersionBody(BaseModel):
    changelog: str = "New version"


class PublishBody(BaseModel):
    pass


# --- Template request models ---

class TemplateCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    category: str = "custom"
    stage_definitions: list[dict] = Field(default_factory=list)
    tenant_id: str = "tenant_forgeiq"


class TemplateUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    stage_definitions: Optional[list[dict]] = None


class TemplateVersionBody(BaseModel):
    changelog: str = "New template version"
    stage_definitions: Optional[list[dict]] = None


class InstantiateTemplateBody(BaseModel):
    display_name: str
    application_id: Optional[str] = None
    tenant_id: str = "tenant_forgeiq"


# --- Pipeline CRUD ---

@router.get("")
def list_pipelines(tenant_id: str = "tenant_forgeiq"):
    return store.pipelines.all(tenant_id)


@router.get("/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    p = store.pipelines.get(pipeline_id)
    if not p:
        raise HTTPException(404, "Pipeline not found")
    return p


@router.post("")
def create_pipeline(body: PipelineCreate):
    stages = [
        PipelineStage(
            id=gen_id("stage_"),
            name=s.name,
            stage_type=s.stage_type,
            harness_id=s.harness_id,
            order=s.order,
            required=s.required,
            condition=s.condition,
            parallel_with=s.parallel_with,
            config=StageConfig(
                harness_version=s.config.harness_version,
                input_mapping=s.config.input_mapping,
                output_mapping=s.config.output_mapping,
                environment=s.config.environment,
                conditions=s.config.conditions,
                failure_strategy=s.config.failure_strategy,
                approval_required=s.config.approval_required,
                timeout_seconds=s.config.timeout_seconds,
                parallel_stage_ids=s.config.parallel_stage_ids,
            ),
        )
        for s in body.stages
    ]
    p = Pipeline(
        tenant_id=body.tenant_id,
        id=gen_id("pipeline_"),
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        application_id=body.application_id,
        stages=stages,
        published=False,
        active=True,
        tags=body.tags,
        template_id=body.template_id,
        created_at=utc_now(),
    )
    store.pipelines.add(p)
    if body.application_id:
        app = store.applications.get(body.application_id)
        if app:
            app.pipeline_ids.append(p.id)
    return p


@router.put("/{pipeline_id}")
def update_pipeline(pipeline_id: str, body: PipelineUpdate):
    p = store.pipelines.get(pipeline_id)
    if not p:
        raise HTTPException(404, "Pipeline not found")
    if p.published:
        raise HTTPException(400, "Published pipeline is immutable. Create a new version instead.")
    if body.name is not None:
        p.name = body.name
    if body.display_name is not None:
        p.display_name = body.display_name
    if body.description is not None:
        p.description = body.description
    if body.application_id is not None:
        p.application_id = body.application_id
    if body.tags is not None:
        p.tags = body.tags
    if body.active is not None:
        p.active = body.active
    if body.stages is not None:
        p.stages = [
            PipelineStage(
                id=gen_id("stage_"),
                name=s.name,
                stage_type=s.stage_type,
                harness_id=s.harness_id,
                order=s.order,
                required=s.required,
                condition=s.condition,
                parallel_with=s.parallel_with,
                config=StageConfig(
                    harness_version=s.config.harness_version,
                    input_mapping=s.config.input_mapping,
                    output_mapping=s.config.output_mapping,
                    environment=s.config.environment,
                    conditions=s.config.conditions,
                    failure_strategy=s.config.failure_strategy,
                    approval_required=s.config.approval_required,
                    timeout_seconds=s.config.timeout_seconds,
                    parallel_stage_ids=s.config.parallel_stage_ids,
                ),
            )
            for s in body.stages
        ]
    p.touch()
    return p


@router.delete("/{pipeline_id}")
def delete_pipeline(pipeline_id: str):
    p = store.pipelines.get(pipeline_id)
    if not p:
        raise HTTPException(404, "Pipeline not found")
    if p.application_id:
        app = store.applications.get(p.application_id)
        if app and pipeline_id in app.pipeline_ids:
            app.pipeline_ids.remove(pipeline_id)
    store.pipelines.delete(pipeline_id)
    return {"status": "deleted", "id": pipeline_id}


@router.post("/{pipeline_id}/versions")
def create_version(pipeline_id: str, body: VersionBody):
    p = store.pipelines.get(pipeline_id)
    if not p:
        raise HTTPException(404, "Pipeline not found")
    new_version_num = len(p.versions) + 1
    v_str = f"v{new_version_num}"
    from ...domain.models.pipeline import PipelineVersion
    v = PipelineVersion(
        tenant_id=p.tenant_id,
        id=gen_id("pver_"),
        pipeline_id=p.id,
        version=v_str,
        stages=[s.model_copy() for s in p.stages],
        changelog=body.changelog,
        created_at=utc_now(),
    )
    p.versions.append(v)
    p.current_version = v_str
    return v


@router.post("/{pipeline_id}/publish/{version}")
def publish_version(pipeline_id: str, version: str):
    p = store.pipelines.get(pipeline_id)
    if not p:
        raise HTTPException(404, "Pipeline not found")
    target_v = None
    for v in p.versions:
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
    target_v.published_at = utc_now().isoformat()
    p.current_version = version
    p.published = True
    for v in p.versions:
        if v.version != version:
            v.is_default = False
    return p


# --- Pipeline Templates ---

@router.get("/templates/all")
def list_templates(tenant_id: str = "tenant_forgeiq"):
    return store.pipeline_templates.all(tenant_id)


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    t = store.pipeline_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Pipeline template not found")
    return t


@router.post("/templates")
def create_template(body: TemplateCreate):
    t = PipelineTemplate(
        tenant_id=body.tenant_id,
        id=gen_id("ptmpl_"),
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        category=body.category,
        stage_definitions=body.stage_definitions,
        published=False,
        created_at=utc_now(),
    )
    v1 = PipelineTemplateVersion(
        tenant_id=body.tenant_id,
        id=gen_id("ptver_"),
        template_id=t.id,
        version="v1",
        published=False,
        is_default=True,
        stage_definitions=body.stage_definitions,
        changelog="Initial version",
        created_at=utc_now(),
    )
    t.versions = [v1]
    store.pipeline_templates.add(t)
    return t


@router.put("/templates/{template_id}")
def update_template(template_id: str, body: TemplateUpdate):
    t = store.pipeline_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Pipeline template not found")
    if body.display_name is not None:
        t.display_name = body.display_name
    if body.description is not None:
        t.description = body.description
    if body.category is not None:
        t.category = body.category
    if body.stage_definitions is not None:
        t.stage_definitions = body.stage_definitions
    t.touch()
    return t


@router.delete("/templates/{template_id}")
def delete_template(template_id: str):
    t = store.pipeline_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Pipeline template not found")
    store.pipeline_templates.delete(template_id)
    return {"status": "deleted", "id": template_id}


@router.post("/templates/{template_id}/versions")
def create_template_version(template_id: str, body: TemplateVersionBody):
    t = store.pipeline_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Pipeline template not found")
    new_version_num = len(t.versions) + 1
    v_str = f"v{new_version_num}"
    stage_defs = body.stage_definitions if body.stage_definitions is not None else list(t.stage_definitions)
    v = PipelineTemplateVersion(
        tenant_id=t.tenant_id,
        id=gen_id("ptver_"),
        template_id=t.id,
        version=v_str,
        published=False,
        is_default=False,
        stage_definitions=stage_defs,
        changelog=body.changelog,
        created_at=utc_now(),
    )
    t.versions.append(v)
    t.current_version = v_str
    return v


@router.post("/templates/{template_id}/publish/{version}")
def publish_template_version(template_id: str, version: str):
    t = store.pipeline_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Pipeline template not found")
    target_v = None
    for v in t.versions:
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
    target_v.published_at = utc_now().isoformat()
    t.current_version = version
    t.published = True
    t.last_published_at = utc_now().isoformat()
    for v in t.versions:
        if v.version != version:
            v.is_default = False
    return t


@router.post("/templates/{template_id}/instantiate")
def instantiate_template(template_id: str, body: InstantiateTemplateBody):
    t = store.pipeline_templates.get(template_id)
    if not t:
        raise HTTPException(404, "Pipeline template not found")
    default_v = None
    for v in t.versions:
        if v.is_default:
            default_v = v
            break
    if not default_v:
        default_v = t.versions[0] if t.versions else None
    stage_defs = default_v.stage_definitions if default_v else t.stage_definitions

    stages: list[PipelineStage] = []
    for i, sd in enumerate(stage_defs):
        stage_type_str = sd.get("stage_type", "harness")
        try:
            stage_type = PipelineStageType(stage_type_str)
        except ValueError:
            stage_type = PipelineStageType.HARNESS
        harness_id = sd.get("harness_id")
        if harness_id:
            h = store.harnesses.get(harness_id)
            if not h:
                harness_id = None
        cfg = sd.get("config", {})
        stages.append(PipelineStage(
            id=gen_id("stage_"),
            name=sd.get("name", f"Stage {i + 1}"),
            stage_type=stage_type,
            harness_id=harness_id,
            order=i,
            required=sd.get("required", True),
            condition=sd.get("condition"),
            parallel_with=sd.get("parallel_with", []),
            config=StageConfig(
                harness_version=cfg.get("harness_version"),
                input_mapping=cfg.get("input_mapping", {}),
                output_mapping=cfg.get("output_mapping", {}),
                environment=cfg.get("environment"),
                conditions=cfg.get("conditions", []),
                failure_strategy=FailureStrategy(cfg.get("failure_strategy", "abort")),
                approval_required=cfg.get("approval_required", False),
                timeout_seconds=cfg.get("timeout_seconds"),
                parallel_stage_ids=cfg.get("parallel_stage_ids", []),
            ),
        ))

    p = Pipeline(
        tenant_id=body.tenant_id,
        id=gen_id("pipeline_"),
        name=body.display_name.lower().replace(" ", "-"),
        display_name=body.display_name,
        description=f"Created from template: {t.display_name}",
        application_id=body.application_id,
        stages=stages,
        published=False,
        active=True,
        template_id=t.id,
        template_version=default_v.version if default_v else t.current_version,
        created_at=utc_now(),
    )
    store.pipelines.add(p)
    if body.application_id:
        app = store.applications.get(body.application_id)
        if app:
            app.pipeline_ids.append(p.id)
    return p


@router.get("/stage-types/list")
def list_stage_types():
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in PipelineStageType]


@router.get("/failure-strategies/list")
def list_failure_strategies():
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in FailureStrategy]
