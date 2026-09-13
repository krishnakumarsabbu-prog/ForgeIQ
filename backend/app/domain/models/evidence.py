from __future__ import annotations

from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel, Field

from .base import TenantOwned, utc_now


class EvidenceType(str, Enum):
    REQUIREMENT = "requirement"
    PIPELINE = "pipeline"
    HARNESS = "harness"
    GRAPH = "graph"
    LOOP = "loop"
    AGENT = "agent"
    MODEL = "model"
    CONTEXT = "context"
    TOOL = "tool"
    ACTION = "action"
    CODE_CHANGE = "code_change"
    TEST = "test"
    SECURITY = "security"
    BUILD = "build"
    RELEASE = "release"
    DEPLOYMENT = "deployment"
    VERIFICATION = "verification"
    APPROVAL = "approval"
    POLICY = "policy"


class EvidenceStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    WARNING = "warning"
    INFO = "info"


class CodeChange(BaseModel):
    file: str = ""
    change_type: str = "modified"
    additions: int = 0
    deletions: int = 0
    language: str = ""


class TestResultDetail(BaseModel):
    name: str = ""
    status: str = ""
    duration_ms: int = 0
    message: str = ""


class ApprovalRecord(BaseModel):
    approver: str = ""
    decision: str = ""
    reason: str = ""
    timestamp: str = ""


class PolicyDecision(BaseModel):
    policy_id: str = ""
    policy_name: str = ""
    decision: str = ""
    rule: str = ""


class DeploymentEvidence(BaseModel):
    environment: str = ""
    version: str = ""
    strategy: str = ""
    artifact_id: str = ""


class VerificationEvidence(BaseModel):
    check_type: str = ""
    status: str = ""
    details: str = ""


class Evidence(TenantOwned):
    # Chain linkage
    application_id: Optional[str] = None
    requirement_id: Optional[str] = None
    execution_id: str
    pipeline_id: Optional[str] = None
    pipeline_version: Optional[str] = None
    harness_id: Optional[str] = None
    harness_version: Optional[str] = None
    graph_id: Optional[str] = None
    graph_version: Optional[str] = None
    loop_id: Optional[str] = None
    loop_iteration: Optional[int] = None
    node_id: Optional[str] = None

    # Actor identification
    agent_id: Optional[str] = None
    agent_version: Optional[str] = None
    model_used: Optional[str] = None
    model_provider: Optional[str] = None

    # Context and tool
    context_reference: Optional[str] = None
    tool_id: Optional[str] = None
    tool_operation: Optional[str] = None

    # Content
    evidence_type: EvidenceType
    status: EvidenceStatus = EvidenceStatus.SUCCESS
    environment: str = ""
    summary: str = ""
    inputs: dict = Field(default_factory=dict)
    outputs: dict = Field(default_factory=dict)
    input_hash: str = ""
    output_reference: str = ""

    # Engineering artifacts
    code_changes: list[dict] = Field(default_factory=list)
    test_results: dict = Field(default_factory=dict)
    security_results: dict = Field(default_factory=dict)
    build_results: dict = Field(default_factory=dict)
    release_results: dict = Field(default_factory=dict)

    # Governance artifacts
    approvals: list[dict] = Field(default_factory=list)
    policies_applied: list[str] = Field(default_factory=list)
    policy_decisions: list[dict] = Field(default_factory=list)

    # Delivery artifacts
    deployment: dict = Field(default_factory=dict)
    verification: dict = Field(default_factory=dict)

    # Integrity
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())
    hash: str = ""
    immutable: bool = True
    previous_evidence_id: Optional[str] = None
