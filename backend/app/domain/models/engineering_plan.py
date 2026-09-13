from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id, utc_now


class PlanStageType(str, Enum):
    REQUIREMENT = "requirement"
    ARCHITECTURE = "architecture"
    DEVELOPMENT = "development"
    TESTING = "testing"
    SECURITY = "security"
    BUILD = "build"
    RELEASE = "release"
    DEPLOYMENT = "deployment"
    VERIFICATION = "verification"


class PlanStageStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"


class PlanStage(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("pstage_"))
    stage_type: PlanStageType
    label: str
    harness_id: Optional[str] = None
    harness_name: str = ""
    agent_ids: list[str] = Field(default_factory=list)
    agent_names: list[str] = Field(default_factory=list)
    skill_names: list[str] = Field(default_factory=list)
    tool_names: list[str] = Field(default_factory=list)
    environment: str = "development"
    approval_required: bool = False
    description: str = ""
    order: int = 0
    status: PlanStageStatus = PlanStageStatus.PENDING


class EngineeringPlan(TenantOwned):
    application_id: str
    requirement_text: str
    requirement_id: Optional[str] = None
    application_name: str = ""
    application_type: str = "greenfield"
    technologies: list[str] = Field(default_factory=list)
    architecture_summary: str = ""
    architecture_components: list[str] = Field(default_factory=list)
    repository_config: dict = Field(default_factory=dict)
    engineering_state_summary: dict = Field(default_factory=dict)
    recommended_harnesses: list[dict] = Field(default_factory=list)
    recommended_pipeline: dict = Field(default_factory=dict)
    stages: list[PlanStage] = Field(default_factory=list)
    risk_level: str = "MEDIUM"
    risk_factors: list[str] = Field(default_factory=list)
    estimated_cost_cents: int = 0
    estimated_tokens: int = 0
    estimated_duration_seconds: int = 0
    status: str = "draft"
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    decision_reason: str = ""
    execution_id: Optional[str] = None
