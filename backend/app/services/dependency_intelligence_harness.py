from __future__ import annotations

from typing import Any
from ..domain.models.delivery_state import DeliveryDependency
from ..storage.in_memory import store


class DependencyIntelligenceHarness:
    def __init__(self, tenant_id: str = "tenant_forgeiq") -> None:
        self.tenant_id = tenant_id

    def get_dependency_graph(self) -> dict[str, Any]:
        """
        Constructs canonical delivery dependency graph:
        Nodes: Stories, Epics, Teams, Services, Repositories, External Vendors
        Edges: depends_on, blocks, api_contract, shared_component
        Identifies critical paths and blast radius.
        """
        deps = store.delivery_dependencies.all(self.tenant_id)
        stories = store.stories.all(self.tenant_id)
        teams = store.delivery_teams.all(self.tenant_id)

        nodes: list[dict[str, Any]] = []
        node_ids: set[str] = set()

        # Add Teams as group nodes
        for t in teams:
            if t.id not in node_ids:
                nodes.append({
                    "id": t.id,
                    "label": t.name,
                    "type": "TEAM",
                    "status": "HEALTHY",
                    "details": f"{t.members_count} members, {t.average_velocity} pts avg",
                })
                node_ids.add(t.id)

        # Add Stories as core nodes
        for s in stories:
            if s.id not in node_ids:
                status_color = "CRITICAL" if s.risk_level in ["CRITICAL", "HIGH"] else "HEALTHY"
                nodes.append({
                    "id": s.id,
                    "label": f"{s.key}: {s.title[:24]}...",
                    "full_title": s.title,
                    "key": s.key,
                    "type": "STORY",
                    "team_id": s.team_id,
                    "points": s.points,
                    "status": status_color,
                    "risk_level": s.risk_level,
                    "is_blocked": s.status == "BLOCKED",
                    "details": f"{s.points} pts | Risk: {s.risk_level} | DoR: {s.definition_of_ready_score}%",
                })
                node_ids.add(s.id)

        # Add External / Service nodes mentioned in dependencies
        for d in deps:
            for nid, ntitle, ntype in [(d.source_id, d.source_title, d.source_type), (d.target_id, d.target_title, d.target_type)]:
                if nid not in node_ids:
                    nodes.append({
                        "id": nid,
                        "label": ntitle,
                        "type": ntype,
                        "status": "HEALTHY",
                        "details": f"Type: {ntype}",
                    })
                    node_ids.add(nid)

        # Process edges
        edges: list[dict[str, Any]] = []
        critical_path_edges: list[str] = []

        for d in deps:
            edge_id = f"edge_{d.source_id}_{d.target_id}"
            is_critical = d.critical_path or d.risk_level in ["HIGH", "CRITICAL"]
            if is_critical:
                critical_path_edges.append(edge_id)

            edges.append({
                "id": edge_id,
                "source": d.source_id,
                "target": d.target_id,
                "label": d.dependency_type.value if hasattr(d.dependency_type, "value") else str(d.dependency_type),
                "type": d.dependency_type.value if hasattr(d.dependency_type, "value") else str(d.dependency_type),
                "critical_path": d.critical_path,
                "aging_days": d.aging_days,
                "risk_level": d.risk_level,
                "blast_radius_score": d.blast_radius_score,
                "impact_description": d.impact_description,
            })

        # Calculate metrics
        critical_count = sum(1 for d in deps if d.critical_path)
        aging_count = sum(1 for d in deps if d.aging_days >= 3)

        return {
            "nodes": nodes,
            "edges": edges,
            "total_dependencies": len(deps),
            "critical_path_dependencies": critical_count,
            "aging_dependencies": aging_count,
            "critical_path_edge_ids": critical_path_edges,
        }

    def simulate_upstream_slip(self, dependency_id: str, slip_days: int = 2) -> dict[str, Any]:
        dep = store.delivery_dependencies.get(dependency_id)
        if not dep:
            return {"error": "Dependency not found"}

        # Blast radius propagation calculation
        affected_stories = [
            s for s in store.stories.all(self.tenant_id)
            if s.id == dep.source_id or dep.target_id in s.linked_dependencies
        ]

        downstream_delay_hours = slip_days * 16.0
        sprint_impact = "HIGH" if slip_days >= 2 and dep.critical_path else "MEDIUM"
        probability_drop = min(35.0, slip_days * 12.0)

        return {
            "dependency_id": dependency_id,
            "source": dep.source_title,
            "target": dep.target_title,
            "slip_days": slip_days,
            "downstream_delay_hours": downstream_delay_hours,
            "sprint_goal_probability_reduction_pct": probability_drop,
            "severity": sprint_impact,
            "affected_stories_count": len(affected_stories),
            "impact_summary": f"A {slip_days}-day delay on {dep.target_title} puts {dep.source_title} and downstream integration tests on the critical path, lowering Sprint Goal confidence by {probability_drop}%.",
            "recommended_mitigation": "Pair senior engineer from Payments Core to assist Team B, or decouple the mock client behind a feature flag.",
        }
