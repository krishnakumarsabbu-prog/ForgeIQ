"""GraphEngine — the real graph execution authority.

Responsibilities:
    Load graph version → validate → resolve entry nodes → resolve dependencies
    → execute nodes → handle conditions → handle branches → handle parallel
    → handle merge → handle failures → emit events.

Node execution dispatches to the appropriate runtime:
    Agent         → AgentRuntime
    Tool          → ToolRuntime
    Approval      → approval service (creates Approval record, blocks)
    Condition     → condition evaluator (evaluates config expression)
    Verification  → VerificationEngine
    Evidence      → EvidenceEngine

Node state machine:
    Pending → Ready → Running → (Succeeded | Failed | Skipped | Blocked | Waiting | Retrying)
"""

from __future__ import annotations

import asyncio
from typing import Optional, Any

from ..storage.in_memory import store
from ..domain.models.graph import (
    Graph, GraphNode, GraphNodeType, GraphEdgeType,
    GraphNodeStatus, GraphExecutionState, new_graph_execution_state,
)
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType, Approval, Execution
from ..domain.models.evidence import EvidenceType
from ..events.emit import emit_event
from .agent_runtime import AgentRuntime
from .tool_runtime import ToolRuntime
from .context_engine import ContextEngine
from .evidence_engine import EvidenceEngine
from .graph_validator import GraphValidator
from .verification_engine import VerificationEngine
from .policy_engine import PolicyEngine


class GraphEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.agent_runtime = AgentRuntime(tenant_id)
        self.tool_runtime = ToolRuntime(tenant_id)
        self.context_engine = ContextEngine(tenant_id)
        self.evidence_engine = EvidenceEngine(tenant_id)
        self.verification_engine = VerificationEngine(tenant_id)
        self.policy_engine = PolicyEngine(tenant_id)
        self.validator = GraphValidator()

    # ------------------------------------------------------------------
    # Graph resolution
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Dependency graph construction
    # ------------------------------------------------------------------

    def _build_adjacency(self, graph: Graph) -> tuple[dict[str, list[str]], dict[str, list[str]], dict[str, list[GraphEdgeType]]]:
        """Returns (forward_adj, reverse_adj, edge_types) keyed by source→[targets]."""
        forward: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
        reverse: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
        edge_map: dict[str, list[GraphEdgeType]] = {n.id: [] for n in graph.nodes}

        for edge in graph.edges:
            if edge.source_node_id in forward and edge.target_node_id in forward:
                forward[edge.source_node_id].append(edge.target_node_id)
                reverse[edge.target_node_id].append(edge.source_node_id)
                edge_map[edge.source_node_id].append(edge)

        return forward, reverse, edge_map

    def _resolve_entry_nodes(self, graph: Graph, reverse_adj: dict[str, list[str]]) -> list[GraphNode]:
        """Entry nodes: explicitly marked as entry, or nodes with no incoming edges."""
        explicit = [n for n in graph.nodes if n.is_entry]
        if explicit:
            return explicit
        return [n for n in graph.nodes if not reverse_adj.get(n.id)]

    def _get_outgoing_edges(self, graph: Graph, node_id: str) -> list:
        return [e for e in graph.edges if e.source_node_id == node_id]

    # ------------------------------------------------------------------
    # Condition evaluation
    # ------------------------------------------------------------------

    def _evaluate_condition(self, node: GraphNode, node_results: dict[str, dict]) -> tuple[bool, str]:
        """Evaluate a condition node's config expression against prior node results.

        Config supports:
            - {"expression": "all_succeeded"} — all predecessor nodes succeeded
            - {"expression": "any_succeeded"} — any predecessor succeeded
            - {"field": "<node_id>", "operator": "eq|ne|contains", "value": "..."}
            - {"expression": "custom", "code": "<python expr>"} — evaluated safely
        """
        config = node.config or {}
        expression = config.get("expression", "all_succeeded")

        predecessors = {
            nid: res for nid, res in node_results.items()
            if res and res.get("status") in ("succeeded", "completed", "passed")
        }

        if expression == "all_succeeded":
            return len(predecessors) == len(node_results), "all_succeeded"
        elif expression == "any_succeeded":
            return len(predecessors) > 0, "any_succeeded"
        elif expression == "custom":
            code = config.get("code", "True")
            try:
                result = eval(code, {"__builtins__": {}}, {"node_results": node_results})
                return bool(result), "custom"
            except Exception:
                return False, "custom_error"
        elif "field" in config:
            field_node_id = config["field"]
            operator = config.get("operator", "eq")
            expected = config.get("value", "")
            actual = str(node_results.get(field_node_id, {}).get("status", ""))
            if operator == "eq":
                return actual == expected, f"eq:{actual}=={expected}"
            elif operator == "ne":
                return actual != expected, f"ne:{actual}!={expected}"
            elif operator == "contains":
                return expected in str(node_results.get(field_node_id, {})), "contains"
            return False, f"unknown_operator:{operator}"

        return True, "default_true"

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def execute(
        self, graph_id: str, execution_id: str, harness_id: str,
        environment: str = "development",
        application_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
    ) -> dict:
        graph = self.get_graph(graph_id)
        if graph is None:
            return {"status": "failed", "error": "Graph not found"}

        # Validate graph before execution
        validation = self.validator.validate(graph)
        if not validation["valid"]:
            errors = [e["message"] for e in validation["errors"]]
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                harness_id=harness_id,
                message=f"Graph '{graph.display_name}' validation failed: {'; '.join(errors)}",
            )
            return {"status": "failed", "error": "Graph validation failed", "validation": validation}

        state = new_graph_execution_state(graph_id, execution_id, graph)
        state.status = "running"
        state.started_at = utc_now().isoformat()

        node_map = {n.id: n for n in graph.nodes}
        forward_adj, reverse_adj, _ = self._build_adjacency(graph)
        entry_nodes = self._resolve_entry_nodes(graph, reverse_adj)

        if not entry_nodes:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                harness_id=harness_id,
                message=f"Graph '{graph.display_name}' has no entry nodes",
            )
            return {"status": "failed", "error": "No entry nodes found"}

        node_results: dict[str, dict] = {}
        completed: set[str] = set()
        failed: set[str] = set()
        skipped: set[str] = set()
        waiting: set[str] = set()
        blocked: set[str] = set()

        # Mark entry nodes as ready
        ready: set[str] = set()
        for node in entry_nodes:
            state.node_states[node.id] = GraphNodeStatus.READY.value
            ready.add(node.id)

        emit_event(
            execution_id=execution_id,
            event_type=EventType.GRAPH_NODE_STARTED,
            harness_id=harness_id,
            message=f"Graph '{graph.display_name}' execution started with {len(entry_nodes)} entry node(s)",
            data={"entry_nodes": [n.label for n in entry_nodes], "total_nodes": len(graph.nodes)},
        )

        max_rounds = len(graph.nodes) * 2 + 10
        round_num = 0

        while ready and round_num < max_rounds:
            round_num += 1

            # Gather all ready nodes for this round
            current_batch = list(ready)
            ready.clear()

            # Check if this is a parallel fan-out group
            parallel_group = self._detect_parallel_group(current_batch, node_map)

            if parallel_group and len(current_batch) > 1:
                # Execute in parallel
                state.node_states.update({nid: GraphNodeStatus.RUNNING.value for nid in current_batch})
                tasks = [
                    self._execute_node(
                        node_map[nid], execution_id, harness_id, environment,
                        application_id, requirement_id, node_results,
                    )
                    for nid in current_batch
                ]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                for nid, result in zip(current_batch, results):
                    node = node_map[nid]
                    if isinstance(result, Exception):
                        node_results[nid] = {"status": "failed", "error": str(result)}
                        state.node_states[nid] = GraphNodeStatus.FAILED.value
                        state.failed_node_ids.append(nid)
                        failed.add(nid)
                        emit_event(
                            execution_id=execution_id,
                            event_type=EventType.EXECUTION_FAILED,
                            node_id=nid,
                            message=f"Node '{node.label}' raised exception: {result}",
                        )
                    else:
                        node_results[nid] = result
                        self._process_node_result(
                            nid, result, state, completed, failed, waiting, blocked,
                        )
            else:
                # Execute sequentially
                for nid in current_batch:
                    node = node_map[nid]
                    state.node_states[nid] = GraphNodeStatus.RUNNING.value
                    state.active_node_id = nid

                    try:
                        result = await self._execute_node(
                            node, execution_id, harness_id, environment,
                            application_id, requirement_id, node_results,
                        )
                    except Exception as exc:
                        result = {"status": "failed", "error": str(exc)}

                    node_results[nid] = result
                    self._process_node_result(
                        nid, result, state, completed, failed, waiting, blocked,
                    )

                    # If node failed and has failure edges, follow them
                    # If node succeeded, follow success edges
                    # If node is waiting/blocked, don't advance past it

            # Resolve next ready nodes based on completed nodes
            self._advance_ready_nodes(
                graph, node_map, forward_adj, reverse_adj,
                completed, failed, waiting, blocked, skipped,
                node_results, state, ready,
            )

        # Determine final status
        state.active_node_id = None

        has_failures = len(failed) > 0
        has_waiting = len(waiting) > 0

        if has_waiting and not has_failures:
            state.status = "waiting"
        elif has_failures:
            # Check if all failures had failure handlers
            unhandled_failures = [nid for nid in failed if nid not in completed]
            state.status = "failed" if unhandled_failures else "completed"
        else:
            state.status = "completed"

        state.completed_at = utc_now().isoformat()

        emit_event(
            execution_id=execution_id,
            event_type=EventType.GRAPH_NODE_COMPLETED,
            harness_id=harness_id,
            message=f"Graph '{graph.display_name}' execution {state.status}: {len(completed)} succeeded, {len(failed)} failed, {len(skipped)} skipped",
            data={
                "status": state.status,
                "nodes_succeeded": len(completed),
                "nodes_failed": len(failed),
                "nodes_skipped": len(skipped),
                "nodes_waiting": len(waiting),
            },
        )

        return {
            "status": state.status,
            "nodes_executed": len(node_results),
            "nodes_succeeded": len(completed),
            "nodes_failed": len(failed),
            "nodes_skipped": len(skipped),
            "nodes_waiting": len(waiting),
            "results": node_results,
            "execution_state": state.model_dump(),
        }

    # ------------------------------------------------------------------
    # Node result processing
    # ------------------------------------------------------------------

    def _process_node_result(
        self,
        node_id: str,
        result: dict,
        state: GraphExecutionState,
        completed: set[str],
        failed: set[str],
        waiting: set[str],
        blocked: set[str],
    ) -> None:
        status = result.get("status", "failed")

        if status in ("succeeded", "completed", "passed", "success"):
            state.node_states[node_id] = GraphNodeStatus.SUCCEEDED.value
            state.completed_node_ids.append(node_id)
            completed.add(node_id)
        elif status in ("awaiting_approval", "waiting"):
            state.node_states[node_id] = GraphNodeStatus.WAITING.value
            state.blocked_node_ids.append(node_id)
            waiting.add(node_id)
        elif status == "blocked":
            state.node_states[node_id] = GraphNodeStatus.BLOCKED.value
            state.blocked_node_ids.append(node_id)
            blocked.add(node_id)
        elif status == "skipped":
            state.node_states[node_id] = GraphNodeStatus.SKIPPED.value
            state.skipped_node_ids.append(node_id)
            skipped.add(node_id)
        elif status in ("failed", "timed_out", "error"):
            state.node_states[node_id] = GraphNodeStatus.FAILED.value
            state.failed_node_ids.append(node_id)
            failed.add(node_id)
        else:
            state.node_states[node_id] = GraphNodeStatus.SUCCEEDED.value
            state.completed_node_ids.append(node_id)
            completed.add(node_id)

    # ------------------------------------------------------------------
    # Advance ready nodes
    # ------------------------------------------------------------------

    def _advance_ready_nodes(
        self,
        graph: Graph,
        node_map: dict[str, GraphNode],
        forward_adj: dict[str, list[str]],
        reverse_adj: dict[str, list[str]],
        completed: set[str],
        failed: set[str],
        waiting: set[str],
        blocked: set[str],
        skipped: set[str],
        node_results: dict[str, dict],
        state: GraphExecutionState,
        ready: set[str],
    ) -> None:
        processed = completed | failed | skipped | waiting | blocked

        for node_id in list(processed):
            node = node_map.get(node_id)
            if node is None:
                continue

            outgoing_edges = self._get_outgoing_edges(graph, node_id)
            if not outgoing_edges:
                continue

            node_succeeded = node_id in completed
            node_failed = node_id in failed

            for edge in outgoing_edges:
                target_id = edge.target_node_id
                if target_id in processed or target_id in ready:
                    continue

                target_node = node_map.get(target_id)
                if target_node is None:
                    continue

                # Determine if this edge should be followed
                should_follow = False

                if edge.is_failure_path or edge.edge_type == GraphEdgeType.FAILURE:
                    # Only follow failure edges when source node failed
                    should_follow = node_failed
                elif edge.edge_type == GraphEdgeType.CONDITIONAL:
                    # Conditional edges follow based on edge.condition
                    if node_succeeded:
                        condition_expr = edge.condition or ""
                        if not condition_expr:
                            should_follow = True
                        else:
                            should_follow = self._evaluate_edge_condition(
                                condition_expr, node_results.get(node_id, {})
                            )
                else:
                    # Sequential and parallel edges follow on success
                    should_follow = node_succeeded

                if not should_follow:
                    continue

                # Check if target node is a merge node — requires all predecessors done
                if target_node.node_type == GraphNodeType.MERGE:
                    predecessors = reverse_adj.get(target_id, [])
                    all_predecessors_done = all(
                        p in completed or p in failed or p in skipped
                        for p in predecessors
                    )
                    if not all_predecessors_done:
                        continue

                # Check if target node is a condition/decision — needs all predecessors done
                if target_node.node_type in (GraphNodeType.CONDITION, GraphNodeType.DECISION):
                    predecessors = reverse_adj.get(target_id, [])
                    all_predecessors_done = all(
                        p in completed or p in failed or p in skipped
                        for p in predecessors
                    )
                    if not all_predecessors_done:
                        continue

                # Check all non-failure predecessors have completed
                non_failure_predecessors = [
                    p for p in reverse_adj.get(target_id, [])
                    if not any(
                        e.is_failure_path or e.edge_type == GraphEdgeType.FAILURE
                        for e in graph.edges
                        if e.source_node_id == p and e.target_node_id == target_id
                    )
                ]
                if non_failure_predecessors:
                    all_done = all(
                        p in completed or p in failed or p in skipped
                        for p in non_failure_predecessors
                    )
                    if not all_done:
                        continue

                state.node_states[target_id] = GraphNodeStatus.READY.value
                ready.add(target_id)

        # If no new ready nodes but we have failures with failure handlers,
        # try to advance failure handler nodes
        if not ready and failed:
            for node_id in failed:
                outgoing = self._get_outgoing_edges(graph, node_id)
                for edge in outgoing:
                    if edge.is_failure_path or edge.edge_type == GraphEdgeType.FAILURE:
                        target_id = edge.target_node_id
                        if target_id not in processed and target_id not in ready:
                            state.node_states[target_id] = GraphNodeStatus.READY.value
                            ready.add(target_id)

    def _evaluate_edge_condition(self, condition: str, source_result: dict) -> bool:
        """Evaluate a simple edge condition string against the source node result."""
        if condition == "success" or condition == "passed":
            return source_result.get("status") in ("succeeded", "completed", "passed", "success")
        if condition == "failure" or condition == "failed":
            return source_result.get("status") in ("failed", "error", "timed_out")
        if condition == "always":
            return True
        # Check if condition matches a key in the result
        if condition in source_result:
            return bool(source_result[condition])
        # Default: follow the edge
        return True

    def _detect_parallel_group(self, node_ids: list[str], node_map: dict[str, GraphNode]) -> bool:
        """Check if all nodes in the batch share a common PARALLEL predecessor."""
        if len(node_ids) <= 1:
            return False
        # If any node is explicitly PARALLEL type, treat as parallel group
        for nid in node_ids:
            node = node_map.get(nid)
            if node and node.node_type == GraphNodeType.PARALLEL:
                return True
        return False

    # ------------------------------------------------------------------
    # Node execution
    # ------------------------------------------------------------------

    async def _execute_node(
        self, node: GraphNode, execution_id: str, harness_id: str,
        environment: str, application_id: Optional[str], requirement_id: Optional[str],
        node_results: dict[str, dict],
    ) -> dict:
        emit_event(
            execution_id=execution_id,
            event_type=EventType.GRAPH_NODE_STARTED,
            node_id=node.id,
            harness_id=harness_id,
            message=f"Node '{node.label}' ({node.node_type.value}) started",
            data={"node_type": node.node_type.value, "label": node.label},
        )

        try:
            result = await self._dispatch_node(
                node, execution_id, harness_id, environment,
                application_id, requirement_id, node_results,
            )
        except Exception as exc:
            result = {"status": "failed", "error": str(exc), "node": node.label}

        emit_event(
            execution_id=execution_id,
            event_type=EventType.GRAPH_NODE_COMPLETED,
            node_id=node.id,
            harness_id=harness_id,
            message=f"Node '{node.label}' ({node.node_type.value}) → {result.get('status', 'unknown')}",
            data={"node_type": node.node_type.value, "result_status": result.get("status")},
        )

        return result

    async def _dispatch_node(
        self, node: GraphNode, execution_id: str, harness_id: str,
        environment: str, application_id: Optional[str], requirement_id: Optional[str],
        node_results: dict[str, dict],
    ) -> dict:
        node_type = node.node_type

        # ── AGENT ──────────────────────────────────────────────────────
        if node_type == GraphNodeType.AGENT and node.ref_id:
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
            return agent_result

        # ── TOOL ───────────────────────────────────────────────────────
        if node_type == GraphNodeType.TOOL and node.ref_id:
            operation = node.config.get("operation", "execute")
            tool_result = await self.tool_runtime.execute(
                tool_id=node.ref_id, operation=operation,
                params=node.config.get("params", {}),
                execution_id=execution_id, environment=environment,
                node_id=node.id, harness_id=harness_id,
            )
            return tool_result

        # ── APPROVAL ───────────────────────────────────────────────────
        if node_type == GraphNodeType.APPROVAL:
            approval = Approval(
                tenant_id=self.tenant_id,
                id=gen_id("appr_"),
                execution_id=execution_id,
                node_id=node.id,
                harness_id=harness_id,
                requested_by="graph_engine",
                status="pending",
                risk_level=node.config.get("risk_level", "MEDIUM"),
            )
            store.approvals.add(approval)

            execution = store.executions.get(execution_id)
            if execution:
                execution.approval_ids.append(approval.id)

            emit_event(
                execution_id=execution_id,
                event_type=EventType.APPROVAL_REQUESTED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Approval requested at node '{node.label}' (risk: {approval.risk_level})",
                data={"approval_id": approval.id, "risk_level": approval.risk_level},
            )
            return {"status": "awaiting_approval", "approval_id": approval.id, "node": node.label}

        # ── HUMAN_TASK ─────────────────────────────────────────────────
        if node_type == GraphNodeType.HUMAN_TASK:
            approval = Approval(
                tenant_id=self.tenant_id,
                id=gen_id("appr_"),
                execution_id=execution_id,
                node_id=node.id,
                harness_id=harness_id,
                requested_by="graph_engine",
                status="pending",
                risk_level=node.config.get("risk_level", "MEDIUM"),
            )
            store.approvals.add(approval)

            execution = store.executions.get(execution_id)
            if execution:
                execution.approval_ids.append(approval.id)

            emit_event(
                execution_id=execution_id,
                event_type=EventType.APPROVAL_REQUESTED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Human task '{node.label}' waiting for input",
                data={"approval_id": approval.id},
            )
            return {"status": "awaiting_approval", "approval_id": approval.id, "node": node.label}

        # ── CONDITION / DECISION ───────────────────────────────────────
        if node_type in (GraphNodeType.CONDITION, GraphNodeType.DECISION):
            condition_met, reason = self._evaluate_condition(node, node_results)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EVALUATION_COMPLETED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Condition '{node.label}' evaluated: {condition_met} ({reason})",
                data={"condition_met": condition_met, "reason": reason},
            )
            return {
                "status": "succeeded",
                "condition_met": condition_met,
                "condition_reason": reason,
                "node": node.label,
            }

        # ── VERIFICATION ───────────────────────────────────────────────
        if node_type == GraphNodeType.VERIFICATION:
            deployment_id = node.config.get("deployment_id")
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EVALUATION_STARTED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Verification at node '{node.label}'",
                data={"deployment_id": deployment_id},
            )
            if deployment_id:
                verify_result = await self.verification_engine.verify_deployment(
                    deployment_id, execution_id, node.id,
                )
            else:
                # Generic verification — check predecessor results
                checks = []
                for nid, res in node_results.items():
                    checks.append({
                        "node": nid,
                        "status": res.get("status", "unknown"),
                    })
                all_passed = all(
                    c["status"] in ("succeeded", "completed", "passed", "success")
                    for c in checks
                ) if checks else True
                verify_result = {
                    "status": "passed" if all_passed else "failed",
                    "checks": checks,
                }

            emit_event(
                execution_id=execution_id,
                event_type=EventType.EVALUATION_COMPLETED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Verification '{node.label}': {verify_result.get('status', 'unknown')}",
                data=verify_result,
            )
            return verify_result

        # ── EVIDENCE ───────────────────────────────────────────────────
        if node_type == GraphNodeType.EVIDENCE:
            evidence = self.evidence_engine.create_evidence(
                execution_id=execution_id,
                evidence_type=EvidenceType.GRAPH,
                harness_id=harness_id,
                inputs=node.config.get("inputs", {}),
                outputs={"node": node.label, "prior_results": node_results},
                summary=f"Evidence collected at node '{node.label}'",
                node_id=node.id,
            )
            return {"status": "succeeded", "evidence_id": evidence.id, "node": node.label}

        # ── POLICY ─────────────────────────────────────────────────────
        if node_type == GraphNodeType.POLICY:
            pol_ok, applied = self.policy_engine.evaluate(
                scope=node.config.get("scope", "harness"),
                target_id=node.config.get("target_id", harness_id),
                context={"environment": environment},
                execution_id=execution_id,
                node_id=node.id,
            )
            if not pol_ok:
                return {"status": "failed", "error": "Policy check failed", "policies": applied}
            return {"status": "succeeded", "policies_applied": applied, "node": node.label}

        # ── PARALLEL ───────────────────────────────────────────────────
        if node_type == GraphNodeType.PARALLEL:
            # Parallel node itself is a fan-out marker; execution of children
            # is handled by the main loop when it detects parallel groups.
            return {"status": "succeeded", "node": node.label, "fan_out": True}

        # ── MERGE ─────────────────────────────────────────────────────
        if node_type == GraphNodeType.MERGE:
            # Merge node is a fan-in marker; it collects results from all
            # predecessor nodes that have completed.
            merged = {
                nid: res for nid, res in node_results.items()
                if res
            }
            return {"status": "succeeded", "node": node.label, "merged_count": len(merged)}

        # ── RETRY ──────────────────────────────────────────────────────
        if node_type == GraphNodeType.RETRY:
            max_retries = node.config.get("max_retries", 3)
            target_node_id = node.config.get("target_node_id")
            if not target_node_id:
                return {"status": "succeeded", "node": node.label, "skipped": True}

            target_result = node_results.get(target_node_id, {})
            if target_result.get("status") in ("succeeded", "completed", "passed", "success"):
                return {"status": "succeeded", "node": node.label, "target_succeeded": True}

            # If we get here, the target failed and retry is needed
            # The actual retry loop is handled by LoopEngine integration at the
            # harness level. Here we just signal that a retry is needed.
            return {
                "status": "failed",
                "node": node.label,
                "retry_needed": True,
                "target_node_id": target_node_id,
                "max_retries": max_retries,
            }

        # ── FAILURE_HANDLER ────────────────────────────────────────────
        if node_type == GraphNodeType.FAILURE_HANDLER:
            handler_type = node.config.get("handler_type", "log")
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Failure handler '{node.label}' activated (type: {handler_type})",
                data={"handler_type": handler_type},
            )
            self.evidence_engine.create_evidence(
                execution_id=execution_id,
                evidence_type=EvidenceType.GRAPH,
                harness_id=harness_id,
                inputs={"handler_type": handler_type, "failed_nodes": [
                    nid for nid, res in node_results.items()
                    if res and res.get("status") in ("failed", "error", "timed_out")
                ]},
                outputs={"handled": True},
                summary=f"Failure handler '{node.label}' processed failures",
                node_id=node.id,
            )
            return {"status": "succeeded", "node": node.label, "handler_type": handler_type}

        # ── ESCALATION ─────────────────────────────────────────────────
        if node_type == GraphNodeType.ESCALATION:
            escalation_type = node.config.get("escalation_type", "human_approval")
            approval = Approval(
                tenant_id=self.tenant_id,
                id=gen_id("appr_"),
                execution_id=execution_id,
                node_id=node.id,
                harness_id=harness_id,
                requested_by="graph_engine",
                status="pending",
                risk_level="HIGH",
            )
            store.approvals.add(approval)

            emit_event(
                execution_id=execution_id,
                event_type=EventType.APPROVAL_REQUESTED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Escalation '{node.label}' (type: {escalation_type}) — approval required",
                data={"approval_id": approval.id, "escalation_type": escalation_type},
            )
            return {"status": "awaiting_approval", "approval_id": approval.id, "escalation_type": escalation_type}

        # ── ENVIRONMENT ────────────────────────────────────────────────
        if node_type == GraphNodeType.ENVIRONMENT:
            env_name = node.config.get("environment", environment)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.GRAPH_NODE_STARTED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Environment node '{node.label}' — executing in '{env_name}'",
                data={"environment": env_name},
            )
            return {"status": "succeeded", "node": node.label, "environment": env_name}

        # ── ARTIFACT ───────────────────────────────────────────────────
        if node_type == GraphNodeType.ARTIFACT:
            artifact_type = node.config.get("artifact_type", "generic")
            self.evidence_engine.create_evidence(
                execution_id=execution_id,
                evidence_type=EvidenceType.GRAPH,
                harness_id=harness_id,
                inputs={"artifact_type": artifact_type},
                outputs=node.config.get("artifact_data", {}),
                summary=f"Artifact '{node.label}' (type: {artifact_type}) produced",
                node_id=node.id,
            )
            return {"status": "succeeded", "node": node.label, "artifact_type": artifact_type}

        # ── SKILL ──────────────────────────────────────────────────────
        if node_type == GraphNodeType.SKILL and node.ref_id:
            skill = store.skills.get(node.ref_id)
            if skill is None:
                return {"status": "failed", "error": f"Skill '{node.ref_id}' not found"}
            emit_event(
                execution_id=execution_id,
                event_type=EventType.GRAPH_NODE_STARTED,
                node_id=node.id,
                harness_id=harness_id,
                message=f"Skill '{skill.display_name}' applied at node '{node.label}'",
                data={"skill_id": node.ref_id, "language": skill.language},
            )
            return {"status": "succeeded", "node": node.label, "skill": skill.display_name}

        # ── DEFAULT (unknown node type) ────────────────────────────────
        return {"status": "succeeded", "node": node.label, "node_type": node_type.value}
