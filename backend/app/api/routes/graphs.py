from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.graph import (
    Graph, GraphNode, GraphEdge, GraphNodeType, GraphEdgeType,
    GraphMetadata, GraphVersion, GraphNodeStatus,
)
from ...domain.models.base import gen_id, utc_now
from ...runtime.graph_engine import GraphEngine
from ...runtime.graph_validator import GraphValidator

router = APIRouter(prefix="/graphs", tags=["graphs"])


class NodeCreate(BaseModel):
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


class EdgeCreate(BaseModel):
    source_node_id: str
    target_node_id: str
    label: str = ""
    condition: Optional[str] = None
    edge_type: str = "sequential"
    is_failure_path: bool = False


class GraphCreate(BaseModel):
    name: str
    display_name: str = ""
    description: str = ""
    tenant_id: str = "tenant_forgeiq"
    metadata: Optional[dict] = None


class NodeUpdate(BaseModel):
    node_type: Optional[GraphNodeType] = None
    label: Optional[str] = None
    ref_id: Optional[str] = None
    config: Optional[dict] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    description: Optional[str] = None
    is_entry: Optional[bool] = None
    is_terminal: Optional[bool] = None
    inputs: Optional[list[str]] = None
    outputs: Optional[list[str]] = None


class EdgeUpdate(BaseModel):
    label: Optional[str] = None
    condition: Optional[str] = None
    edge_type: Optional[str] = None
    is_failure_path: Optional[bool] = None


class GraphFullUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[list[dict]] = None
    edges: Optional[list[dict]] = None
    metadata: Optional[dict] = None
    entry_node_id: Optional[str] = None
    terminal_node_ids: Optional[list[str]] = None


class GraphVersionCreate(BaseModel):
    changelog: str = ""


class GraphExecuteBody(BaseModel):
    harness_id: str = ""
    environment: str = "development"
    application_id: Optional[str] = None
    requirement_id: Optional[str] = None


@router.get("")
def list_graphs(tenant_id: str = "tenant_forgeiq"):
    return store.graphs.all(tenant_id)


@router.get("/{graph_id}")
def get_graph(graph_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    return g


@router.post("")
def create_graph(body: GraphCreate):
    metadata = GraphMetadata(**body.metadata) if body.metadata else GraphMetadata()
    g = Graph(
        tenant_id=body.tenant_id,
        id=gen_id("graph_"),
        name=body.name,
        display_name=body.display_name or body.name,
        description=body.description,
        version="v1",
        published=False,
        metadata=metadata,
        created_at=utc_now(),
    )
    store.graphs.add(g)
    return g


@router.put("/{graph_id}")
def update_graph_full(graph_id: str, body: GraphFullUpdate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    if body.name is not None:
        g.name = body.name
    if body.display_name is not None:
        g.display_name = body.display_name
    if body.description is not None:
        g.description = body.description
    if body.nodes is not None:
        g.nodes = [GraphNode(**n) for n in body.nodes]
    if body.edges is not None:
        g.edges = [GraphEdge(**e) for e in body.edges]
    if body.metadata is not None:
        g.metadata = GraphMetadata(**body.metadata)
    if body.entry_node_id is not None:
        g.entry_node_id = body.entry_node_id
    if body.terminal_node_ids is not None:
        g.terminal_node_ids = body.terminal_node_ids
    g.touch()
    return g


@router.delete("/{graph_id}")
def delete_graph(graph_id: str):
    if not store.graphs.delete(graph_id):
        raise HTTPException(404, "Graph not found")
    return {"deleted": True}


@router.post("/{graph_id}/nodes")
def add_node(graph_id: str, body: NodeCreate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    node = GraphNode(
        id=gen_id("node_"),
        node_type=body.node_type, label=body.label, ref_id=body.ref_id,
        config=body.config, position_x=body.position_x, position_y=body.position_y,
        description=body.description, is_entry=body.is_entry, is_terminal=body.is_terminal,
        inputs=body.inputs, outputs=body.outputs,
    )
    g.nodes.append(node)
    if body.is_entry:
        g.entry_node_id = node.id
    if body.is_terminal and node.id not in g.terminal_node_ids:
        g.terminal_node_ids.append(node.id)
    g.touch()
    return g


@router.put("/{graph_id}/nodes/{node_id}")
def update_node(graph_id: str, node_id: str, body: NodeUpdate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    for n in g.nodes:
        if n.id == node_id:
            if body.node_type is not None: n.node_type = body.node_type
            if body.label is not None: n.label = body.label
            if body.ref_id is not None: n.ref_id = body.ref_id
            if body.config is not None: n.config = body.config
            if body.position_x is not None: n.position_x = body.position_x
            if body.position_y is not None: n.position_y = body.position_y
            if body.description is not None: n.description = body.description
            if body.is_entry is not None:
                n.is_entry = body.is_entry
                if body.is_entry: g.entry_node_id = node_id
            if body.is_terminal is not None:
                n.is_terminal = body.is_terminal
                if body.is_terminal and node_id not in g.terminal_node_ids:
                    g.terminal_node_ids.append(node_id)
                elif not body.is_terminal and node_id in g.terminal_node_ids:
                    g.terminal_node_ids.remove(node_id)
            if body.inputs is not None: n.inputs = body.inputs
            if body.outputs is not None: n.outputs = body.outputs
            g.touch()
            return n
    raise HTTPException(404, "Node not found")


@router.delete("/{graph_id}/nodes/{node_id}")
def delete_node(graph_id: str, node_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    g.nodes = [n for n in g.nodes if n.id != node_id]
    g.edges = [e for e in g.edges if e.source_node_id != node_id and e.target_node_id != node_id]
    if g.entry_node_id == node_id:
        g.entry_node_id = None
    if node_id in g.terminal_node_ids:
        g.terminal_node_ids.remove(node_id)
    g.touch()
    return {"deleted": True}


@router.post("/{graph_id}/edges")
def add_edge(graph_id: str, body: EdgeCreate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    edge = GraphEdge(
        id=gen_id("edge_"),
        source_node_id=body.source_node_id, target_node_id=body.target_node_id,
        label=body.label, condition=body.condition,
        edge_type=GraphEdgeType(body.edge_type) if body.edge_type else GraphEdgeType.SEQUENTIAL,
        is_failure_path=body.is_failure_path,
    )
    g.edges.append(edge)
    g.touch()
    return g


@router.put("/{graph_id}/edges/{edge_id}")
def update_edge(graph_id: str, edge_id: str, body: EdgeUpdate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    for e in g.edges:
        if e.id == edge_id:
            if body.label is not None: e.label = body.label
            if body.condition is not None: e.condition = body.condition
            if body.edge_type is not None: e.edge_type = GraphEdgeType(body.edge_type)
            if body.is_failure_path is not None: e.is_failure_path = body.is_failure_path
            g.touch()
            return e
    raise HTTPException(404, "Edge not found")


@router.delete("/{graph_id}/edges/{edge_id}")
def delete_edge(graph_id: str, edge_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    g.edges = [e for e in g.edges if e.id != edge_id]
    g.touch()
    return {"deleted": True}


@router.get("/{graph_id}/validate")
def validate_graph(graph_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    validator = GraphValidator()
    return validator.validate(g)


@router.get("/{graph_id}/versions")
def list_versions(graph_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    return g.versions


@router.post("/{graph_id}/versions")
def create_version(graph_id: str, body: GraphVersionCreate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    version_num = f"v{len(g.versions) + 1}"
    v = GraphVersion(
        tenant_id=g.tenant_id, id=gen_id("gver_"),
        graph_id=graph_id, version=version_num,
        published=False, is_default=False,
        nodes=[n.model_copy() for n in g.nodes],
        edges=[e.model_copy() for e in g.edges],
        metadata=g.metadata.model_copy(),
        changelog=body.changelog,
        created_at=utc_now(),
    )
    g.versions.append(v)
    g.touch()
    return v


@router.post("/{graph_id}/publish/{version}")
def publish_version(graph_id: str, version: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    for v in g.versions:
        if v.version == version:
            v.published = True
            v.is_default = True
            for other in g.versions:
                if other.version != version:
                    other.is_default = False
            g.version = version
            g.published = True
            g.touch()
            return g
    raise HTTPException(404, f"Version {version} not found")


@router.post("/{graph_id}/rollback/{version}")
def rollback_version(graph_id: str, version: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    for v in g.versions:
        if v.version == version:
            g.nodes = [n.model_copy() for n in v.nodes]
            g.edges = [e.model_copy() for e in v.edges]
            g.metadata = v.metadata.model_copy()
            g.version = version
            for other in g.versions:
                other.is_default = (other.version == version)
            g.touch()
            return g
    raise HTTPException(404, f"Version {version} not found")


@router.get("/{graph_id}/serialize")
def serialize_graph(graph_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    return {
        "graph_id": g.id,
        "name": g.name,
        "display_name": g.display_name,
        "version": g.version,
        "nodes": [n.model_dump() for n in g.nodes],
        "edges": [e.model_dump() for e in g.edges],
        "metadata": g.metadata.model_dump(),
        "entry_node_id": g.entry_node_id,
        "terminal_node_ids": g.terminal_node_ids,
    }


@router.post("/{graph_id}/execute")
async def execute_graph(graph_id: str, body: GraphExecuteBody):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    engine = GraphEngine(g.tenant_id)
    execution_id = gen_id("exec_")
    result = await engine.execute(
        graph_id=graph_id, execution_id=execution_id,
        harness_id=body.harness_id, environment=body.environment,
        application_id=body.application_id, requirement_id=body.requirement_id,
    )
    return {"execution_id": execution_id, **result}
