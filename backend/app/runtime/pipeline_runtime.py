from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.pipeline import Pipeline, PipelineStageType, FailureStrategy
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import Execution, ExecutionEvent, EventType
from ..events.emit import emit_event
from .harness_runtime import HarnessRuntime


class PipelineRuntime:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.harness_runtime = HarnessRuntime(tenant_id)

    def get_pipeline(self, pipeline_id: str) -> Optional[Pipeline]:
        p = store.pipelines.get(pipeline_id)
        if p and p.tenant_id == self.tenant_id:
            return p
        return None

    async def execute(
        self,
        pipeline_id: str,
        execution_id: str,
        application_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
    ) -> dict:
        pipeline = self.get_pipeline(pipeline_id)
        if pipeline is None:
            return {"status": "failed", "error": "Pipeline not found"}

        start_evt = emit_event(
            execution_id=execution_id,
            event_type=EventType.PIPELINE_STARTED,
            pipeline_id=pipeline_id,
            message=f"Pipeline '{pipeline.display_name}' started",
            data={"stages": len(pipeline.stages)},
        )

        execution = store.executions.get(execution_id)
        if execution:
            execution.status = "RUNNING"
            execution.started_at = utc_now().isoformat()

        sorted_stages = sorted(pipeline.stages, key=lambda s: s.order)
        stage_results: list[dict] = []
        total_stages = len(sorted_stages)
        completed = 0

        i = 0
        while i < len(sorted_stages):
            stage = sorted_stages[i]

            # Gather parallel stages
            parallel_group = [stage]
            j = i + 1
            while j < len(sorted_stages) and (
                sorted_stages[j].parallel_with
                and stage.id in sorted_stages[j].parallel_with
                or (stage.config.parallel_stage_ids and sorted_stages[j].id in stage.config.parallel_stage_ids)
            ):
                parallel_group.append(sorted_stages[j])
                j += 1

            if execution:
                stage_names = ", ".join(s.name for s in parallel_group)
                execution.current_stage = stage_names
                execution.progress = (completed / total_stages) * 100

            # Emit stage started events
            for s in parallel_group:
                evt = emit_event(
                    execution_id=execution_id,
                    event_type=EventType.GRAPH_NODE_STARTED,
                    pipeline_id=pipeline_id,
                    message=f"Stage '{s.name}' ({s.stage_type.value}) started",
                    data={"stage_type": s.stage_type.value, "stage_name": s.name},
                )

            # Evaluate conditions
            skip_stage = False
            for s in parallel_group:
                if s.condition:
                    condition_met = self._evaluate_condition(s.condition, stage_results)
                    if not condition_met:
                        skip_evt = emit_event(
                            execution_id=execution_id,
                            event_type=EventType.GRAPH_NODE_COMPLETED,
                            pipeline_id=pipeline_id,
                            message=f"Stage '{s.name}' skipped - condition not met: {s.condition}",
                        )
                        skip_stage = True
                        break

            if skip_stage:
                stage_results.append({
                    "stage": stage.name,
                    "type": stage.stage_type.value,
                    "result": {"status": "skipped"},
                })
                completed += len(parallel_group)
                i = j
                continue

            # Handle approval stages
            if any(s.stage_type == PipelineStageType.APPROVAL for s in parallel_group):
                for s in parallel_group:
                    if s.stage_type == PipelineStageType.APPROVAL:
                        approval_evt = emit_event(
                            execution_id=execution_id,
                            event_type=EventType.APPROVAL_REQUESTED,
                            pipeline_id=pipeline_id,
                            message=f"Approval requested for stage '{s.name}'",
                            data={"stage_name": s.name},
                        )
                        if execution:
                            execution.status = "AWAITING_APPROVAL"
                        stage_results.append({
                            "stage": s.name,
                            "type": "approval",
                            "result": {"status": "awaiting_approval"},
                        })
                        completed += 1
                i = j
                continue

            # Handle condition-only stages (no harness)
            if all(s.stage_type == PipelineStageType.CONDITION for s in parallel_group):
                for s in parallel_group:
                    condition_result = self._evaluate_condition(
                        s.config.conditions[0] if s.config.conditions else (s.condition or "true"),
                        stage_results,
                    )
                    evt = emit_event(
                        execution_id=execution_id,
                        event_type=EventType.GRAPH_NODE_COMPLETED,
                        pipeline_id=pipeline_id,
                        message=f"Condition stage '{s.name}' evaluated: {condition_result}",
                        data={"condition_result": condition_result},
                    )
                    stage_results.append({
                        "stage": s.name,
                        "type": "condition",
                        "result": {"status": "evaluated", "condition_met": condition_result},
                    })
                    completed += 1
                i = j
                continue

            # Execute harness stages (parallel if group > 1)
            if len(parallel_group) > 1:
                tasks = []
                for s in parallel_group:
                    env = self._resolve_environment(s)
                    tasks.append(self._execute_harness_stage(
                        s, execution_id, pipeline_id, env, application_id, requirement_id,
                    ))
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for idx, s in enumerate(parallel_group):
                    r = results[idx]
                    if isinstance(r, Exception):
                        r = {"status": "failed", "error": str(r)}
                    stage_results.append({
                        "stage": s.name,
                        "type": s.stage_type.value,
                        "result": r,
                    })
                    completed += 1
                    if r.get("status") == "failed":
                        failure_strategy = s.config.failure_strategy
                        fail_evt = emit_event(
                            execution_id=execution_id,
                            event_type=EventType.EXECUTION_FAILED,
                            pipeline_id=pipeline_id,
                            message=f"Pipeline failed at parallel stage '{s.name}'",
                        )
                        if failure_strategy == FailureStrategy.CONTINUE:
                            continue
                        if execution:
                            execution.status = "FAILED"
                            execution.completed_at = utc_now().isoformat()
                            execution.error_message = f"Failed at stage: {s.name}"
                        return {"status": "failed", "failed_stage": s.name, "results": stage_results}
            else:
                env = self._resolve_environment(stage)
                harness_result = await self._execute_harness_stage(
                    stage, execution_id, pipeline_id, env, application_id, requirement_id,
                )
                stage_results.append({
                    "stage": stage.name,
                    "type": stage.stage_type.value,
                    "result": harness_result,
                })
                completed += 1

                if harness_result.get("status") == "failed":
                    failure_strategy = stage.config.failure_strategy
                    fail_evt = emit_event(
                        execution_id=execution_id,
                        event_type=EventType.EXECUTION_FAILED,
                        pipeline_id=pipeline_id,
                        message=f"Pipeline failed at stage '{stage.name}'",
                    )

                    if failure_strategy == FailureStrategy.CONTINUE:
                        cont_evt = emit_event(
                            execution_id=execution_id,
                            event_type=EventType.GRAPH_NODE_COMPLETED,
                            pipeline_id=pipeline_id,
                            message=f"Continuing past failed stage '{stage.name}' (failure strategy: continue)",
                        )
                        i = j
                        continue
                    elif failure_strategy == FailureStrategy.SKIP:
                        skip_evt = emit_event(
                            execution_id=execution_id,
                            event_type=EventType.GRAPH_NODE_COMPLETED,
                            pipeline_id=pipeline_id,
                            message=f"Skipping remaining stages after '{stage.name}' (failure strategy: skip)",
                        )
                        break
                    else:
                        if execution:
                            execution.status = "FAILED"
                            execution.completed_at = utc_now().isoformat()
                            execution.error_message = f"Failed at stage: {stage.name}"
                        return {"status": "failed", "failed_stage": stage.name, "results": stage_results}

            i = j

        complete_evt = emit_event(
            execution_id=execution_id,
            event_type=EventType.PIPELINE_COMPLETED,
            pipeline_id=pipeline_id,
            message=f"Pipeline '{pipeline.display_name}' completed",
        )

        if execution:
            execution.status = "COMPLETED"
            execution.completed_at = utc_now().isoformat()
            execution.progress = 100.0

        done_evt = emit_event(
            execution_id=execution_id,
            event_type=EventType.EXECUTION_COMPLETED,
            message="Execution completed successfully",
        )

        return {"status": "completed", "stages": len(sorted_stages), "results": stage_results}

    def _resolve_environment(self, stage) -> str:
        if stage.config.environment:
            return stage.config.environment
        if stage.stage_type.value in ("deployment", "verification"):
            return "production"
        elif stage.stage_type.value in ("build", "release"):
            return "staging"
        return "development"

    async def _execute_harness_stage(
        self, stage, execution_id: str, pipeline_id: str,
        env: str, application_id: Optional[str], requirement_id: Optional[str],
    ) -> dict:
        if not stage.harness_id:
            return {"status": "skipped", "reason": "No harness bound to stage"}
        harness_result = await self.harness_runtime.execute(
            harness_id=stage.harness_id,
            execution_id=execution_id,
            environment=env,
            application_id=application_id,
            requirement_id=requirement_id,
        )
        return harness_result

    def _evaluate_condition(self, condition: str, prior_results: list[dict]) -> bool:
        if not condition or condition == "true" or condition == "always":
            return True
        if condition == "false" or condition == "never":
            return False
        condition_lower = condition.lower().strip()
        if condition_lower.startswith("prev_stage:"):
            if not prior_results:
                return False
            last = prior_results[-1]
            expected = condition_lower.split(":", 1)[1].strip()
            return last.get("result", {}).get("status") == expected
        if "passed" in condition_lower or "success" in condition_lower:
            if not prior_results:
                return False
            last = prior_results[-1]
            return last.get("result", {}).get("status") != "failed"
        if "failed" in condition_lower:
            if not prior_results:
                return False
            last = prior_results[-1]
            return last.get("result", {}).get("status") == "failed"
        return True
