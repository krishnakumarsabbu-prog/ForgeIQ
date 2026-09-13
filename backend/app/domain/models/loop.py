from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, VersionedEntity, gen_id


class LoopType(str, Enum):
    RETRY = "retry"
    FIX = "fix"
    VALIDATION = "validation"
    SECURITY_REMEDIATION = "security_remediation"
    DEPLOYMENT_VERIFICATION = "deployment_verification"
    ROLLBACK = "rollback"
    INCIDENT_REMEDIATION = "incident_remediation"
    HUMAN_ESCALATION = "human_escalation"
    CONTINUOUS_IMPROVEMENT = "continuous_improvement"


class LoopCondition(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("cond_"))
    field: str
    operator: str
    value: str


class Loop(VersionedEntity):
    name: str
    display_name: str = ""
    loop_type: LoopType = LoopType.RETRY
    trigger: str = "on_failure"
    entry_condition: Optional[str] = None
    evaluation: str = ""
    action: str = ""
    max_iterations: int = 3
    exit_condition: str = "success"
    failure_handling: str = "escalate"
    escalation: str = "human_approval"
    harness_id: Optional[str] = None
    is_default: bool = False
