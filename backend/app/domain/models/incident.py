from __future__ import annotations

from enum import Enum
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id, utc_now


class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentStatus(str, Enum):
    DETECTED = "detected"
    INVESTIGATING = "investigating"
    ROOT_CAUSE_IDENTIFIED = "root_cause_identified"
    REMEDIATION_PLANNED = "remediation_planned"
    REMEDIATION_IN_PROGRESS = "remediation_in_progress"
    AWAITING_APPROVAL = "awaiting_approval"
    DEPLOYING_FIX = "deploying_fix"
    VERIFYING = "verifying"
    RESOLVED = "resolved"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"
    ESCALATED = "escalated"
    CLOSED = "closed"
    FAILED = "failed"


class IncidentSource(str, Enum):
    OBSERVABILITY = "observability"
    MANUAL = "manual"
    VERIFICATION_FAILURE = "verification_failure"
    DEPLOYMENT_FAILURE = "deployment_failure"
    ALERT = "alert"
    USER_REPORT = "user_report"


class Symptom(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("sym_"))
    name: str
    severity: str = "HIGH"
    component: str = ""
    metric: str = ""
    threshold: str = ""
    observed_value: str = ""
    message: str = ""
    detected_at: str = Field(default_factory=lambda: utc_now().isoformat())


class RootCauseCategory(str, Enum):
    CODE_DEFECT = "code_defect"
    CONFIGURATION_ERROR = "configuration_error"
    DEPENDENCY_FAILURE = "dependency_failure"
    INFRASTRUCTURE = "infrastructure"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    NETWORK = "network"
    DATABASE = "database"
    SECURITY = "security"
    UNKNOWN = "unknown"


class RootCauseFinding(BaseModel):
    category: str = RootCauseCategory.UNKNOWN.value
    component: str = ""
    description: str = ""
    commit_sha: str = ""
    file_path: str = ""
    line_range: str = ""
    confidence: float = 0.0
    contributing_factors: list[str] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)


class RemediationStep(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("rstep_"))
    phase: str = ""
    label: str
    description: str = ""
    agent_id: str = ""
    status: str = "pending"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: dict = Field(default_factory=dict)
    evidence_id: Optional[str] = None


class RemediationPlan(BaseModel):
    summary: str = ""
    risk_level: str = "MEDIUM"
    risk_factors: list[str] = Field(default_factory=list)
    requires_approval: bool = False
    steps: list[RemediationStep] = Field(default_factory=list)
    estimated_duration_seconds: int = 0
    estimated_cost_cents: int = 0
    rollback_plan: str = ""
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())


class IncidentTimelineEntry(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("tl_"))
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())
    event: str
    message: str
    actor: str = "system"
    data: dict = Field(default_factory=dict)


class Incident(TenantOwned):
    id: str = Field(default_factory=lambda: gen_id("inc_"))
    title: str
    description: str = ""
    severity: str = IncidentSeverity.HIGH.value
    status: str = IncidentStatus.DETECTED.value
    source: str = IncidentSource.OBSERVABILITY.value
    application_id: str
    environment_id: str = ""
    component: str = ""
    symptoms: list[Symptom] = Field(default_factory=list)
    timeline: list[IncidentTimelineEntry] = Field(default_factory=list)
    root_cause: Optional[RootCauseFinding] = None
    root_cause_analysis: dict = Field(default_factory=dict)
    remediation_plan: Optional[RemediationPlan] = None
    remediation_execution_id: Optional[str] = None
    remediation_deployment_id: Optional[str] = None
    verification_result: dict = Field(default_factory=dict)
    rollback_result: dict = Field(default_factory=dict)
    evidence_ids: list[str] = Field(default_factory=list)
    approval_id: Optional[str] = None
    assigned_to: str = ""
    detected_at: str = Field(default_factory=lambda: utc_now().isoformat())
    acknowledged_at: Optional[str] = None
    resolved_at: Optional[str] = None
    closed_at: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    related_incident_ids: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
