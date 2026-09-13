from __future__ import annotations

import asyncio
from typing import Optional, Callable, Any
from datetime import datetime, timezone

from ..storage.in_memory import store
from ..domain.models.loop import (
    Loop, LoopType, LoopStepType, LoopIterationRecord,
    BackoffStrategy, FailureHandling, EscalationType,
)
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType
from ..events.emit import emit_event


class LoopEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def get_loop(self, loop_id: str) -> Optional[Loop]:
        l = store.loops.get(loop_id)
        if l and l.tenant_id == self.tenant_id:
            return l
        return None

    def list_loops(self) -> list[Loop]:
        return store.loops.all(self.tenant_id)

    def create_loop(self, loop: Loop) -> Loop:
        store.loops.add(loop)
        return loop

    def update_loop(self, loop_id: str, patch: dict[str, Any]) -> Optional[Loop]:
        return store.loops.update(loop_id, patch)

    def delete_loop(self, loop_id: str) -> bool:
        return store.loops.delete(loop_id)

    def _compute_backoff_ms(self, loop: Loop, iteration: int) -> int:
        if loop.backoff_strategy == BackoffStrategy.NONE:
            return 0
        if loop.backoff_strategy == BackoffStrategy.FIXED:
            return loop.backoff_initial_ms
        if loop.backoff_strategy == BackoffStrategy.LINEAR:
            return min(loop.backoff_initial_ms * iteration, loop.backoff_max_ms)
        # exponential
        delay = loop.backoff_initial_ms * (2 ** (iteration - 1))
        return min(delay, loop.backoff_max_ms)

    def _emit_event(
        self, execution_id: str, event_type: EventType, message: str,
        node_id: Optional[str] = None, data: Optional[dict] = None,
    ) -> None:
        emit_event(
            execution_id=execution_id,
            event_type=event_type,
            node_id=node_id,
            message=message,
            data=data or {},
        )

    async def execute_loop(
        self,
        loop_id: str,
        execution_id: str,
        evaluate_fn: Callable[[], dict[str, Any]],
        action_fn: Callable[[], dict[str, Any]],
        node_id: Optional[str] = None,
    ) -> dict[str, Any]:
        loop = self.get_loop(loop_id)
        if loop is None:
            return {"status": "failed", "error": "Loop not found"}

        iterations = 0
        results: list[dict[str, Any]] = []
        total_cost_cents = 0
        started_at = utc_now()
        exit_reason = ""

        self._emit_event(
            execution_id, EventType.LOOP_TRIGGERED,
            f"Loop '{loop.display_name}' triggered by {loop.trigger}",
            node_id=node_id,
            data={"loop_type": loop.loop_type.value, "trigger": loop.trigger},
        )

        while iterations < loop.max_iterations:
            iterations += 1

            self._emit_event(
                execution_id, EventType.LOOP_TRIGGERED,
                f"Loop '{loop.display_name}' iteration {iterations}/{loop.max_iterations}",
                node_id=node_id,
                data={"loop_type": loop.loop_type.value, "iteration": iterations},
            )

            if iterations > 1:
                self._emit_event(
                    execution_id, EventType.RETRY_STARTED,
                    f"Retry {iterations - 1} for '{loop.display_name}'",
                    node_id=node_id,
                    data={"retry": iterations - 1, "backoff_ms": self._compute_backoff_ms(loop, iterations)},
                )
                backoff = self._compute_backoff_ms(loop, iterations)
                if backoff > 0:
                    await asyncio.sleep(backoff / 1000.0)

            self._emit_event(
                execution_id, EventType.EVALUATION_STARTED,
                f"Evaluating: {loop.evaluation}",
                node_id=node_id,
                data={"iteration": iterations},
            )

            eval_result = await evaluate_fn() if asyncio.iscoroutinefunction(evaluate_fn) else evaluate_fn()
            if not isinstance(eval_result, dict):
                eval_result = {"success": bool(eval_result), "value": str(eval_result)}

            self._emit_event(
                execution_id, EventType.EVALUATION_COMPLETED,
                f"Evaluation completed: success={eval_result.get('success', False)}",
                node_id=node_id,
                data={"iteration": iterations, "result": eval_result},
            )

            decision = "continue" if eval_result.get("success") else "retry"
            iteration_record = LoopIterationRecord(
                iteration=iterations,
                attempt=iterations,
                trigger=loop.trigger,
                evaluation_result=eval_result,
                decision=decision,
            )

            if eval_result.get("success"):
                exit_reason = "exit_condition_met"
                iteration_record.exit_reason = exit_reason
                iteration_record.action = "none"
                results.append(iteration_record.model_dump())
                loop.execution_history.append(iteration_record)

                self._emit_event(
                    execution_id, EventType.EVIDENCE_CREATED,
                    f"Loop '{loop.display_name}' exited: {exit_reason}",
                    node_id=node_id,
                    data={"iterations": iterations, "exit_reason": exit_reason},
                )
                return {
                    "status": "completed",
                    "iterations": iterations,
                    "results": results,
                    "exit_reason": exit_reason,
                    "cost_cents": total_cost_cents,
                    "duration_seconds": (utc_now() - started_at).total_seconds(),
                }

            action_result = await action_fn() if asyncio.iscoroutinefunction(action_fn) else action_fn()
            if not isinstance(action_result, dict):
                action_result = {"success": bool(action_result), "value": str(action_result)}

            iteration_record.action = loop.action
            iteration_record.action_result = action_result
            results.append(iteration_record.model_dump())
            loop.execution_history.append(iteration_record)

            cost = action_result.get("cost_cents", 0)
            total_cost_cents += cost
            if total_cost_cents > loop.cost_limit_cents:
                exit_reason = "cost_limit_exceeded"
                self._emit_event(
                    execution_id, EventType.EVALUATION_COMPLETED,
                    f"Loop '{loop.display_name}' stopped: cost limit exceeded ({total_cost_cents} > {loop.cost_limit_cents})",
                    node_id=node_id,
                    data={"cost_cents": total_cost_cents, "limit": loop.cost_limit_cents},
                )
                break

            elapsed = (utc_now() - started_at).total_seconds()
            if elapsed > loop.time_limit_seconds:
                exit_reason = "time_limit_exceeded"
                self._emit_event(
                    execution_id, EventType.EVALUATION_COMPLETED,
                    f"Loop '{loop.display_name}' stopped: time limit exceeded ({elapsed:.0f}s > {loop.time_limit_seconds}s)",
                    node_id=node_id,
                    data={"elapsed_seconds": elapsed, "limit": loop.time_limit_seconds},
                )
                break

            await asyncio.sleep(0.02)

        if not exit_reason:
            exit_reason = "max_iterations_reached"

        if loop.failure_handling == FailureHandling.ESCALATE.value:
            escalation_type = loop.escalation
            self._emit_event(
                execution_id, EventType.APPROVAL_REQUESTED,
                f"Loop '{loop.display_name}' escalated ({escalation_type}) after {iterations} iterations",
                node_id=node_id,
                data={"escalation": escalation_type, "iterations": iterations, "exit_reason": exit_reason},
            )
            return {
                "status": "escalated",
                "iterations": iterations,
                "results": results,
                "exit_reason": exit_reason,
                "escalation": escalation_type,
                "cost_cents": total_cost_cents,
                "duration_seconds": (utc_now() - started_at).total_seconds(),
            }

        if loop.failure_handling == FailureHandling.ROLLBACK.value:
            self._emit_event(
                execution_id, EventType.LOOP_TRIGGERED,
                f"Loop '{loop.display_name}' triggering rollback after failure",
                node_id=node_id,
                data={"failure_handling": "rollback", "iterations": iterations},
            )
            return {
                "status": "rollback_triggered",
                "iterations": iterations,
                "results": results,
                "exit_reason": exit_reason,
                "cost_cents": total_cost_cents,
                "duration_seconds": (utc_now() - started_at).total_seconds(),
            }

        if loop.failure_handling == FailureHandling.ABORT.value:
            return {
                "status": "failed",
                "iterations": iterations,
                "results": results,
                "exit_reason": exit_reason,
                "cost_cents": total_cost_cents,
                "duration_seconds": (utc_now() - started_at).total_seconds(),
            }

        # continue
        return {
            "status": "completed_with_warnings",
            "iterations": iterations,
            "results": results,
            "exit_reason": exit_reason,
            "cost_cents": total_cost_cents,
            "duration_seconds": (utc_now() - started_at).total_seconds(),
        }

    def execute_loop_sync(
        self,
        loop_id: str,
        execution_id: str,
        evaluate_fn: Callable[[], dict[str, Any]],
        action_fn: Callable[[], dict[str, Any]],
        node_id: Optional[str] = None,
    ) -> dict[str, Any]:
        return asyncio.run(
            self.execute_loop(loop_id, execution_id, evaluate_fn, action_fn, node_id)
        )

    def get_execution_history(self, loop_id: str) -> list[LoopIterationRecord]:
        loop = self.get_loop(loop_id)
        if loop is None:
            return []
        return loop.execution_history

    @staticmethod
    def generate_steps_for_type(loop_type: LoopType) -> list[dict[str, Any]]:
        templates: dict[LoopType, list[dict[str, Any]]] = {
            LoopType.FIX: [
                {"step_type": "trigger", "label": "Test Failure Detected", "description": "Triggered when tests fail", "position_x": 300, "position_y": 50},
                {"step_type": "evaluate", "label": "Failure Classification", "description": "Classify failure: transient, logic, or environmental", "position_x": 300, "position_y": 150},
                {"step_type": "condition", "label": "Fixable AND retries < max?", "description": "Check if failure is fixable and retries remain", "position_x": 300, "position_y": 250},
                {"step_type": "action", "label": "Failure Analysis", "description": "Analyze root cause of failure", "position_x": 150, "position_y": 350},
                {"step_type": "action", "label": "Coding Agent Fix", "description": "Apply fix via coding agent", "position_x": 150, "position_y": 450},
                {"step_type": "action", "label": "Run Tests", "description": "Re-run test suite", "position_x": 150, "position_y": 550},
                {"step_type": "evaluate", "label": "Tests Pass?", "description": "Evaluate test results", "position_x": 300, "position_y": 650},
                {"step_type": "exit", "label": "Exit - Fixed", "description": "Exit loop successfully", "position_x": 450, "position_y": 650},
                {"step_type": "escalation", "label": "Human Approval", "description": "Escalate to human if not fixable or retries exhausted", "position_x": 500, "position_y": 350},
            ],
            LoopType.RETRY: [
                {"step_type": "trigger", "label": "Failure Detected", "description": "Triggered on operation failure", "position_x": 300, "position_y": 50},
                {"step_type": "evaluate", "label": "Is Transient?", "description": "Check if error is transient/retryable", "position_x": 300, "position_y": 150},
                {"step_type": "condition", "label": "Retries < max?", "description": "Check retry count", "position_x": 300, "position_y": 250},
                {"step_type": "action", "label": "Retry Operation", "description": "Re-execute the failed operation", "position_x": 200, "position_y": 350},
                {"step_type": "evaluate", "label": "Success?", "description": "Evaluate result", "position_x": 300, "position_y": 450},
                {"step_type": "exit", "label": "Exit - Success", "description": "Exit on success", "position_x": 450, "position_y": 450},
                {"step_type": "escalation", "label": "Escalate", "description": "Escalate after max retries", "position_x": 450, "position_y": 250},
            ],
            LoopType.VALIDATION: [
                {"step_type": "trigger", "label": "Completion Trigger", "description": "Triggered on task completion", "position_x": 300, "position_y": 50},
                {"step_type": "evaluate", "label": "Validate Against Criteria", "description": "Check output against acceptance criteria", "position_x": 300, "position_y": 150},
                {"step_type": "condition", "label": "Validation Pass?", "description": "Check if validation passed", "position_x": 300, "position_y": 250},
                {"step_type": "exit", "label": "Exit - Validated", "description": "Exit on validation pass", "position_x": 450, "position_y": 250},
                {"step_type": "action", "label": "Apply Corrections", "description": "Fix validation issues", "position_x": 200, "position_y": 350},
                {"step_type": "escalation", "label": "Human Review", "description": "Escalate if validation keeps failing", "position_x": 450, "position_y": 350},
            ],
            LoopType.SECURITY_REMEDIATION: [
                {"step_type": "trigger", "label": "Security Finding", "description": "Triggered on security scan finding", "position_x": 300, "position_y": 50},
                {"step_type": "evaluate", "label": "Assess Severity", "description": "Evaluate vulnerability severity and exploitability", "position_x": 300, "position_y": 150},
                {"step_type": "condition", "label": "Critical or High?", "description": "Check severity level", "position_x": 300, "position_y": 250},
                {"step_type": "action", "label": "Apply Remediation", "description": "Apply fix via coding agent", "position_x": 200, "position_y": 350},
                {"step_type": "action", "label": "Re-scan", "description": "Re-run security scanner", "position_x": 200, "position_y": 450},
                {"step_type": "evaluate", "label": "Finding Resolved?", "description": "Check if vulnerability is resolved", "position_x": 300, "position_y": 550},
                {"step_type": "exit", "label": "Exit - Secure", "description": "Exit when no critical findings", "position_x": 450, "position_y": 550},
                {"step_type": "escalation", "label": "Security Engineer Approval", "description": "Escalate to security engineer", "position_x": 500, "position_y": 250},
            ],
            LoopType.DEPLOYMENT_VERIFICATION: [
                {"step_type": "trigger", "label": "Deployment Complete", "description": "Triggered after deployment", "position_x": 300, "position_y": 50},
                {"step_type": "action", "label": "Run Health Checks", "description": "Execute health check probes", "position_x": 300, "position_y": 150},
                {"step_type": "action", "label": "Run Smoke Tests", "description": "Execute smoke test suite", "position_x": 300, "position_y": 250},
                {"step_type": "evaluate", "label": "All Checks Pass?", "description": "Evaluate health and smoke results", "position_x": 300, "position_y": 350},
                {"step_type": "exit", "label": "Exit - Verified", "description": "Exit on all checks pass", "position_x": 450, "position_y": 350},
                {"step_type": "failure_handler", "label": "Rollback", "description": "Trigger rollback on verification failure", "position_x": 150, "position_y": 350},
            ],
            LoopType.ROLLBACK: [
                {"step_type": "trigger", "label": "Verification Failure", "description": "Triggered on deployment verification failure", "position_x": 300, "position_y": 50},
                {"step_type": "evaluate", "label": "Assess Failure Scope", "description": "Evaluate deployment failure scope", "position_x": 300, "position_y": 150},
                {"step_type": "action", "label": "Execute Rollback", "description": "Rollback to previous version", "position_x": 300, "position_y": 250},
                {"step_type": "evaluate", "label": "Rollback Complete?", "description": "Verify rollback success", "position_x": 300, "position_y": 350},
                {"step_type": "exit", "label": "Exit - Rolled Back", "description": "Exit on rollback complete", "position_x": 450, "position_y": 350},
                {"step_type": "escalation", "label": "Incident Remediation", "description": "Escalate to incident remediation", "position_x": 450, "position_y": 150},
            ],
            LoopType.INCIDENT_REMEDIATION: [
                {"step_type": "trigger", "label": "Incident Detected", "description": "Triggered on production incident", "position_x": 300, "position_y": 50},
                {"step_type": "evaluate", "label": "Analyze Incident", "description": "Analyze incident and identify root cause", "position_x": 300, "position_y": 150},
                {"step_type": "action", "label": "Implement Fix", "description": "Implement and deploy fix", "position_x": 300, "position_y": 250},
                {"step_type": "action", "label": "Run Tests", "description": "Verify fix with tests", "position_x": 300, "position_y": 350},
                {"step_type": "evaluate", "label": "Incident Resolved?", "description": "Check if incident is resolved", "position_x": 300, "position_y": 450},
                {"step_type": "exit", "label": "Exit - Resolved", "description": "Exit on incident resolved", "position_x": 450, "position_y": 450},
                {"step_type": "escalation", "label": "Human Approval", "description": "Escalate if not resolved", "position_x": 450, "position_y": 150},
            ],
            LoopType.HUMAN_ESCALATION: [
                {"step_type": "trigger", "label": "Escalation Trigger", "description": "Triggered when automated resolution fails", "position_x": 300, "position_y": 50},
                {"step_type": "action", "label": "Notify Stakeholders", "description": "Notify relevant stakeholders", "position_x": 300, "position_y": 150},
                {"step_type": "action", "label": "Create Approval Request", "description": "Create human approval request", "position_x": 300, "position_y": 250},
                {"step_type": "evaluate", "label": "Approval Decision?", "description": "Wait for human decision", "position_x": 300, "position_y": 350},
                {"step_type": "exit", "label": "Exit - Approved", "description": "Exit on approval", "position_x": 450, "position_y": 350},
                {"step_type": "failure_handler", "label": "Reject and Abort", "description": "Abort on rejection", "position_x": 150, "position_y": 350},
            ],
            LoopType.CONTINUOUS_IMPROVEMENT: [
                {"step_type": "trigger", "label": "Schedule Trigger", "description": "Triggered on schedule or completion", "position_x": 300, "position_y": 50},
                {"step_type": "evaluate", "label": "Analyze Metrics", "description": "Analyze quality and performance metrics", "position_x": 300, "position_y": 150},
                {"step_type": "condition", "label": "Improvement Possible?", "description": "Check if improvements can be made", "position_x": 300, "position_y": 250},
                {"step_type": "action", "label": "Apply Improvements", "description": "Apply identified improvements", "position_x": 200, "position_y": 350},
                {"step_type": "evaluate", "label": "Metrics Improved?", "description": "Re-evaluate metrics", "position_x": 300, "position_y": 450},
                {"step_type": "exit", "label": "Exit - Improved", "description": "Exit on improvement", "position_x": 450, "position_y": 450},
                {"step_type": "exit", "label": "Exit - Stable", "description": "Exit if no improvement needed", "position_x": 450, "position_y": 250},
            ],
        }
        return templates.get(loop_type, templates[LoopType.RETRY])
