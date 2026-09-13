from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, utc_now


class EngineeringDecision(TenantOwned):
    application_id: str
    decision: str
    rationale: str = ""
    decided_by: str = ""
    context: dict = Field(default_factory=dict)
    impact: str = "MEDIUM"
    tags: list[str] = Field(default_factory=list)


class StateChangeType(str):
    COMMIT_CHANGED = "commit_changed"
    DEPENDENCY_CHANGED = "dependency_changed"
    API_ADDED = "api_added"
    API_REMOVED = "api_removed"
    TEST_COVERAGE_CHANGED = "test_coverage_changed"
    SECURITY_FINDING_ADDED = "security_finding_added"
    SECURITY_FINDING_RESOLVED = "security_finding_resolved"
    DEPLOYMENT_COMPLETED = "deployment_completed"
    ARCHITECTURE_UPDATED = "architecture_updated"
    BUILD_STATUS_CHANGED = "build_status_changed"
    VERSION_CHANGED = "version_changed"
    KNOWN_ISSUE_ADDED = "known_issue_added"
    KNOWN_ISSUE_RESOLVED = "known_issue_resolved"
    OPEN_CHANGE_ADDED = "open_change_added"
    OPEN_CHANGE_MERGED = "open_change_merged"
    DECISION_RECORDED = "decision_recorded"
    EVIDENCE_ADDED = "evidence_added"
    TECHNOLOGY_ADDED = "technology_added"
    HEALTH_SCORE_CHANGED = "health_score_changed"


class StateChangeRecord(TenantOwned):
    application_id: str
    state_id: str
    change_type: str
    description: str
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    category: str = "general"
    severity: str = "info"
    metadata: dict = Field(default_factory=dict)


class EngineeringState(TenantOwned):
    application_id: str
    repository: str = ""
    branch: str = "main"
    commit: str = ""
    version: str = "0.1.0"
    architecture: dict = Field(default_factory=dict)
    technologies: list[str] = Field(default_factory=list)
    dependencies: list[dict] = Field(default_factory=list)
    apis: list[dict] = Field(default_factory=list)
    tests: dict = Field(default_factory=dict)
    security: dict = Field(default_factory=dict)
    build: dict = Field(default_factory=dict)
    release: dict = Field(default_factory=dict)
    deployment: dict = Field(default_factory=dict)
    runtime: dict = Field(default_factory=dict)
    known_issues: list[dict] = Field(default_factory=list)
    open_changes: list[dict] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    decisions: list[EngineeringDecision] = Field(default_factory=list)
    last_updated: str = Field(default_factory=lambda: utc_now().isoformat())
    health_score: float = 0.85
    coverage_pct: float = 0.0
    security_findings: int = 0
    open_vulnerabilities: int = 0
    change_history_ids: list[str] = Field(default_factory=list)
