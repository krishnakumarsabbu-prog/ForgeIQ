from __future__ import annotations

from typing import Optional

from ..storage.in_memory import store
from ..domain.models.policy import Policy
from ..domain.models.base import gen_id
from ..domain.models.execution import ExecutionEvent, EventType
from ..events.emit import emit_event


class PolicyEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def evaluate(
        self,
        scope: str,
        target_id: Optional[str] = None,
        context: Optional[dict] = None,
        execution_id: str = "",
        node_id: Optional[str] = None,
    ) -> tuple[bool, list[str]]:
        policies = store.policies.all(self.tenant_id)
        applied: list[str] = []
        context = context or {}

        for policy in policies:
            if not policy.active:
                continue
            if policy.scope.value != scope:
                continue
            if policy.target_id and target_id and policy.target_id != target_id:
                continue

            applied.append(policy.display_name)

            if policy.policy_type.value == "prohibit":
                evt = emit_event(
                    execution_id=execution_id,
                    event_type=EventType.POLICY_CHECKED,
                    node_id=node_id,
                    message=f"Policy '{policy.display_name}' evaluated: PROHIBITED",
                )
                return False, applied

            if policy.policy_type.value == "require":
                field_val = context.get("environment", "")
                if policy.target_id and field_val != policy.target_id:
                    continue

        evt = emit_event(
            execution_id=execution_id,
            event_type=EventType.POLICY_CHECKED,
            node_id=node_id,
            message=f"Policy check: PASSED ({len(applied)} policies applied)",
        )
        return True, applied

    def check_approval_required(self, harness_id: str, environment: str) -> bool:
        harness = store.harnesses.get(harness_id)
        if harness and harness.approval_required and environment == "production":
            return True
        for policy in store.policies.all(self.tenant_id):
            if not policy.active:
                continue
            if policy.scope.value == "environment" and policy.target_id == environment:
                if policy.policy_type.value == "require":
                    return True
        return False
