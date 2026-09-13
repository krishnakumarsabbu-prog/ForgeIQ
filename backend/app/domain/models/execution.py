from __future__ import annotations

from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id, utc_now
from .execution import *  # noqa


class EventType(str, Enum):
    EXECUTION_STARTED = "ExecutionStarted"
    PIPELINE_STARTED = "PipelineStarted"
    HARNESS_STARTED = "HarnessStarted"
    GRAPH_NODE_STARTED = "GraphNodeStarted"
    AGENT_STARTED = "AgentStarted"
    CONTEXT_PREPARED = "ContextPrepared"
    TOOL_REQUESTED = "ToolRequested"
    PERMISSION_CHECKED = "PermissionChecked"
    POLICY_CHECKED = "PolicyChecked"
    TOOL_EXECUTED = "ToolExecuted"
    TOOL_RESULT = "ToolResult"
    EVALUATION_STARTED = "EvaluationStarted"
    EVALUATION_COMPLETED = "EvaluationCompleted"
    LOOP_TRIGGERED = "LoopTriggered"
    RETRY_STARTED = "RetryStarted"
    APPROVAL_REQUESTED = "ApprovalRequested"
    APPROVAL_GRANTED = "ApprovalGranted"
    APPROVAL_REJECTED = "ApprovalRejected"
    EVIDENCE_CREATED = "EvidenceCreated"
    GRAPH_NODE_COMPLETED = "GraphNodeCompleted"
    HARNESS_COMPLETED = "HarnessCompleted"
    PIPELINE_COMPLETED = "PipelineCompleted"
    EXECUTION_FAILED = "ExecutionFailed"
    EXECUTION_COMPLETED = "ExecutionCompleted"


class ExecutionEvent(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("evt_"))
    execution_id: str
    event_type: EventType
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())
    node_id: Optional[str] = None
    agent_id: Optional[str] = None
    tool_id: Optional[str] = None
    harness_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    message: str = ""
    data: dict = Field(default_factory=dict)


class Approval(TenantOwned):
    execution_id: str
    node_id: Optional[str] = None
    harness_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    requested_by: str = ""
    requested_at: str = Field(default_factory=lambda: utc_now().isoformat())
    status: str = "pending"
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    reason: str = ""
    risk_level: str = "MEDIUM"


class Execution(TenantOwned):
    pipeline_id: Optional[str] = None
    harness_id: Optional[str] = None
    application_id: Optional[str] = None
    requirement_id: Optional[str] = None
    status: str = "PENDING"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    trigger: str = "manual"
    trigger_reason: str = ""
    current_stage: Optional[str] = None
    current_node: Optional[str] = None
    events: list[ExecutionEvent] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    approval_ids: list[str] = Field(default_factory=list)
    cost_cents: int = 0
    tokens_used: int = 0
    retry_count: int = 0
    error_message: Optional[str] = None
    progress: float = 0.0
    result: dict = Field(default_factory=dict)
