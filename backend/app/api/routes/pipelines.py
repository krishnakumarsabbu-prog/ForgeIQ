from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.pipeline import Pipeline, PipelineStage, PipelineStageType
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


class StageCreate(BaseModel):
    name: str
    stage_type: PipelineStageType
    harness_id: str
    order: int = 0
    required: bool = True
    condition: Optional[str] = None


class PipelineCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    application_id: Optional[str] = None
    stages: list[StageCreate] = Field(default_factory=list)
    tenant_id: str = "tenant_forgeiq"


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
        created_at=utc_now(),
    )
    store.pipelines.add(p)
    if body.application_id:
        app = store.applications.get(body.application_id)
        if app:
            app.pipeline_ids.append(p.id)
    return p
