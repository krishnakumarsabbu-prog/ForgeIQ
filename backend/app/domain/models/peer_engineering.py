from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id, utc_now


class PeerSessionStatus(str, Enum):
    IDLE = "idle"
    ANALYZING = "analyzing"
    PLAN_READY = "plan_ready"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"


class WorkflowPhase(str, Enum):
    UNDERSTAND_REQUIREMENT = "understand_requirement"
    READ_ENGINEERING_STATE = "read_engineering_state"
    FIND_RELEVANT_FILES = "find_relevant_files"
    IMPACT_ANALYSIS = "impact_analysis"
    RISK_ANALYSIS = "risk_analysis"
    CREATE_PLAN = "create_plan"
    DEVELOPER_APPROVAL = "developer_approval"
    MODIFY_CODE = "modify_code"
    RUN_TESTS = "run_tests"
    SECURITY_SCAN = "security_scan"
    BUILD = "build"
    EVIDENCE = "evidence"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RepositoryFile(BaseModel):
    path: str
    language: str = "text"
    content: str = ""
    lines: int = 0
    is_critical: bool = False
    category: str = "source"


class FileChange(BaseModel):
    file_path: str
    language: str = "text"
    change_type: str = "modify"
    before: str = ""
    after: str = ""
    reason: str = ""
    risk: str = "LOW"
    start_line: int = 1
    end_line: int = 0


class RiskFactor(BaseModel):
    factor: str
    weight: int
    present: bool
    detail: str = ""


class WorkflowStep(BaseModel):
    id: str
    phase: str
    label: str
    description: str
    status: str = "pending"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: dict = Field(default_factory=dict)
    events: list[dict] = Field(default_factory=list)


class TestResult(BaseModel):
    name: str
    status: str = "pending"
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    coverage_pct: float = 0.0
    duration_seconds: float = 0.0
    details: list[dict] = Field(default_factory=list)


class SecurityResult(BaseModel):
    scan_type: str = "sast"
    status: str = "pending"
    findings: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    details: list[dict] = Field(default_factory=list)


class BuildResult(BaseModel):
    status: str = "pending"
    build_time_seconds: float = 0.0
    artifact_path: str = ""
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class EvidenceRecord(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("peerevd_"))
    phase: str
    action: str
    agent: str = ""
    model: str = ""
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())
    summary: str
    data: dict = Field(default_factory=dict)


class PeerEngineeringSession(TenantOwned):
    application_id: str
    application_name: str = ""
    request_text: str = ""
    status: str = "idle"
    current_phase: str = "understand_requirement"

    repository_files: list[RepositoryFile] = Field(default_factory=list)
    selected_file_path: str = ""

    engineering_state_summary: dict = Field(default_factory=dict)
    relevant_files: list[str] = Field(default_factory=list)

    impact_analysis: dict = Field(default_factory=dict)
    risk_level: str = "LOW"
    risk_factors: list[RiskFactor] = Field(default_factory=list)
    risk_score: int = 0

    plan: list[dict] = Field(default_factory=list)
    plan_summary: str = ""
    requires_approval: bool = False

    file_changes: list[FileChange] = Field(default_factory=list)
    workflow_steps: list[WorkflowStep] = Field(default_factory=list)

    test_results: TestResult = Field(default_factory=TestResult)
    security_results: SecurityResult = Field(default_factory=SecurityResult)
    build_results: BuildResult = Field(default_factory=BuildResult)

    evidence: list[EvidenceRecord] = Field(default_factory=list)

    decided_by: str = ""
    decided_at: Optional[str] = None
    decision_reason: str = ""

    created_at: str = Field(default_factory=lambda: utc_now().isoformat())
    updated_at: str = Field(default_factory=lambda: utc_now().isoformat())
