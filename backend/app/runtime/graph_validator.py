from __future__ import annotations

from ..domain.models.graph import Graph, GraphNode, GraphNodeType, GraphEdgeType


class GraphValidator:
    VALIDATION_RULES = [
        "UNREACHABLE_NODES",
        "MISSING_ENTRY_NODE",
        "MULTIPLE_INVALID_TERMINAL_NODES",
        "BROKEN_EDGES",
        "MISSING_INPUT",
        "MISSING_OUTPUT",
        "CIRCULAR_DEPENDENCY",
        "INVALID_BRANCH",
        "INVALID_MERGE",
        "FAILURE_PATH_MISSING",
        "APPROVAL_PATH_MISSING",
    ]

    def validate(self, graph: Graph) -> dict:
        if graph is None:
            return {
                "valid": False,
                "errors": [{"severity": "error", "code": "NULL_GRAPH", "message": "Graph is None"}],
                "warnings": [],
                "diagnostics": [{"severity": "error", "code": "NULL_GRAPH", "message": "Graph is None"}],
                "node_count": 0,
                "edge_count": 0,
                "rules_checked": [],
            }
        diagnostics: list[dict] = []
        node_ids = {n.id for n in graph.nodes}
        node_map = {n.id: n for n in graph.nodes}

        adj: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
        reverse_adj: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
        for e in graph.edges:
            if e.source_node_id in adj:
                adj[e.source_node_id].append(e.target_node_id)
            if e.target_node_id in reverse_adj:
                reverse_adj[e.target_node_id].append(e.source_node_id)

        self._check_broken_edges(graph, node_ids, diagnostics)
        self._check_missing_entry(graph, diagnostics)
        self._check_circular_dependency(graph, node_ids, node_map, adj, diagnostics)
        self._check_unreachable(graph, node_ids, node_map, adj, diagnostics)
        self._check_terminal_nodes(graph, diagnostics)
        self._check_missing_input_output(graph, node_map, diagnostics)
        self._check_invalid_branch(graph, node_map, adj, diagnostics)
        self._check_invalid_merge(graph, node_map, reverse_adj, diagnostics)
        self._check_failure_path(graph, node_map, diagnostics)
        self._check_approval_path(graph, node_map, adj, diagnostics)

        errors = [d for d in diagnostics if d["severity"] == "error"]
        warnings = [d for d in diagnostics if d["severity"] == "warning"]
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "diagnostics": diagnostics,
            "node_count": len(graph.nodes),
            "edge_count": len(graph.edges),
            "rules_checked": self.VALIDATION_RULES,
        }

    def _add(self, diagnostics: list, severity: str, code: str, message: str, **extra) -> None:
        d = {"severity": severity, "code": code, "message": message}
        d.update(extra)
        diagnostics.append(d)

    def _check_broken_edges(self, graph: Graph, node_ids: set[str], diagnostics: list) -> None:
        for e in graph.edges:
            if e.source_node_id not in node_ids:
                self._add(diagnostics, "error", "BROKEN_EDGES",
                          f"Edge {e.id} references non-existent source node '{e.source_node_id}'", edge_id=e.id)
            if e.target_node_id not in node_ids:
                self._add(diagnostics, "error", "BROKEN_EDGES",
                          f"Edge {e.id} references non-existent target node '{e.target_node_id}'", edge_id=e.id)

    def _check_missing_entry(self, graph: Graph, diagnostics: list) -> None:
        if not graph.nodes:
            return
        has_incoming = set()
        for e in graph.edges:
            has_incoming.add(e.target_node_id)
        entry_candidates = [n for n in graph.nodes if n.id not in has_incoming]
        if not entry_candidates:
            self._add(diagnostics, "error", "MISSING_ENTRY_NODE",
                      "No entry node found - every node has an incoming edge, creating a cycle")
        elif len(entry_candidates) > 1 and len(graph.nodes) > 1:
            labels = ", ".join(n.label for n in entry_candidates)
            self._add(diagnostics, "warning", "MISSING_ENTRY_NODE",
                      f"Multiple entry nodes found ({len(entry_candidates)}): {labels}. Consider marking one as the explicit entry.",
                      node_ids=[n.id for n in entry_candidates])

    def _check_circular_dependency(self, graph: Graph, node_ids: set, node_map: dict, adj: dict, diagnostics: list) -> None:
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {nid: WHITE for nid in node_ids}

        for start_node in node_ids:
            if color[start_node] != WHITE:
                continue
            stack: list[tuple[str, list[str]]] = [(start_node, [start_node])]
            while stack:
                u, path = stack[-1]
                if color[u] == WHITE:
                    color[u] = GRAY
                neighbors = adj.get(u, [])
                advanced = False
                for v in neighbors:
                    if v not in color:
                        continue
                    if color[v] == GRAY:
                        cycle_nodes = [node_map.get(n, n).label if n in node_map else n for n in path[path.index(v):]]
                        self._add(diagnostics, "error", "CIRCULAR_DEPENDENCY",
                                  f"Circular dependency: {' -> '.join(cycle_nodes)}", node_id=v)
                        color[u] = BLACK
                        stack.pop()
                        advanced = True
                        break
                    if color[v] == WHITE:
                        stack.append((v, path + [v]))
                        advanced = True
                        break
                if not advanced:
                    color[u] = BLACK
                    stack.pop()

    def _check_unreachable(self, graph: Graph, node_ids: set, node_map: dict, adj: dict, diagnostics: list) -> None:
        if not graph.nodes:
            return
        has_incoming = set()
        for e in graph.edges:
            has_incoming.add(e.target_node_id)
        start_nodes = [n for n in graph.nodes if n.id not in has_incoming]
        if not start_nodes:
            return
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
        for n in graph.nodes:
            if n.id not in reachable and n.id not in {sn.id for sn in start_nodes}:
                self._add(diagnostics, "warning", "UNREACHABLE_NODES",
                          f"Node '{n.label}' is unreachable from any entry node", node_id=n.id)

    def _check_terminal_nodes(self, graph: Graph, diagnostics: list) -> None:
        if not graph.nodes:
            return
        has_outgoing = set()
        for e in graph.edges:
            has_outgoing.add(e.source_node_id)
        terminal_nodes = [n for n in graph.nodes if n.id not in has_outgoing]
        if not terminal_nodes and len(graph.nodes) > 1:
            self._add(diagnostics, "error", "MULTIPLE_INVALID_TERMINAL_NODES",
                      "No terminal nodes found - every node has an outgoing edge")
        explicit_terminals = [n for n in graph.nodes if n.is_terminal]
        for n in explicit_terminals:
            if n.id in has_outgoing:
                self._add(diagnostics, "error", "MULTIPLE_INVALID_TERMINAL_NODES",
                          f"Node '{n.label}' marked as terminal but has outgoing edges", node_id=n.id)

    def _check_missing_input_output(self, graph: Graph, node_map: dict, diagnostics: list) -> None:
        for n in graph.nodes:
            if n.node_type in (GraphNodeType.AGENT, GraphNodeType.TOOL, GraphNodeType.SKILL) and not n.ref_id:
                self._add(diagnostics, "error", "MISSING_INPUT",
                          f"Node '{n.label}' ({n.node_type.value}) has no reference id", node_id=n.id)
            if n.node_type == GraphNodeType.TOOL:
                perms = n.config.get("permissions", [])
                if not perms:
                    self._add(diagnostics, "warning", "MISSING_INPUT",
                              f"Tool node '{n.label}' has no permissions configured", node_id=n.id)
        has_evidence = any(n.node_type == GraphNodeType.EVIDENCE for n in graph.nodes)
        if not has_evidence and graph.nodes:
            self._add(diagnostics, "warning", "MISSING_OUTPUT",
                      "Graph has no evidence node - execution will not produce graph-level evidence")

    def _check_invalid_branch(self, graph: Graph, node_map: dict, adj: dict, diagnostics: list) -> None:
        for n in graph.nodes:
            if n.node_type in (GraphNodeType.CONDITION, GraphNodeType.DECISION):
                outgoing = adj.get(n.id, [])
                if len(outgoing) < 2:
                    self._add(diagnostics, "warning", "INVALID_BRANCH",
                              f"Decision/condition node '{n.label}' has only {len(outgoing)} outgoing edge(s) - expected at least 2 for branching",
                              node_id=n.id)
                has_failure = any(
                    e.is_failure_path or e.edge_type == GraphEdgeType.FAILURE
                    for e in graph.edges if e.source_node_id == n.id
                )
                if not has_failure and len(outgoing) >= 2:
                    self._add(diagnostics, "warning", "INVALID_BRANCH",
                              f"Decision node '{n.label}' has multiple branches but no failure path defined",
                              node_id=n.id)

    def _check_invalid_merge(self, graph: Graph, node_map: dict, reverse_adj: dict, diagnostics: list) -> None:
        for n in graph.nodes:
            if n.node_type == GraphNodeType.MERGE:
                incoming = reverse_adj.get(n.id, [])
                if len(incoming) < 2:
                    self._add(diagnostics, "warning", "INVALID_MERGE",
                              f"Merge node '{n.label}' has only {len(incoming)} incoming edge(s) - expected at least 2",
                              node_id=n.id)
            if n.node_type == GraphNodeType.PARALLEL:
                outgoing = [e for e in graph.edges if e.source_node_id == n.id]
                if len(outgoing) < 2:
                    self._add(diagnostics, "warning", "INVALID_MERGE",
                              f"Parallel node '{n.label}' has only {len(outgoing)} outgoing edge(s) - expected at least 2 for parallel execution",
                              node_id=n.id)

    def _check_failure_path(self, graph: Graph, node_map: dict, diagnostics: list) -> None:
        if not graph.metadata.failure_path_enabled:
            return
        has_failure_handler = any(n.node_type == GraphNodeType.FAILURE_HANDLER for n in graph.nodes)
        has_failure_edge = any(e.is_failure_path or e.edge_type == GraphEdgeType.FAILURE for e in graph.edges)
        if not has_failure_handler and not has_failure_edge:
            self._add(diagnostics, "warning", "FAILURE_PATH_MISSING",
                      "Failure path is enabled in metadata but no failure handler node or failure edge exists")
        has_approval = any(n.node_type == GraphNodeType.APPROVAL for n in graph.nodes)
        if has_approval and not has_failure_edge:
            self._add(diagnostics, "warning", "FAILURE_PATH_MISSING",
                      "Graph has approval nodes but no failure path for rejection handling")

    def _check_approval_path(self, graph: Graph, node_map: dict, adj: dict, diagnostics: list) -> None:
        if not graph.metadata.approval_path_enabled:
            return
        has_approval = any(n.node_type == GraphNodeType.APPROVAL for n in graph.nodes)
        if not has_approval:
            self._add(diagnostics, "warning", "APPROVAL_PATH_MISSING",
                      "Approval path is enabled in metadata but no approval node exists in the graph")
