from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.harness import Harness
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType, Execution
from ..domain.models.evidence import EvidenceType
from .graph_engine import GraphEngine
from .loop_engine import LoopEngine
from .policy_engine import PolicyEngine
from .evidence_engine import EvidenceEngine


class HarnessRuntime:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.graph_engine = GraphEngine(tenant_id)
        self.loop_engine = LoopEngine(tenant_id)
        self.policy_engine = PolicyEngine(tenant_id)
        self.evidence_engine = EvidenceEngine(tenant_id)

    def get_harness(self, harness_id: str) -> Optional[Harness]:
        h = store.harnesses.get(harness_id)
        if h and h.tenant_id == self.tenant_id:
            return h
        return None

    async def execute(
        self,
        harness_id: str,
        execution_id: str,
        environment: str = "development",
        application_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
    ) -> dict:
        harness = self.get_harness(harness_id)
        if harness is None:
            return {"status": "failed", "error": "Harness not found"}

        start_evt = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.HARNESS_STARTED,
            harness_id=harness_id,
            message=f"Harness '{harness.display_name}' started in {environment}",
            data={"harness_type": harness.harness_type.value, "environment": environment},
        )
        store.events.append(start_evt)

        pol_ok, applied = self.policy_engine.evaluate(
            scope="harness",
            target_id=harness_id,
            context={"environment": environment},
            execution_id=execution_id,
        )
        if not pol_ok:
            fail_evt = ExecutionEvent(
                id=gen_id("evt_"),
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                harness_id=harness_id,
                message=f"Harness '{harness.display_name}' blocked by policy",
            )
            store.events.append(fail_evt)
            return {"status": "failed", "error": "Blocked by policy", "policies": applied}

        if self.policy_engine.check_approval_required(harness_id, environment):
            approval_evt = ExecutionEvent(
                id=gen_id("evt_"),
                execution_id=execution_id,
                event_type=EventType.APPROVAL_REQUESTED,
                harness_id=harness_id,
                message=f"Approval required for harness '{harness.display_name}' in {environment}",
            )
            store.events.append(approval_evt)

        graph_result = {"status": "skipped"}
        if harness.graph_id:
            graph_result = await self.graph_engine.execute(
                graph_id=harness.graph_id,
                execution_id=execution_id,
                harness_id=harness_id,
                environment=environment,
                application_id=application_id,
                requirement_id=requirement_id,
            )

        self.evidence_engine.create_evidence(
            execution_id=execution_id,
            evidence_type=EvidenceType.HARNESS,
            harness_id=harness_id,
            harness_version=harness.current_version,
            outputs=graph_result,
            policies_applied=applied,
            summary=f"Harness '{harness.display_name}' executed in {environment}",
        )

        complete_evt = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.HARNESS_COMPLETED,
            harness_id=harness_id,
            message=f"Harness '{harness.display_name}' completed",
            data=graph_result,
        )
        store.events.append(complete_evt)

        return {
            "status": "completed" if graph_result.get("status") != "failed" else "failed",
            "harness": harness.display_name,
            "graph_result": graph_result,
            "policies_applied": applied,
        }
