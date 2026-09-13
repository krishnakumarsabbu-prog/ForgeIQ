from __future__ import annotations

from typing import Optional

from ..storage.in_memory import store
from ..domain.models.base import gen_id
from ..domain.models.execution import ExecutionEvent, EventType


class ContextEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def prepare_context(
        self,
        agent_id: str,
        application_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
        harness_id: Optional[str] = None,
        execution_id: str = "",
        node_id: Optional[str] = None,
    ) -> dict:
        context: dict = {
            "agent": {},
            "application": {},
            "requirement": {},
            "engineering_state": {},
            "evidence": [],
            "policies": [],
        }

        agent = store.agents.get(agent_id)
        if agent:
            context["agent"] = {
                "name": agent.display_name,
                "purpose": agent.purpose,
                "skills": [s.display_name for s in store.skills.all() if s.id in agent.skill_ids],
                "tools": [t.display_name for t in store.tools.all() if t.id in agent.tool_ids],
            }

        if application_id:
            app = store.applications.get(application_id)
            if app:
                context["application"] = {
                    "name": app.display_name,
                    "technologies": app.technologies,
                    "type": app.type.value,
                    "risk_level": app.risk_level,
                }
                if app.engineering_state_id:
                    es = store.engineering_states.get(app.engineering_state_id)
                    if es:
                        context["engineering_state"] = {
                            "version": es.version,
                            "health_score": es.health_score,
                            "coverage_pct": es.coverage_pct,
                            "known_issues": len(es.known_issues),
                            "open_vulnerabilities": es.open_vulnerabilities,
                        }

        if requirement_id:
            req = store.requirements.get(requirement_id)
            if req:
                context["requirement"] = {
                    "title": req.title,
                    "description": req.description,
                    "acceptance_criteria": req.acceptance_criteria,
                    "priority": req.priority.value,
                }

        if harness_id:
            harness = store.harnesses.get(harness_id)
            if harness:
                context["policies"] = [
                    {"name": p.display_name, "type": p.policy_type.value}
                    for p in store.policies.all(self.tenant_id) if p.id in harness.policy_ids
                ]

        ctx_event = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.CONTEXT_PREPARED,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Context prepared: {len(context)} sections",
            data={"sections": list(context.keys())},
        )
        store.events.append(ctx_event)

        return context
