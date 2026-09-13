from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.pipeline import Pipeline
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import Execution, ExecutionEvent, EventType
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

        start_evt = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.PIPELINE_STARTED,
            pipeline_id=pipeline_id,
            message=f"Pipeline '{pipeline.display_name}' started",
            data={"stages": len(pipeline.stages)},
        )
        store.events.append(start_evt)

        execution = store.executions.get(execution_id)
        if execution:
            execution.status = "RUNNING"
            execution.started_at = utc_now().isoformat()

        sorted_stages = sorted(pipeline.stages, key=lambda s: s.order)
        stage_results: list[dict] = []
        total_stages = len(sorted_stages)

        for i, stage in enumerate(sorted_stages):
            if execution:
                execution.current_stage = stage.name
                execution.progress = (i / total_stages) * 100

            env = "development"
            if stage.stage_type.value in ("deployment", "verification"):
                env = "production"
            elif stage.stage_type.value in ("build", "release"):
                env = "staging"

            harness_result = await self.harness_runtime.execute(
                harness_id=stage.harness_id,
                execution_id=execution_id,
                environment=env,
                application_id=application_id,
                requirement_id=requirement_id,
            )
            stage_results.append({
                "stage": stage.name,
                "type": stage.stage_type.value,
                "result": harness_result,
            })

            if harness_result.get("status") == "failed":
                fail_evt = ExecutionEvent(
                    id=gen_id("evt_"),
                    execution_id=execution_id,
                    event_type=EventType.EXECUTION_FAILED,
                    pipeline_id=pipeline_id,
                    message=f"Pipeline failed at stage '{stage.name}'",
                )
                store.events.append(fail_evt)
                if execution:
                    execution.status = "FAILED"
                    execution.completed_at = utc_now().isoformat()
                    execution.error_message = f"Failed at stage: {stage.name}"
                return {"status": "failed", "failed_stage": stage.name, "results": stage_results}

        complete_evt = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.PIPELINE_COMPLETED,
            pipeline_id=pipeline_id,
            message=f"Pipeline '{pipeline.display_name}' completed",
        )
        store.events.append(complete_evt)

        if execution:
            execution.status = "COMPLETED"
            execution.completed_at = utc_now().isoformat()
            execution.progress = 100.0

        done_evt = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.EXECUTION_COMPLETED,
            message="Execution completed successfully",
        )
        store.events.append(done_evt)

        return {"status": "completed", "stages": len(sorted_stages), "results": stage_results}
