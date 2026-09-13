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


class NodeUpdate(BaseModel):
    node_type: Optional[GraphNodeType] = None
    label: Optional[str] = None
    ref_id: Optional[str] = None
    config: Optional[dict] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    description: Optional[str] = None


class EdgeUpdate(BaseModel):
    label: Optional[str] = None
    condition: Optional[str] = None
    edge_type: Optional[str] = None


class GraphFullUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[list[dict]] = None
    edges: Optional[list[dict]] = None


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
    g.touch()
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


@router.put("/{graph_id}/nodes/{node_id}")
def update_node(graph_id: str, node_id: str, body: NodeUpdate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    for n in g.nodes:
        if n.id == node_id:
            if body.node_type is not None:
                n.node_type = body.node_type
            if body.label is not None:
                n.label = body.label
            if body.ref_id is not None:
                n.ref_id = body.ref_id
            if body.config is not None:
                n.config = body.config
            if body.position_x is not None:
                n.position_x = body.position_x
            if body.position_y is not None:
                n.position_y = body.position_y
            if body.description is not None:
                n.description = body.description
            return n
    raise HTTPException(404, "Node not found")


@router.delete("/{graph_id}/nodes/{node_id}")
def delete_node(graph_id: str, node_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    g.nodes = [n for n in g.nodes if n.id != node_id]
    g.edges = [e for e in g.edges if e.source_node_id != node_id and e.target_node_id != node_id]
    return {"deleted": True}


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


@router.put("/{graph_id}/edges/{edge_id}")
def update_edge(graph_id: str, edge_id: str, body: EdgeUpdate):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    for e in g.edges:
        if e.id == edge_id:
            if body.label is not None:
                e.label = body.label
            if body.condition is not None:
                e.condition = body.condition
            if body.edge_type is not None:
                e.edge_type = body.edge_type
            return e
    raise HTTPException(404, "Edge not found")


@router.delete("/{graph_id}/edges/{edge_id}")
def delete_edge(graph_id: str, edge_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")
    g.edges = [e for e in g.edges if e.id != edge_id]
    return {"deleted": True}


@router.get("/{graph_id}/validate")
def validate_graph(graph_id: str):
    g = store.graphs.get(graph_id)
    if not g:
        raise HTTPException(404, "Graph not found")

    diagnostics: list[dict] = []
    node_ids = {n.id for n in g.nodes}
    node_map = {n.id: n for n in g.nodes}

    # Disconnected nodes (no edges at all)
    connected_ids: set[str] = set()
    for e in g.edges:
        connected_ids.add(e.source_node_id)
        connected_ids.add(e.target_node_id)
    for n in g.nodes:
        if n.id not in connected_ids and len(g.nodes) > 1:
            diagnostics.append({
                "severity": "warning",
                "code": "DISCONNECTED_NODE",
                "message": f"Node '{n.label}' is disconnected (no incoming or outgoing edges)",
                "node_id": n.id,
            })

    # Missing ref_id for agent/tool/skill nodes
    for n in g.nodes:
        if n.node_type in (GraphNodeType.AGENT, GraphNodeType.TOOL, GraphNodeType.SKILL) and not n.ref_id:
            diagnostics.append({
                "severity": "error",
                "code": "MISSING_REF",
                "message": f"Node '{n.label}' ({n.node_type.value}) has no {n.node_type.value} reference",
                "node_id": n.id,
            })

    # Circular dependency detection
    adj: dict[str, list[str]] = {n.id: [] for n in g.nodes}
    for e in g.edges:
        if e.source_node_id in adj:
            adj[e.source_node_id].append(e.target_node_id)

    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in node_ids}

    def dfs(u: str) -> bool:
        color[u] = GRAY
        for v in adj.get(u, []):
            if v not in color:
                continue
            if color[v] == GRAY:
                diagnostics.append({
                    "severity": "error",
                    "code": "CIRCULAR_DEPENDENCY",
                    "message": f"Circular dependency detected involving '{node_map.get(u, u).label if u in node_map else u}'",
                    "node_id": u,
                })
                return True
            if color[v] == WHITE and dfs(v):
                return True
        color[u] = BLACK
        return False

    for nid in node_ids:
        if color[nid] == WHITE:
            dfs(nid)

    # Unreachable nodes (no incoming edge, not a start node)
    has_incoming = set()
    for e in g.edges:
        has_incoming.add(e.target_node_id)
    start_nodes = [n for n in g.nodes if n.id not in has_incoming]
    if start_nodes and len(g.nodes) > 1:
        reachable = set()
        for sn in start_nodes:
            stack = [sn.id]
            while stack:
                cur = stack.pop()
                if cur in reachable:
                    continue
                reachable.add(cur)
                for child in adj.get(cur, []):
                    if child not in reachable:
                        stack.append(child)
        for n in g.nodes:
            if n.id not in reachable and n.id not in {sn.id for sn in start_nodes}:
                diagnostics.append({
                    "severity": "warning",
                    "code": "UNREACHABLE_NODE",
                    "message": f"Node '{n.label}' is unreachable from any start node",
                    "node_id": n.id,
                })

    # Missing permissions on tool nodes
    for n in g.nodes:
        if n.node_type == GraphNodeType.TOOL:
            perms = n.config.get("permissions", [])
            if not perms:
                diagnostics.append({
                    "severity": "warning",
                    "code": "MISSING_PERMISSIONS",
                    "message": f"Tool node '{n.label}' has no permissions configured",
                    "node_id": n.id,
                })

    # Missing evidence requirements
    has_evidence = any(n.node_type == GraphNodeType.EVIDENCE for n in g.nodes)
    if not has_evidence and len(g.nodes) > 0:
        diagnostics.append({
            "severity": "warning",
            "code": "MISSING_EVIDENCE",
            "message": "Graph has no evidence node - execution will not produce graph-level evidence",
        })

    # Invalid edges (referencing non-existent nodes)
    for e in g.edges:
        if e.source_node_id not in node_ids:
            diagnostics.append({
                "severity": "error",
                "code": "INVALID_EDGE_SOURCE",
                "message": f"Edge {e.id} references non-existent source node '{e.source_node_id}'",
                "edge_id": e.id,
            })
        if e.target_node_id not in node_ids:
            diagnostics.append({
                "severity": "error",
                "code": "INVALID_EDGE_TARGET",
                "message": f"Edge {e.id} references non-existent target node '{e.target_node_id}'",
                "edge_id": e.id,
            })

    errors = [d for d in diagnostics if d["severity"] == "error"]
    warnings = [d for d in diagnostics if d["severity"] == "warning"]
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "diagnostics": diagnostics,
        "node_count": len(g.nodes),
        "edge_count": len(g.edges),
    }
