from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id


class PipelineStageType(str, Enum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    SECURITY = "security"
    BUILD = "build"
    RELEASE = "release"
    DEPLOYMENT = "deployment"
    VERIFICATION = "verification"
    ARCHITECTURE = "architecture"
    DISCOVERY = "discovery"
    INCIDENT = "incident"


class PipelineStage(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("stage_"))
    name: str
    stage_type: PipelineStageType
    harness_id: str
    order: int = 0
    condition: Optional[str] = None
    required: bool = True
    parallel_with: list[str] = Field(default_factory=list)


class Pipeline(TenantOwned):
    name: str
    display_name: str
    description: str = ""
    application_id: Optional[str] = None
    stages: list[PipelineStage] = Field(default_factory=list)
    current_version: str = "v1"
    published: bool = False
    active: bool = True
    tags: list[str] = Field(default_factory=list)
