from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, VersionedEntity, gen_id


class PipelineStageType(str, Enum):
    HARNESS = "harness"
    APPROVAL = "approval"
    CONDITION = "condition"
    PARALLEL = "parallel"
    ENVIRONMENT = "environment"
    ARTIFACT = "artifact"
    VERIFICATION = "verification"
    DEVELOPMENT = "development"
    TESTING = "testing"
    SECURITY = "security"
    BUILD = "build"
    RELEASE = "release"
    DEPLOYMENT = "deployment"
    ARCHITECTURE = "architecture"
    DISCOVERY = "discovery"
    INCIDENT = "incident"


class FailureStrategy(str, Enum):
    ABORT = "abort"
    CONTINUE = "continue"
    RETRY = "retry"
    SKIP = "skip"
    ROLLBACK = "rollback"
    ESCALATE = "escalate"


class StageConfig(BaseModel):
    harness_version: Optional[str] = None
    input_mapping: dict = Field(default_factory=dict)
    output_mapping: dict = Field(default_factory=dict)
    environment: Optional[str] = None
    conditions: list[str] = Field(default_factory=list)
    failure_strategy: FailureStrategy = FailureStrategy.ABORT
    approval_required: bool = False
    timeout_seconds: Optional[int] = None
    parallel_stage_ids: list[str] = Field(default_factory=list)


class PipelineStage(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("stage_"))
    name: str
    stage_type: PipelineStageType
    harness_id: Optional[str] = None
    order: int = 0
    condition: Optional[str] = None
    required: bool = True
    parallel_with: list[str] = Field(default_factory=list)
    config: StageConfig = Field(default_factory=StageConfig)


class PipelineVersion(VersionedEntity):
    pipeline_id: str
    stages: list[PipelineStage] = Field(default_factory=list)
    is_default: bool = False
    is_immutable: bool = False
    published_at: Optional[str] = None


class Pipeline(TenantOwned):
    name: str
    display_name: str
    description: str = ""
    application_id: Optional[str] = None
    stages: list[PipelineStage] = Field(default_factory=list)
    current_version: str = "v1"
    versions: list[PipelineVersion] = Field(default_factory=list)
    published: bool = False
    active: bool = True
    tags: list[str] = Field(default_factory=list)
    template_id: Optional[str] = None
    template_version: Optional[str] = None


class PipelineTemplateVersion(VersionedEntity):
    template_id: str
    version: str
    published: bool = False
    is_default: bool = False
    is_immutable: bool = False
    stage_definitions: list[dict] = Field(default_factory=list)
    changelog: str = ""
    published_at: Optional[str] = None


class PipelineTemplate(TenantOwned):
    name: str
    display_name: str
    description: str = ""
    category: str = "custom"
    stage_definitions: list[dict] = Field(default_factory=list)
    current_version: str = "v1"
    versions: list[PipelineTemplateVersion] = Field(default_factory=list)
    published: bool = False
    deprecated: bool = False
    last_published_at: Optional[str] = None
