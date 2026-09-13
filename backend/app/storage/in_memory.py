from __future__ import annotations

from typing import Any, Optional


class InMemoryTable[T]:
    def __init__(self) -> None:
        self._items: dict[str, T] = {}
        self._by_tenant: dict[str, list[str]] = {}

    def add(self, item: T) -> T:
        item_id = getattr(item, "id")
        tenant_id = getattr(item, "tenant_id", "default")
        self._items[item_id] = item
        self._by_tenant.setdefault(tenant_id, []).append(item_id)
        return item

    def get(self, item_id: str) -> Optional[T]:
        return self._items.get(item_id)

    def all(self, tenant_id: Optional[str] = None) -> list[T]:
        if tenant_id is None:
            return list(self._items.values())
        ids = self._by_tenant.get(tenant_id, [])
        return [self._items[i] for i in ids if i in self._items]

    def update(self, item_id: str, patch: dict[str, Any]) -> Optional[T]:
        item = self._items.get(item_id)
        if item is None:
            return None
        for k, v in patch.items():
            if hasattr(item, k):
                setattr(item, k, v)
        if hasattr(item, "touch"):
            item.touch()
        return item

    def delete(self, item_id: str) -> bool:
        item = self._items.pop(item_id, None)
        if item is None:
            return False
        tenant_id = getattr(item, "tenant_id", "default")
        ids = self._by_tenant.get(tenant_id, [])
        if item_id in ids:
            ids.remove(item_id)
        return True

    def filter(self, predicate) -> list[T]:
        return [item for item in self._items.values() if predicate(item)]


class InMemoryStore:
    def __init__(self) -> None:
        from ..domain.models.tenant import Tenant, User
        from ..domain.models.application import Application
        from ..domain.models.requirement import Requirement
        from ..domain.models.agent import Agent, AgentVersion
        from ..domain.models.skill import Skill
        from ..domain.models.tool import Tool
        from ..domain.models.model_config import ModelConfiguration
        from ..domain.models.harness import Harness, HarnessTemplate, HarnessVersion
        from ..domain.models.graph import Graph
        from ..domain.models.loop import Loop
        from ..domain.models.pipeline import Pipeline
        from ..domain.models.execution import Execution, ExecutionEvent, Approval
        from ..domain.models.policy import Policy
        from ..domain.models.evidence import Evidence
        from ..domain.models.engineering_state import EngineeringState, EngineeringDecision
        from ..domain.models.deployment import Environment, Artifact, Deployment
        from ..domain.models.semantic import SemanticEntity, SemanticRelationship

        self.tenants: InMemoryTable[Tenant] = InMemoryTable()
        self.users: InMemoryTable[User] = InMemoryTable()
        self.applications: InMemoryTable[Application] = InMemoryTable()
        self.requirements: InMemoryTable[Requirement] = InMemoryTable()
        self.agents: InMemoryTable[Agent] = InMemoryTable()
        self.skills: InMemoryTable[Skill] = InMemoryTable()
        self.tools: InMemoryTable[Tool] = InMemoryTable()
        self.models: InMemoryTable[ModelConfiguration] = InMemoryTable()
        self.harnesses: InMemoryTable[Harness] = InMemoryTable()
        self.harness_templates: InMemoryTable[HarnessTemplate] = InMemoryTable()
        self.graphs: InMemoryTable[Graph] = InMemoryTable()
        self.loops: InMemoryTable[Loop] = InMemoryTable()
        self.pipelines: InMemoryTable[Pipeline] = InMemoryTable()
        self.executions: InMemoryTable[Execution] = InMemoryTable()
        self.events: list[ExecutionEvent] = []
        self.approvals: InMemoryTable[Approval] = InMemoryTable()
        self.policies: InMemoryTable[Policy] = InMemoryTable()
        self.evidence: InMemoryTable[Evidence] = InMemoryTable()
        self.engineering_states: InMemoryTable[EngineeringState] = InMemoryTable()
        self.decisions: InMemoryTable[EngineeringDecision] = InMemoryTable()
        self.environments: InMemoryTable[Environment] = InMemoryTable()
        self.artifacts: InMemoryTable[Artifact] = InMemoryTable()
        self.deployments: InMemoryTable[Deployment] = InMemoryTable()
        self.semantic_entities: InMemoryTable[SemanticEntity] = InMemoryTable()
        self.semantic_relationships: InMemoryTable[SemanticRelationship] = InMemoryTable()


store = InMemoryStore()
