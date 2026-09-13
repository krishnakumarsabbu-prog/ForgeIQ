from __future__ import annotations

from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel, Field

from .base import TenantOwned, VersionedEntity, gen_id, utc_now


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


class LoopTrigger(str, Enum):
    ON_FAILURE = "on_failure"
    ON_TEST_FAILURE = "on_test_failure"
    ON_SECURITY_FINDING = "on_security_finding"
    ON_DEPLOYMENT = "on_deployment"
    ON_VERIFICATION_FAILURE = "on_verification_failure"
    ON_INCIDENT = "on_incident"
    ON_COMPLETION = "on_completion"
    ON_SCHEDULE = "on_schedule"
    MANUAL = "manual"


class BackoffStrategy(str, Enum):
    FIXED = "fixed"
    LINEAR = "linear"
    EXPONENTIAL = "exponential"
    NONE = "none"


class FailureHandling(str, Enum):
    ESCALATE = "escalate"
    ROLLBACK = "rollback"
    ABORT = "abort"
    CONTINUE = "continue"


class EscalationType(str, Enum):
    HUMAN_APPROVAL = "human_approval"
    SECURITY_ENGINEER_APPROVAL = "security_engineer_approval"
    INCIDENT_REMEDIATION = "incident_remediation"
    NOTIFY_ONLY = "notify_only"
    AUTO_ROLLBACK = "auto_rollback"


class LoopStepType(str, Enum):
    TRIGGER = "trigger"
    EVALUATE = "evaluate"
    CONDITION = "condition"
    ACTION = "action"
    DECISION = "decision"
    EXIT = "exit"
    ESCALATION = "escalation"
    FAILURE_HANDLER = "failure_handler"


class LoopStep(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("lstep_"))
    step_type: LoopStepType
    label: str
    description: str = ""
    config: dict[str, Any] = Field(default_factory=dict)
    next_step_id: Optional[str] = None
    branch_true_id: Optional[str] = None
    branch_false_id: Optional[str] = None
    position_x: int = 0
    position_y: int = 0


class LoopIterationRecord(BaseModel):
    iteration: int
    attempt: int
    trigger: str = ""
    evaluation_result: dict[str, Any] = Field(default_factory=dict)
    decision: str = ""
    action: str = ""
    action_result: dict[str, Any] = Field(default_factory=dict)
    exit_reason: str = ""
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())


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
    backoff_strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL
    backoff_initial_ms: int = 1000
    backoff_max_ms: int = 30000
    cost_limit_cents: int = 10000
    time_limit_seconds: int = 3600
    retry_policy: dict[str, Any] = Field(default_factory=lambda: {"retry_on": "transient", "max_retries": 3})
    exit_condition: str = "success"
    failure_handling: str = "escalate"
    escalation: str = "human_approval"
    harness_id: Optional[str] = None
    is_default: bool = False
    steps: list[LoopStep] = Field(default_factory=list)
    evidence_requirements: list[str] = Field(default_factory=lambda: ["iteration_log", "evaluation_result", "exit_reason"])
    execution_history: list[LoopIterationRecord] = Field(default_factory=list)
