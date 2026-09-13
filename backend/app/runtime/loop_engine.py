from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.loop import Loop, LoopType
from ..domain.models.base import gen_id
from ..domain.models.execution import ExecutionEvent, EventType


class LoopEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def get_loop(self, loop_id: str) -> Optional[Loop]:
        l = store.loops.get(loop_id)
        if l and l.tenant_id == self.tenant_id:
            return l
        return None

    async def execute_loop(
        self,
        loop_id: str,
        execution_id: str,
        evaluate_fn,
        action_fn,
        node_id: Optional[str] = None,
    ) -> dict:
        loop = self.get_loop(loop_id)
        if loop is None:
            return {"status": "failed", "error": "Loop not found"}

        iterations = 0
        results: list[dict] = []

        while iterations < loop.max_iterations:
            iterations += 1

            trigger_evt = ExecutionEvent(
                id=gen_id("evt_"),
                execution_id=execution_id,
                event_type=EventType.LOOP_TRIGGERED,
                node_id=node_id,
                message=f"Loop '{loop.display_name}' iteration {iterations}/{loop.max_iterations}",
                data={"loop_type": loop.loop_type.value, "iteration": iterations},
            )
            store.events.append(trigger_evt)

            if iterations > 1:
                retry_evt = ExecutionEvent(
                    id=gen_id("evt_"),
                    execution_id=execution_id,
                    event_type=EventType.RETRY_STARTED,
                    node_id=node_id,
                    message=f"Retry {iterations - 1} for '{loop.display_name}'",
                )
                store.events.append(retry_evt)

            eval_result = await evaluate_fn() if asyncio.iscoroutinefunction(evaluate_fn) else evaluate_fn()
            results.append({"iteration": iterations, "evaluation": eval_result})

            if eval_result.get("success"):
                return {"status": "completed", "iterations": iterations, "results": results}

            action_result = await action_fn() if asyncio.iscoroutinefunction(action_fn) else action_fn()
            results[-1]["action"] = action_result

            await asyncio.sleep(0.02)

        if loop.failure_handling == "escalate":
            evt = ExecutionEvent(
                id=gen_id("evt_"),
                execution_id=execution_id,
                event_type=EventType.APPROVAL_REQUESTED,
                node_id=node_id,
                message=f"Loop '{loop.display_name}' escalated after {loop.max_iterations} iterations",
            )
            store.events.append(evt)
            return {"status": "escalated", "iterations": iterations, "results": results}

        return {"status": "failed", "iterations": iterations, "results": results}
