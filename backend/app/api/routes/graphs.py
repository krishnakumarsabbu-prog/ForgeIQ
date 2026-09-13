from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.graph import Graph, GraphNode, GraphEdge, GraphNodeType
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/graphs", tags=["graphs"])


class NodeCreate(BaseModel):
    node_type: GraphNodeType
    label: str
    ref_id: Optional[str] = None
    config: dict = Field(default_factory=dict)
    position_x: float = 0.0
    position_y: float = 0.0
    description: str = ""


class EdgeCreate(BaseModel):
    source_node_id: str
    target_node_id: str
    label: str = ""
    condition: Optional[str] = None
    edge_type: str = "sequential"


class GraphCreate(BaseModel):
    name: str
    display_name: str = ""
    description: str = ""
    tenant_id: str = "tenant_forgeiq"


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
    g = Graph(
        tenant_id=body.tenant_id,
        id=gen_id("graph_"),
        name=body.name,
        display_name=body.display_name or body.name,
        description=body.description,
        version="v1",
        published=False,
        created_at=utc_now(),
    )
    store.graphs.add(g)
    return g


@router.post("/{graph_id}/nodes")
def add_node(graph_id: str, body: NodeCreate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    node = GraphNode(
        id=gen_id("node_"),
        node_type=body.node_type,
        label=body.label,
        ref_id=body.ref_id,
        config=body.config,
        position_x=body.position_x,
        position_y=body.position_y,
        description=body.description,
    )
    g.nodes.append(node)
    return g


@router.post("/{graph_id}/edges")
def add_edge(graph_id: str, body: EdgeCreate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    edge = GraphEdge(
        id=gen_id("edge_"),
        source_node_id=body.source_node_id,
        target_node_id=body.target_node_id,
        label=body.label,
        condition=body.condition,
        edge_type=body.edge_type,
    )
    g.edges.append(edge)
    return g


@router.put("/{graph_id}/nodes/{node_id}")
def update_node_position(graph_id: str, node_id: str, position_x: float = 0.0, position_y: float = 0.0):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    for n in g.nodes:
        if n.id == node_id:
            n.position_x = position_x
            n.position_y = position_y
            return n
    raise HTTPException(404, "Node not found")
