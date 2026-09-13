from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, VersionedEntity, gen_id, utc_now


class GraphNodeType(str, Enum):
    AGENT = "agent"
    SKILL = "skill"
    TOOL = "tool"
    APPROVAL = "approval"
    POLICY = "policy"
    CONDITION = "condition"
    DECISION = "decision"
    PARALLEL = "parallel"
    MERGE = "merge"
    VERIFICATION = "verification"
    ENVIRONMENT = "environment"
    ARTIFACT = "artifact"
    EVIDENCE = "evidence"
    HUMAN_TASK = "human_task"
    RETRY = "retry"
    FAILURE_HANDLER = "failure_handler"
    ESCALATION = "escalation"


class GraphNodeStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"
    BLOCKED = "blocked"
    WAITING = "waiting"
    RETRYING = "retrying"


class GraphEdgeType(str, Enum):
    SEQUENTIAL = "sequential"
    CONDITIONAL = "conditional"
    FAILURE = "failure"
    PARALLEL = "parallel"
    MERGE = "merge"


class GraphNode(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("node_"))
    node_type: GraphNodeType
    label: str
    ref_id: Optional[str] = None
    config: dict = Field(default_factory=dict)
    position_x: float = 0.0
    position_y: float = 0.0
    description: str = ""
    is_entry: bool = False
    is_terminal: bool = False
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)


class GraphEdge(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("edge_"))
    source_node_id: str
    target_node_id: str
    label: str = ""
    condition: Optional[str] = None
    edge_type: GraphEdgeType = GraphEdgeType.SEQUENTIAL
    is_failure_path: bool = False


class GraphMetadata(BaseModel):
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    environment: str = "development"
    failure_path_enabled: bool = False
    approval_path_enabled: bool = False
    execution_context: dict = Field(default_factory=dict)
    dependencies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)


class GraphVersion(TenantOwned):
    graph_id: str
    version: str
    published: bool = False
    is_default: bool = False
    deprecated: bool = False
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    metadata: GraphMetadata = Field(default_factory=GraphMetadata)
    changelog: str = ""


class Graph(VersionedEntity):
    name: str
    display_name: str = ""
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    harness_id: Optional[str] = None
    is_default: bool = False
    metadata: GraphMetadata = Field(default_factory=GraphMetadata)
    versions: list[GraphVersion] = Field(default_factory=list)
    entry_node_id: Optional[str] = None
    terminal_node_ids: list[str] = Field(default_factory=list)


class GraphExecutionState(BaseModel):
    graph_id: str
    execution_id: str
    node_states: dict[str, str] = Field(default_factory=dict)
    active_node_id: Optional[str] = None
    completed_node_ids: list[str] = Field(default_factory=list)
    failed_node_ids: list[str] = Field(default_factory=list)
    skipped_node_ids: list[str] = Field(default_factory=list)
    blocked_node_ids: list[str] = Field(default_factory=list)
    status: str = "pending"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    iteration: int = 0


def new_graph_execution_state(graph_id: str, execution_id: str, graph: Graph) -> GraphExecutionState:
    state = GraphExecutionState(graph_id=graph_id, execution_id=execution_id)
    for node in graph.nodes:
        state.node_states[node.id] = GraphNodeStatus.PENDING.value
    return state
