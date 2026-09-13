from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, VersionedEntity, gen_id


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


class GraphNode(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("node_"))
    node_type: GraphNodeType
    label: str
    ref_id: Optional[str] = None
    config: dict = Field(default_factory=dict)
    position_x: float = 0.0
    position_y: float = 0.0
    description: str = ""


class GraphEdge(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("edge_"))
    source_node_id: str
    target_node_id: str
    label: str = ""
    condition: Optional[str] = None
    edge_type: str = "sequential"


class Graph(VersionedEntity):
    name: str
    display_name: str = ""
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    harness_id: Optional[str] = None
    is_default: bool = False
