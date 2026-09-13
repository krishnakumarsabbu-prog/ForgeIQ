from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from ...storage.in_memory import store
from ...domain.models.loop import (
    Loop, LoopType, LoopStep, LoopStepType,
    BackoffStrategy, FailureHandling, EscalationType,
)
from ...domain.models.base import gen_id, utc_now
from ...runtime.loop_engine import LoopEngine

router = APIRouter(prefix="/loops", tags=["loops"])


class LoopStepCreate(BaseModel):
    step_type: LoopStepType
    label: str
    description: str = ""
    config: dict[str, Any] = {}
    next_step_id: Optional[str] = None
    branch_true_id: Optional[str] = None
    branch_false_id: Optional[str] = None
    position_x: int = 0
    position_y: int = 0


class LoopCreate(BaseModel):
    name: str
    display_name: str = ""
    loop_type: LoopType = LoopType.RETRY
    trigger: str = "on_failure"
    entry_condition: Optional[str] = None
    evaluation: str = ""
    action: str = ""
    max_iterations: int = 3
    backoff_strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL
    backoff_initial_ms: int = 1000
    backoff_max_ms: int = 30000
    cost_limit_cents: int = 10000
    time_limit_seconds: int = 3600
    retry_policy: dict[str, Any] = {}
    exit_condition: str = "success"
    failure_handling: str = "escalate"
    escalation: str = "human_approval"
    harness_id: Optional[str] = None
    is_default: bool = False
    steps: list[LoopStepCreate] = []
    evidence_requirements: list[str] = []
    tenant_id: str = "tenant_forgeiq"


class LoopUpdate(BaseModel):
    display_name: Optional[str] = None
    loop_type: Optional[LoopType] = None
    trigger: Optional[str] = None
    entry_condition: Optional[str] = None
    evaluation: Optional[str] = None
    action: Optional[str] = None
    max_iterations: Optional[int] = None
    backoff_strategy: Optional[BackoffStrategy] = None
    backoff_initial_ms: Optional[int] = None
    backoff_max_ms: Optional[int] = None
    cost_limit_cents: Optional[int] = None
    time_limit_seconds: Optional[int] = None
    retry_policy: Optional[dict[str, Any]] = None
    exit_condition: Optional[str] = None
    failure_handling: Optional[str] = None
    escalation: Optional[str] = None
    harness_id: Optional[str] = None
    is_default: Optional[bool] = None
    steps: Optional[list[LoopStepCreate]] = None
    evidence_requirements: Optional[list[str]] = None


class LoopExecuteBody(BaseModel):
    execution_id: str = ""
    evaluate_result: dict[str, Any] = {}
    action_result: dict[str, Any] = {}


@router.get("")
def list_loops(tenant_id: str = "tenant_forgeiq"):
    return store.loops.all(tenant_id)


@router.get("/types")
def list_loop_types():
    return [
        {"value": t.value, "label": t.value.replace("_", " ").title()}
        for t in LoopType
    ]


@router.get("/triggers")
def list_loop_triggers():
    return [
        {"value": "on_failure", "label": "On Failure"},
        {"value": "on_test_failure", "label": "On Test Failure"},
        {"value": "on_security_finding", "label": "On Security Finding"},
        {"value": "on_deployment", "label": "On Deployment"},
        {"value": "on_verification_failure", "label": "On Verification Failure"},
        {"value": "on_incident", "label": "On Incident"},
        {"value": "on_completion", "label": "On Completion"},
        {"value": "on_schedule", "label": "On Schedule"},
        {"value": "manual", "label": "Manual"},
    ]


@router.get("/backoff-strategies")
def list_backoff_strategies():
    return [
        {"value": t.value, "label": t.value.title()}
        for t in BackoffStrategy
    ]


@router.get("/failure-handling")
def list_failure_handling():
    return [
        {"value": t.value, "label": t.value.title()}
        for t in FailureHandling
    ]


@router.get("/escalation-types")
def list_escalation_types():
    return [
        {"value": t.value, "label": t.value.replace("_", " ").title()}
        for t in EscalationType
    ]


@router.get("/{loop_id}")
def get_loop(loop_id: str):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    return l


@router.post("")
def create_loop(body: LoopCreate):
    steps = [
        LoopStep(
            step_type=s.step_type, label=s.label, description=s.description,
            config=s.config, next_step_id=s.next_step_id,
            branch_true_id=s.branch_true_id, branch_false_id=s.branch_false_id,
            position_x=s.position_x, position_y=s.position_y,
        )
        for s in body.steps
    ]
    l = Loop(
        tenant_id=body.tenant_id,
        id=gen_id("loop_"),
        name=body.name,
        display_name=body.display_name or body.name,
        loop_type=body.loop_type,
        trigger=body.trigger,
        entry_condition=body.entry_condition,
        evaluation=body.evaluation,
        action=body.action,
        max_iterations=body.max_iterations,
        backoff_strategy=body.backoff_strategy,
        backoff_initial_ms=body.backoff_initial_ms,
        backoff_max_ms=body.backoff_max_ms,
        cost_limit_cents=body.cost_limit_cents,
        time_limit_seconds=body.time_limit_seconds,
        retry_policy=body.retry_policy or {"retry_on": "transient", "max_retries": body.max_iterations},
        exit_condition=body.exit_condition,
        failure_handling=body.failure_handling,
        escalation=body.escalation,
        harness_id=body.harness_id,
        is_default=body.is_default,
        steps=steps,
        evidence_requirements=body.evidence_requirements or ["iteration_log", "evaluation_result", "exit_reason"],
        version="v1",
        published=False,
        created_at=utc_now(),
    )
    store.loops.add(l)
    return l


@router.put("/{loop_id}")
def update_loop(loop_id: str, body: LoopUpdate):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    patch: dict[str, Any] = {}
    for field, val in body.model_dump(exclude_unset=True).items():
        if field == "steps" and val is not None:
            patch["steps"] = [
                LoopStep(
                    step_type=s.step_type, label=s.label, description=s.description,
                    config=s.config, next_step_id=s.next_step_id,
                    branch_true_id=s.branch_true_id, branch_false_id=s.branch_false_id,
                    position_x=s.position_x, position_y=s.position_y,
                )
                for s in val
            ]
        elif val is not None:
            patch[field] = val
    updated = store.loops.update(loop_id, patch)
    if not updated:
        raise HTTPException(500, "Failed to update loop")
    return updated


@router.delete("/{loop_id}")
def delete_loop(loop_id: str):
    if not store.loops.delete(loop_id):
        raise HTTPException(404, "Loop not found")
    return {"deleted": True}


@router.post("/{loop_id}/publish")
def publish_loop(loop_id: str):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    l.published = True
    l.is_default = True
    l.touch()
    return l


@router.get("/{loop_id}/history")
def get_loop_history(loop_id: str):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    return l.execution_history


@router.post("/{loop_id}/execute")
def execute_loop(loop_id: str, body: LoopExecuteBody):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")

    engine = LoopEngine(l.tenant_id)
    exec_id = body.execution_id or gen_id("exec_")

    eval_result = body.evaluate_result or {"success": False}
    action_result = body.action_result or {"success": False}

    def evaluate_fn():
        return eval_result

    def action_fn():
        return action_result

    result = engine.execute_loop_sync(
        loop_id, exec_id, evaluate_fn, action_fn,
    )
    return result


@router.post("/{loop_id}/steps")
def add_step(loop_id: str, body: LoopStepCreate):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    step = LoopStep(
        step_type=body.step_type, label=body.label, description=body.description,
        config=body.config, next_step_id=body.next_step_id,
        branch_true_id=body.branch_true_id, branch_false_id=body.branch_false_id,
        position_x=body.position_x, position_y=body.position_y,
    )
    l.steps.append(step)
    l.touch()
    return l


@router.put("/{loop_id}/steps/{step_id}")
def update_step(loop_id: str, step_id: str, body: LoopStepCreate):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    for i, s in enumerate(l.steps):
        if s.id == step_id:
            l.steps[i] = LoopStep(
                id=step_id,
                step_type=body.step_type, label=body.label, description=body.description,
                config=body.config, next_step_id=body.next_step_id,
                branch_true_id=body.branch_true_id, branch_false_id=body.branch_false_id,
                position_x=body.position_x, position_y=body.position_y,
            )
            l.touch()
            return l
    raise HTTPException(404, "Step not found")


@router.delete("/{loop_id}/steps/{step_id}")
def delete_step(loop_id: str, step_id: str):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    before = len(l.steps)
    l.steps = [s for s in l.steps if s.id != step_id]
    if len(l.steps) == before:
        raise HTTPException(404, "Step not found")
    l.touch()
    return l


@router.post("/{loop_id}/generate-steps")
def generate_steps(loop_id: str):
    l = store.loops.get(loop_id)
    if not l:
        raise HTTPException(404, "Loop not found")
    template = LoopEngine.generate_steps_for_type(l.loop_type)
    l.steps = [
        LoopStep(
            step_type=LoopStepType(s["step_type"]),
            label=s["label"],
            description=s["description"],
            position_x=s["position_x"],
            position_y=s["position_y"],
        )
        for s in template
    ]
    for i in range(len(l.steps) - 1):
        l.steps[i].next_step_id = l.steps[i + 1].id
    l.touch()
    return l


@router.post("/generate-steps/{loop_type}")
def generate_steps_for_type(loop_type: LoopType):
    template = LoopEngine.generate_steps_for_type(loop_type)
    steps = [
        LoopStep(
            step_type=LoopStepType(s["step_type"]),
            label=s["label"],
            description=s["description"],
            position_x=s["position_x"],
            position_y=s["position_y"],
        )
        for s in template
    ]
    for i in range(len(steps) - 1):
        steps[i].next_step_id = steps[i + 1].id
    return steps
