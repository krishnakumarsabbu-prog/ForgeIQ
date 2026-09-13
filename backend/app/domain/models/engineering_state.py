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
