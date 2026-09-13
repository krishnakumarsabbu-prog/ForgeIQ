"""LoopEngine — the real adaptive loop execution authority.

Responsibilities:
    Detect trigger → evaluate condition → increment iteration → execute action
    → evaluate result → decide retry → apply backoff → check limits
    → escalate → exit.

Limits enforced:
    - Maximum iterations
    - Time limit
    - Cost limit
    - Token limit

When a limit is exceeded:
    - Stop, Escalate, or Fallback — according to failure_handling policy.

Loop state tracked per execution:
    loop_id, iteration, attempt, trigger, evaluation, action, result, exit_reason

All events are emitted live — no frontend-only loop behavior.
"""

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
from ..domain.models.evidence import EvidenceType
from ..events.emit import emit_event
from .evidence_engine import EvidenceEngine


class LoopState:
    """Mutable per-execution loop state, tracked across iterations."""

    def __init__(self, loop_id: str, execution_id: str) -> None:
        self.loop_id = loop_id
        self.execution_id = execution_id
        self.iteration: int = 0
        self.attempt: int = 0
        self.trigger: str = ""
        self.evaluation_result: dict[str, Any] = {}
        self.action_result: dict[str, Any] = {}
        self.result: str = "pending"
        self.exit_reason: str = ""
        self.total_cost_cents: int = 0
        self.total_tokens: int = 0
        self.started_at = utc_now()
        self.iteration_records: list[LoopIterationRecord] = []

    def to_dict(self) -> dict[str, Any]:
        return {
            "loop_id": self.loop_id,
            "execution_id": self.execution_id,
            "iteration": self.iteration,
            "attempt": self.attempt,
            "trigger": self.trigger,
            "evaluation_result": self.evaluation_result,
            "action_result": self.action_result,
            "result": self.result,
            "exit_reason": self.exit_reason,
            "total_cost_cents": self.total_cost_cents,
            "total_tokens": self.total_tokens,
            "duration_seconds": (utc_now() - self.started_at).total_seconds(),
        }


class LoopEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.evidence_engine = EvidenceEngine(tenant_id)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Backoff computation
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Event helper
    # ------------------------------------------------------------------

    def _emit(
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

    # ------------------------------------------------------------------
    # Limit checking
    # ------------------------------------------------------------------

    def _check_limits(self, loop: Loop, state: LoopState) -> tuple[bool, str]:
        """Returns (limit_exceeded, reason)."""
        if state.iteration >= loop.max_iterations:
            return True, "max_iterations_reached"

        elapsed = (utc_now() - state.started_at).total_seconds()
        if elapsed > loop.time_limit_seconds:
            return True, "time_limit_exceeded"

        if state.total_cost_cents > loop.cost_limit_cents:
            return True, "cost_limit_exceeded"

        token_limit = loop.retry_policy.get("token_limit", 0)
        if token_limit > 0 and state.total_tokens > token_limit:
            return True, "token_limit_exceeded"

        return False, ""

    # ------------------------------------------------------------------
    # Limit exceeded handling
    # ------------------------------------------------------------------

    def _handle_limit_exceeded(
        self, loop: Loop, state: LoopState, reason: str, execution_id: str,
        node_id: Optional[str],
    ) -> dict[str, Any]:
        state.exit_reason = reason
        state.result = "limit_exceeded"

        self._emit(
            execution_id, EventType.EVALUATION_COMPLETED,
            f"Loop '{loop.display_name}' stopped: {reason} "
            f"(iterations={state.iteration}, cost={state.total_cost_cents}¢, "
            f"tokens={state.total_tokens})",
            node_id=node_id,
            data={"exit_reason": reason, **state.to_dict()},
        )

        return self._apply_failure_handling(loop, state, execution_id, node_id)

    # ------------------------------------------------------------------
    # Failure handling
    # ------------------------------------------------------------------

    def _apply_failure_handling(
        self, loop: Loop, state: LoopState, execution_id: str,
        node_id: Optional[str],
    ) -> dict[str, Any]:
        handling = loop.failure_handling
        duration = (utc_now() - state.started_at).total_seconds()

        # Create evidence for the loop execution
        self.evidence_engine.create_evidence(
            execution_id=execution_id,
            evidence_type=EvidenceType.LOOP,
            harness_id=loop.harness_id,
            inputs={
                "loop_type": loop.loop_type.value,
                "trigger": loop.trigger,
                "max_iterations": loop.max_iterations,
            },
            outputs={
                "iterations": state.iteration,
                "exit_reason": state.exit_reason,
                "total_cost_cents": state.total_cost_cents,
                "total_tokens": state.total_tokens,
                "result": state.result,
            },
            summary=(
                f"Loop '{loop.display_name}' exited: {state.exit_reason} "
                f"after {state.iteration} iterations "
                f"(cost={state.total_cost_cents}¢, tokens={state.total_tokens})"
            ),
            node_id=node_id,
        )

        if handling == FailureHandling.ESCALATE.value:
            escalation_type = loop.escalation
            self._emit(
                execution_id, EventType.APPROVAL_REQUESTED,
                f"Loop '{loop.display_name}' escalated ({escalation_type}) "
                f"after {state.iteration} iterations — {state.exit_reason}",
                node_id=node_id,
                data={
                    "escalation": escalation_type,
                    "iterations": state.iteration,
                    "exit_reason": state.exit_reason,
                    **state.to_dict(),
                },
            )
            return {
                "status": "escalated",
                "escalation": escalation_type,
                **state.to_dict(),
            }

        if handling == FailureHandling.ROLLBACK.value:
            self._emit(
                execution_id, EventType.LOOP_TRIGGERED,
                f"Loop '{loop.display_name}' triggering rollback after failure — {state.exit_reason}",
                node_id=node_id,
                data={"failure_handling": "rollback", **state.to_dict()},
            )
            return {
                "status": "rollback_triggered",
                **state.to_dict(),
            }

        if handling == FailureHandling.ABORT.value:
            self._emit(
                execution_id, EventType.EXECUTION_FAILED,
                f"Loop '{loop.display_name}' aborted after {state.iteration} iterations — {state.exit_reason}",
                node_id=node_id,
                data={**state.to_dict()},
            )
            return {
                "status": "failed",
                **state.to_dict(),
            }

        # FailureHandling.CONTINUE — try fallback if configured
        fallback = loop.retry_policy.get("fallback")
        if fallback:
            self._emit(
                execution_id, EventType.LOOP_TRIGGERED,
                f"Loop '{loop.display_name}' applying fallback: {fallback}",
                node_id=node_id,
                data={"fallback": fallback, **state.to_dict()},
            )
            return {
                "status": "fallback",
                "fallback": fallback,
                **state.to_dict(),
            }

        self._emit(
            execution_id, EventType.LOOP_TRIGGERED,
            f"Loop '{loop.display_name}' continuing after {state.iteration} iterations — {state.exit_reason}",
            node_id=node_id,
            data={**state.to_dict()},
        )
        return {
            "status": "completed_with_warnings",
            **state.to_dict(),
        }

    # ------------------------------------------------------------------
    # Main loop execution
    # ------------------------------------------------------------------

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

        state = LoopState(loop_id, execution_id)
        state.trigger = loop.trigger

        # ── Detect trigger ─────────────────────────────────────────────
        self._emit(
            execution_id, EventType.LOOP_TRIGGERED,
            f"Loop '{loop.display_name}' triggered by {loop.trigger} "
            f"(type: {loop.loop_type.value}, max_iterations: {loop.max_iterations})",
            node_id=node_id,
            data={
                "loop_type": loop.loop_type.value,
                "trigger": loop.trigger,
                "max_iterations": loop.max_iterations,
                "backoff_strategy": loop.backoff_strategy.value,
                "failure_handling": loop.failure_handling,
            },
        )

        # ── Main loop ───────────────────────────────────────────────────
        while True:
            # Check limits before starting a new iteration
            limit_exceeded, reason = self._check_limits(loop, state)
            if limit_exceeded:
                return self._handle_limit_exceeded(loop, state, reason, execution_id, node_id)

            state.iteration += 1
            state.attempt = state.iteration

            self._emit(
                execution_id, EventType.LOOP_TRIGGERED,
                f"Loop '{loop.display_name}' iteration {state.iteration}/{loop.max_iterations}",
                node_id=node_id,
                data={
                    "iteration": state.iteration,
                    "attempt": state.attempt,
                    "loop_type": loop.loop_type.value,
                },
            )

            # ── Apply backoff (skip on first iteration) ─────────────────
            if state.iteration > 1:
                backoff_ms = self._compute_backoff_ms(loop, state.iteration)
                self._emit(
                    execution_id, EventType.RETRY_STARTED,
                    f"Retry {state.iteration - 1} for '{loop.display_name}' "
                    f"(backoff: {backoff_ms}ms, strategy: {loop.backoff_strategy.value})",
                    node_id=node_id,
                    data={
                        "retry": state.iteration - 1,
                        "backoff_ms": backoff_ms,
                        "backoff_strategy": loop.backoff_strategy.value,
                    },
                )
                if backoff_ms > 0:
                    await asyncio.sleep(backoff_ms / 1000.0)

            # ── Evaluate condition ──────────────────────────────────────
            self._emit(
                execution_id, EventType.EVALUATION_STARTED,
                f"Evaluating: {loop.evaluation or 'default condition'}",
                node_id=node_id,
                data={"iteration": state.iteration, "evaluation": loop.evaluation},
            )

            eval_result = await evaluate_fn() if asyncio.iscoroutinefunction(evaluate_fn) else evaluate_fn()
            if not isinstance(eval_result, dict):
                eval_result = {"success": bool(eval_result), "value": str(eval_result)}

            state.evaluation_result = eval_result

            self._emit(
                execution_id, EventType.EVALUATION_COMPLETED,
                f"Evaluation completed: success={eval_result.get('success', False)}",
                node_id=node_id,
                data={"iteration": state.iteration, "result": eval_result},
            )

            # ── Check exit condition ─────────────────────────────────────
            success = eval_result.get("success", False)
            decision = "exit" if success else "retry"

            iteration_record = LoopIterationRecord(
                iteration=state.iteration,
                attempt=state.attempt,
                trigger=state.trigger,
                evaluation_result=eval_result,
                decision=decision,
            )

            if success:
                # ── Exit: condition met ──────────────────────────────
                state.exit_reason = "exit_condition_met"
                state.result = "completed"
                iteration_record.exit_reason = state.exit_reason
                iteration_record.action = "none"
                state.iteration_records.append(iteration_record)
                loop.execution_history.append(iteration_record)

                self._emit(
                    execution_id, EventType.EVIDENCE_CREATED,
                    f"Loop '{loop.display_name}' exited: exit_condition_met "
                    f"after {state.iteration} iterations",
                    node_id=node_id,
                    data={
                        "iterations": state.iteration,
                        "exit_reason": state.exit_reason,
                        **state.to_dict(),
                    },
                )

                # Create success evidence
                self.evidence_engine.create_evidence(
                    execution_id=execution_id,
                    evidence_type=EvidenceType.LOOP,
                    harness_id=loop.harness_id,
                    inputs={
                        "loop_type": loop.loop_type.value,
                        "trigger": loop.trigger,
                        "evaluation": loop.evaluation,
                    },
                    outputs={
                        "iterations": state.iteration,
                        "exit_reason": state.exit_reason,
                        "final_result": eval_result,
                        "total_cost_cents": state.total_cost_cents,
                        "total_tokens": state.total_tokens,
                    },
                    summary=(
                        f"Loop '{loop.display_name}' succeeded after "
                        f"{state.iteration} iterations"
                    ),
                    node_id=node_id,
                )

                return {
                    "status": "completed",
                    **state.to_dict(),
                }

            # ── Execute action ──────────────────────────────────────────
            self._emit(
                execution_id, EventType.AGENT_STARTED,
                f"Executing action: {loop.action or 'default action'}",
                node_id=node_id,
                data={"iteration": state.iteration, "action": loop.action},
            )

            action_result = await action_fn() if asyncio.iscoroutinefunction(action_fn) else action_fn()
            if not isinstance(action_result, dict):
                action_result = {"success": bool(action_result), "value": str(action_result)}

            state.action_result = action_result
            iteration_record.action = loop.action
            iteration_record.action_result = action_result
            state.iteration_records.append(iteration_record)
            loop.execution_history.append(iteration_record)

            # ── Accumulate cost and tokens ───────────────────────────────
            iteration_cost = action_result.get("cost_cents", 0)
            iteration_tokens = action_result.get("tokens_used", 0)
            state.total_cost_cents += int(iteration_cost) if isinstance(iteration_cost, (int, float)) else 0
            state.total_tokens += int(iteration_tokens) if isinstance(iteration_tokens, (int, float)) else 0

            self._emit(
                execution_id, EventType.EVALUATION_COMPLETED,
                f"Action completed: cost={state.total_cost_cents}¢, tokens={state.total_tokens}",
                node_id=node_id,
                data={
                    "iteration": state.iteration,
                    "iteration_cost": iteration_cost,
                    "iteration_tokens": iteration_tokens,
                    "total_cost_cents": state.total_cost_cents,
                    "total_tokens": state.total_tokens,
                },
            )

            # ── Check limits after action ───────────────────────────────
            limit_exceeded, reason = self._check_limits(loop, state)
            if limit_exceeded:
                return self._handle_limit_exceeded(loop, state, reason, execution_id, node_id)

            # Small yield to prevent tight loop hogging the event loop
            await asyncio.sleep(0.001)

    # ------------------------------------------------------------------
    # Sync wrapper
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Execution history
    # ------------------------------------------------------------------

    def get_execution_history(self, loop_id: str) -> list[LoopIterationRecord]:
        loop = self.get_loop(loop_id)
        if loop is None:
            return []
        return loop.execution_history

    # ------------------------------------------------------------------
    # Loop step templates
    # ------------------------------------------------------------------

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
