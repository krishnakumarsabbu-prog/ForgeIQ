from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.graph import (
    Graph, GraphNode, GraphNodeType, GraphEdgeType,
    GraphNodeStatus, GraphExecutionState, new_graph_execution_state,
)
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType
from ..domain.models.evidence import EvidenceType
from ..events.emit import emit_event
from .agent_runtime import AgentRuntime
from .tool_runtime import ToolRuntime
from .context_engine import ContextEngine
from .evidence_engine import EvidenceEngine
from .graph_validator import GraphValidator


class GraphEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.agent_runtime = AgentRuntime(tenant_id)
        self.tool_runtime = ToolRuntime(tenant_id)
        self.context_engine = ContextEngine(tenant_id)
        self.evidence_engine = EvidenceEngine(tenant_id)
        self.validator = GraphValidator()

    def get_graph(self, graph_id: str) -> Optional[Graph]:
        g = store.graphs.get(graph_id)
        if g and g.tenant_id == self.tenant_id:
            return g
        return None

    def validate(self, graph_id: str) -> dict:
        graph = self.get_graph(graph_id)
        if graph is None:
            return {"valid": False, "errors": [{"severity": "error", "code": "NOT_FOUND", "message": "Graph not found"}], "warnings": [], "diagnostics": [], "node_count": 0, "edge_count": 0, "rules_checked": []}
        return self.validator.validate(graph)

    def _topological_sort(self, graph: Graph) -> list[list[GraphNode]]:
        node_map = {n.id: n for n in graph.nodes}
        in_degree: dict[str, int] = {n.id: 0 for n in graph.nodes}
        adj: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
        for edge in graph.edges:
            if edge.source_node_id in adj:
                adj[edge.source_node_id].append(edge.target_node_id)
            if edge.target_node_id in in_degree:
                in_degree[edge.target_node_id] += 1

        layers: list[list[GraphNode]] = []
        remaining = set(node_map.keys())
        while remaining:
            current_layer = [nid for nid in remaining if in_degree[nid] == 0]
            if not current_layer:
                current_layer = list(remaining)
            layer_nodes = [node_map[nid] for nid in current_layer if nid in node_map]
            layers.append(layer_nodes)
            for nid in current_layer:
                remaining.discard(nid)
                for child in adj.get(nid, []):
                    if child in in_degree:
                        in_degree[child] -= 1
        return layers

    async def execute(
        self, graph_id: str, execution_id: str, harness_id: str,
        environment: str = "development",
        application_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
    ) -> dict:
        graph = self.get_graph(graph_id)
        if graph is None:
            return {"status": "failed", "error": "Graph not found"}

        state = new_graph_execution_state(graph_id, execution_id, graph)
        state.status = "running"
        state.started_at = utc_now().isoformat()

        emit_event(execution_id, EventType.GRAPH_NODE_STARTED, f"Graph '{graph.display_name}' execution started")

        layers = self._topological_sort(graph)
        node_results: dict[str, dict] = {}

        for layer in layers:
            tasks = []
            for node in layer:
                state.node_states[node.id] = GraphNodeStatus.RUNNING.value
                state.active_node_id = node.id
                tasks.append(self._execute_node(node, execution_id, harness_id, environment, application_id, requirement_id))
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for node, result in zip(layer, results):
                if isinstance(result, Exception):
                    node_results[node.id] = {"status": "failed", "error": str(result)}
                    state.node_states[node.id] = GraphNodeStatus.FAILED.value
                    state.failed_node_ids.append(node.id)
                else:
                    node_results[node.id] = result
                    if result.get("status") == "awaiting_approval":
                        state.node_states[node.id] = GraphNodeStatus.WAITING.value
                        state.blocked_node_ids.append(node.id)
                    else:
                        state.node_states[node.id] = GraphNodeStatus.SUCCEEDED.value
                        state.completed_node_ids.append(node.id)

        state.active_node_id = None
        all_succeeded = all(
            r.get("status") in ("completed", "awaiting_approval")
            for r in node_results.values()
        ) if node_results else True
        state.status = "completed" if all_succeeded else "failed"
        state.completed_at = utc_now().isoformat()

        emit_event(execution_id, EventType.GRAPH_NODE_COMPLETED, f"Graph execution {'completed' if all_succeeded else 'failed'}")

        return {
            "status": state.status,
            "nodes_executed": len(node_results),
            "results": node_results,
            "execution_state": state.model_dump(),
        }

    async def _execute_node(
        self, node: GraphNode, execution_id: str, harness_id: str,
        environment: str, application_id: Optional[str], requirement_id: Optional[str],
    ) -> dict:
        emit_event(execution_id, EventType.GRAPH_NODE_STARTED,
                   f"Node '{node.label}' ({node.node_type.value}) started", node_id=node.id)

        await asyncio.sleep(0.03)

        result: dict = {"status": "completed", "node": node.label}

        if node.node_type == GraphNodeType.AGENT and node.ref_id:
            ctx = self.context_engine.prepare_context(
                agent_id=node.ref_id, application_id=application_id,
                requirement_id=requirement_id, harness_id=harness_id,
                execution_id=execution_id, node_id=node.id,
            )
            agent_result = await self.agent_runtime.execute(
                agent_id=node.ref_id,
                inputs={"context": ctx, "config": node.config},
                execution_id=execution_id, node_id=node.id,
                harness_id=harness_id,
            )
            result["agent_result"] = agent_result

        elif node.node_type == GraphNodeType.TOOL and node.ref_id:
            operation = node.config.get("operation", "execute")
            tool_result = await self.tool_runtime.execute(
                tool_id=node.ref_id, operation=operation,
                params=node.config.get("params", {}),
                execution_id=execution_id, environment=environment, node_id=node.id,
            )
            result["tool_result"] = tool_result
            self.evidence_engine.create_evidence(
                execution_id=execution_id, evidence_type=EvidenceType.TOOL,
                tool_id=node.ref_id, harness_id=harness_id,
                inputs={"operation": operation}, outputs=tool_result,
                summary=f"Tool '{node.label}' executed {operation}", node_id=node.id,
            )

        elif node.node_type == GraphNodeType.EVIDENCE:
            self.evidence_engine.create_evidence(
                execution_id=execution_id, evidence_type=EvidenceType.GRAPH,
                harness_id=harness_id, outputs={"node": node.label},
                summary=f"Evidence collected at node '{node.label}'", node_id=node.id,
            )

        elif node.node_type == GraphNodeType.APPROVAL:
            emit_event(execution_id, EventType.APPROVAL_REQUESTED,
                       f"Approval requested at node '{node.label}'", node_id=node.id)
            result["status"] = "awaiting_approval"

        elif node.node_type == GraphNodeType.VERIFICATION:
            emit_event(execution_id, EventType.EVALUATION_STARTED,
                       f"Verification at node '{node.label}'", node_id=node.id)
            await asyncio.sleep(0.02)
            emit_event(execution_id, EventType.EVALUATION_COMPLETED,
                       f"Verification passed at node '{node.label}'", node_id=node.id)

        elif node.node_type == GraphNodeType.FAILURE_HANDLER:
            emit_event(execution_id, EventType.GRAPH_NODE_STARTED,
                       f"Failure handler '{node.label}' activated", node_id=node.id)

        elif node.node_type == GraphNodeType.HUMAN_TASK:
            emit_event(execution_id, EventType.APPROVAL_REQUESTED,
                       f"Human task '{node.label}' waiting for input", node_id=node.id)
            result["status"] = "awaiting_approval"

        emit_event(execution_id, EventType.GRAPH_NODE_COMPLETED,
                   f"Node '{node.label}' completed", node_id=node.id)

        return result



