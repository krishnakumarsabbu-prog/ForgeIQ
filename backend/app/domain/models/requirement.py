from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned


class RequirementStatus(str, Enum):
    DRAFT = "draft"
    ANALYZED = "analyzed"
    ARCHITECTED = "architected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RequirementPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Requirement(TenantOwned):
    title: str
    description: str
    application_id: str
    status: RequirementStatus = RequirementStatus.DRAFT
    priority: RequirementPriority = RequirementPriority.MEDIUM
    tags: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    assigned_pipeline_id: Optional[str] = None
    estimated_complexity: str = "MEDIUM"
    engineering_state_id: Optional[str] = None
