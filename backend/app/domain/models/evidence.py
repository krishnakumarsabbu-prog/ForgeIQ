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


class Evidence(TenantOwned):
    execution_id: str
    evidence_type: EvidenceType
    agent_id: Optional[str] = None
    agent_version: Optional[str] = None
    model_used: Optional[str] = None
    harness_id: Optional[str] = None
    harness_version: Optional[str] = None
    graph_id: Optional[str] = None
    loop_iteration: Optional[int] = None
    tool_id: Optional[str] = None
    inputs: dict = Field(default_factory=dict)
    outputs: dict = Field(default_factory=dict)
    code_changes: list[dict] = Field(default_factory=list)
    test_results: dict = Field(default_factory=dict)
    security_results: dict = Field(default_factory=dict)
    approvals: list[dict] = Field(default_factory=list)
    policies_applied: list[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())
    hash: str = ""
    immutable: bool = True
    summary: str = ""
