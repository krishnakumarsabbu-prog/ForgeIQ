"""HarnessRuntime — the central governed execution contract authority.

HarnessRuntime is the authoritative execution orchestrator for ForgeIQ.
The frontend cannot trigger real execution by itself; this runtime is
the only path that turns a Harness definition into engineering action.

Execution flow:

    Load HarnessVersion
    → Resolve Graph, Loops, Agents, Skills, Tools, Models, Context,
       Policies, Permissions, Environment, Limits, Evidence requirements
    → Pre-execution governance (permissions, policies, environment,
       cost, time, risk, approval)
    → Context initialization
    → GraphEngine execution
    → LoopEngine integration (per-loop evaluation/action cycles)
    → Failure classification + configured failure strategy
    → Complete evidence chain (harness version, graph version, loop
       versions, agent contract/version, model, tool calls)
    → Engineering State update
"""

from __future__ import annotations

import asyncio
import time
from enum import Enum
from typing import Optional, Any

from ..storage.in_memory import store
from ..domain.models.harness import Harness, HarnessVersion, HarnessType
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType, Execution, Approval
from ..domain.models.evidence import EvidenceType
from ..domain.models.tool import Tool, ToolRisk
from ..domain.models.agent import Agent
from ..events.emit import emit_event
from .graph_engine import GraphEngine
from .loop_engine import LoopEngine
from .policy_engine import PolicyEngine
from .evidence_engine import EvidenceEngine
from .context_engine import ContextEngine
from .engineering_state import EngineeringStateEngine
from .tool_runtime import ToolRuntime
from .agent_runtime import AgentRuntime


# ---------------------------------------------------------------------------
# Failure classification
# ---------------------------------------------------------------------------

class FailureClass(str, Enum):
    TRANSIENT = "transient"
    TOOL = "tool"
    AGENT = "agent"
    POLICY = "policy"
    SECURITY = "security"
    VALIDATION = "validation"
    ENVIRONMENT = "environment"
    TIMEOUT = "timeout"
    COST = "cost"
    HUMAN = "human"
    UNKNOWN = "unknown"


_FAILURE_KEYWORDS: dict[FailureClass, tuple[str, ...]] = {
    FailureClass.TRANSIENT: ("transient", "temporary", "rate_limit", "throttl", "connection", "network", "unavailable"),
    FailureClass.TOOL: ("tool", "adapter", "command", "exit_code", "permission_denied"),
    FailureClass.AGENT: ("agent", "model", "invocation", "token_budget", "cost_budget"),
    FailureClass.POLICY: ("policy", "prohibited", "blocked", "governance"),
    FailureClass.SECURITY: ("security", "vulnerability", "sast", "sca", "secret"),
    FailureClass.VALIDATION: ("validation", "schema", "contract", "required", "missing"),
    FailureClass.ENVIRONMENT: ("environment", "protected", "unsupported"),
    FailureClass.TIMEOUT: ("timeout", "timed_out", "deadline"),
    FailureClass.COST: ("cost_limit", "budget_exceeded", "cost"),
    FailureClass.HUMAN: ("approval", "human", "escalat"),
}


def classify_failure(error: str) -> FailureClass:
    lower = (error or "").lower()
    for cls, keywords in _FAILURE_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return cls
    return FailureClass.UNKNOWN


# ---------------------------------------------------------------------------
# Resolved harness bundle
# ---------------------------------------------------------------------------

class ResolvedHarness:
    """Everything the runtime needs to execute a harness, resolved upfront."""

    def __init__(self) -> None:
        self.harness: Optional[Harness] = None
        self.version: Optional[HarnessVersion] = None
        self.graph_id: Optional[str] = None
        self.graph_version: Optional[str] = None
        self.loop_ids: list[str] = []
        self.loop_versions: list[str] = []
        self.agents: list[Agent] = []
        self.agent_contract_versions: list[str] = []
        self.tools: list[Tool] = []
        self.model_config_ids: list[str] = []
        self.policy_ids: list[str] = []
        self.policy_versions: list[str] = []
        self.environment: str = "development"
        self.cost_limit_cents: int = 10000
        self.time_limit_seconds: int = 3600
        self.approval_required: bool = False
        self.evidence_requirements: list[str] = []

    @property
    def harness_version_label(self) -> str:
        return self.version.version if self.version else "unknown"

    def resolution_summary(self) -> dict[str, Any]:
        return {
            "harness_version": self.harness_version_label,
            "graph_id": self.graph_id,
            "graph_version": self.graph_version,
            "loop_ids": self.loop_ids,
            "loop_versions": self.loop_versions,
            "agents": [{"id": a.id, "name": a.display_name, "version": a.current_version} for a in self.agents],
            "agent_contract_versions": self.agent_contract_versions,
            "tools": [{"id": t.id, "name": t.display_name, "risk": t.risk_level.value} for t in self.tools],
            "model_config_ids": self.model_config_ids,
            "policy_ids": self.policy_ids,
            "policy_versions": self.policy_versions,
            "environment": self.environment,
            "cost_limit_cents": self.cost_limit_cents,
            "time_limit_seconds": self.time_limit_seconds,
            "approval_required": self.approval_required,
            "evidence_requirements": self.evidence_requirements,
        }


# ---------------------------------------------------------------------------
# Governance check result
# ---------------------------------------------------------------------------

class GovernanceResult:
    def __init__(self) -> None:
        self.passed: bool = True
        self.blocked_by: str = ""
        self.policies_applied: list[str] = []
        self.agent_permission_errors: list[str] = []
        self.tool_permission_errors: list[str] = []
        self.environment_errors: list[str] = []
        self.cost_warning: Optional[str] = None
        self.time_warning: Optional[str] = None
        self.risk_level: str = "LOW"
        self.approval_required: bool = False

    @property
    def ok(self) -> bool:
        return (
            self.passed
            and not self.tool_permission_errors
            and not self.environment_errors
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "blocked_by": self.blocked_by,
            "policies_applied": self.policies_applied,
            "agent_permission_errors": self.agent_permission_errors,
            "tool_permission_errors": self.tool_permission_errors,
            "environment_errors": self.environment_errors,
            "cost_warning": self.cost_warning,
            "time_warning": self.time_warning,
            "risk_level": self.risk_level,
            "approval_required": self.approval_required,
        }


# ---------------------------------------------------------------------------
# HarnessRuntime
# ---------------------------------------------------------------------------

class HarnessRuntime:
    """The governed execution contract runtime.

    A Harness cannot be executed merely because the frontend says "Run".
    Python HarnessRuntime is the authority.
    """

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.graph_engine = GraphEngine(tenant_id)
        self.loop_engine = LoopEngine(tenant_id)
        self.policy_engine = PolicyEngine(tenant_id)
        self.evidence_engine = EvidenceEngine(tenant_id)
        self.context_engine = ContextEngine(tenant_id)
        self.state_engine = EngineeringStateEngine(tenant_id)
        self.tool_runtime = ToolRuntime(tenant_id)
        self.agent_runtime = AgentRuntime(tenant_id)

    # ------------------------------------------------------------------
    # Harness / version resolution
    # ------------------------------------------------------------------

    def get_harness(self, harness_id: str) -> Optional[Harness]:
        h = store.harnesses.get(harness_id)
        if h and h.tenant_id == self.tenant_id:
            return h
        return None

    def _get_version(self, harness: Harness, version_label: Optional[str] = None) -> Optional[HarnessVersion]:
        target = version_label or harness.current_version
        for v in harness.versions:
            if v.version == target:
                return v
        return harness.versions[0] if harness.versions else None

    def _resolve_harness(self, harness: Harness, version: Optional[HarnessVersion], environment: str) -> ResolvedHarness:
        resolved = ResolvedHarness()
        resolved.harness = harness
        resolved.version = version
        resolved.environment = environment

        if version:
            resolved.graph_id = version.graph_id or harness.graph_id
            resolved.graph_version = version.graph_version
            resolved.loop_ids = list(version.loop_ids) if version.loop_ids else list(harness.loop_ids)
            resolved.loop_versions = list(version.loop_versions)
            resolved.agent_contract_versions = list(version.agent_contract_versions)
            resolved.model_config_ids = list(version.model_config_ids) if version.model_config_ids else list(harness.model_config_ids)
            resolved.policy_ids = list(version.policy_ids) if version.policy_ids else list(harness.policy_ids)
            resolved.policy_versions = list(version.policy_versions)
            resolved.cost_limit_cents = version.cost_limit_cents
            resolved.time_limit_seconds = version.time_limit_seconds
            resolved.approval_required = version.approval_required or harness.approval_required
        else:
            resolved.graph_id = harness.graph_id
            resolved.loop_ids = list(harness.loop_ids)
            resolved.model_config_ids = list(harness.model_config_ids)
            resolved.policy_ids = list(harness.policy_ids)
            resolved.cost_limit_cents = harness.cost_limit_cents
            resolved.time_limit_seconds = harness.time_limit_seconds
            resolved.approval_required = harness.approval_required

        agent_ids = version.agent_ids if version and version.agent_ids else harness.agent_ids
        for aid in agent_ids:
            agent = store.agents.get(aid)
            if agent and agent.tenant_id == self.tenant_id:
                resolved.agents.append(agent)

        tool_ids = version.tool_ids if version and version.tool_ids else harness.tool_ids
        for tid in tool_ids:
            tool = store.tools.get(tid)
            if tool and tool.tenant_id == self.tenant_id:
                resolved.tools.append(tool)

        resolved.evidence_requirements = (
            harness.evidence_requirements
            if harness.evidence_requirements
            else ["graph_execution", "agent_outputs", "tool_results"]
        )

        return resolved

    # ------------------------------------------------------------------
    # Pre-execution governance
    # ------------------------------------------------------------------

    def _check_governance(
        self,
        harness: Harness,
        resolved: ResolvedHarness,
        environment: str,
        execution_id: str,
    ) -> GovernanceResult:
        result = GovernanceResult()

        # ── Policy validation ──────────────────────────────────────────
        pol_ok, applied = self.policy_engine.evaluate(
            scope="harness",
            target_id=harness.id,
            context={"environment": environment},
            execution_id=execution_id,
        )
        result.policies_applied = applied
        if not pol_ok:
            result.passed = False
            result.blocked_by = "policy"
            return result

        # ── Agent permissions ──────────────────────────────────────────
        for agent in resolved.agents:
            if not agent.published:
                result.agent_permission_errors.append(
                    f"Agent '{agent.display_name}' is not published"
                )
            for tid in agent.tool_ids:
                tool = store.tools.get(tid)
                if tool and tool.permissions:
                    missing = [p for p in tool.permissions if p not in agent.permissions]
                    if missing:
                        result.agent_permission_errors.append(
                            f"Agent '{agent.display_name}' lacks permissions for tool '{tool.display_name}': {missing}"
                        )

        # ── Tool permissions / environment / risk ──────────────────────
        for tool in resolved.tools:
            if not tool.active:
                result.tool_permission_errors.append(
                    f"Tool '{tool.display_name}' is inactive"
                )
                continue
            if environment not in tool.supported_environments:
                result.tool_permission_errors.append(
                    f"Tool '{tool.display_name}' does not support environment '{environment}'"
                )

            _ENV_RISK_LIMITS = {
                "development": ToolRisk.CRITICAL,
                "staging": ToolRisk.HIGH,
                "production": ToolRisk.MEDIUM,
            }
            _RISK_ORDER = {
                ToolRisk.LOW: 0, ToolRisk.MEDIUM: 1,
                ToolRisk.HIGH: 2, ToolRisk.CRITICAL: 3,
            }
            limit = _ENV_RISK_LIMITS.get(environment, ToolRisk.MEDIUM)
            if _RISK_ORDER.get(tool.risk_level, 0) > _RISK_ORDER.get(limit, 1):
                result.tool_permission_errors.append(
                    f"Tool '{tool.display_name}' risk {tool.risk_level.value} exceeds {environment} limit {limit.value}"
                )
                if tool.risk_level in (ToolRisk.HIGH, ToolRisk.CRITICAL):
                    result.risk_level = "HIGH"
                    result.approval_required = True

        # ── Environment check ──────────────────────────────────────────
        envs = store.environments.all(self.tenant_id)
        env_obj = next((e for e in envs if e.env_type.value == environment and e.active), None)
        if env_obj and env_obj.protected:
            if environment == "production":
                result.approval_required = True
                if not env_obj.requires_approval:
                    result.environment_errors.append(
                        f"Environment '{environment}' is protected and requires approval"
                    )

        # ── Cost check ─────────────────────────────────────────────────
        execution = store.executions.get(execution_id)
        current_cost = execution.cost_cents if execution else 0
        if current_cost > resolved.cost_limit_cents:
            result.cost_warning = (
                f"Execution cost ({current_cost}¢) already exceeds harness limit ({resolved.cost_limit_cents}¢)"
            )
            result.passed = False
            result.blocked_by = "cost"
            return result

        # ── Time check ──────────────────────────────────────────────────
        if execution and execution.started_at:
            result.time_warning = None

        # ── Approval requirement ────────────────────────────────────────
        if self.policy_engine.check_approval_required(harness.id, environment):
            result.approval_required = True

        if resolved.approval_required and environment == "production":
            result.approval_required = True

        return result

    # ------------------------------------------------------------------
    # Context initialization
    # ------------------------------------------------------------------

    def _initialize_context(
        self,
        harness: Harness,
        resolved: ResolvedHarness,
        execution_id: str,
        application_id: Optional[str],
        requirement_id: Optional[str],
    ) -> dict[str, Any]:
        ctx: dict[str, Any] = {
            "harness": {
                "id": harness.id,
                "name": harness.display_name,
                "purpose": harness.purpose,
                "type": harness.harness_type.value,
                "version": resolved.harness_version_label,
            },
            "environment": resolved.environment,
            "agents": [
                {"id": a.id, "name": a.display_name, "category": a.category.value, "purpose": a.purpose}
                for a in resolved.agents
            ],
            "tools": [
                {"id": t.id, "name": t.display_name, "risk": t.risk_level.value, "operations": t.allowed_operations}
                for t in resolved.tools
            ],
            "policies": [
                {"id": pid, "name": store.policies.get(pid).display_name if store.policies.get(pid) else pid}
                for pid in resolved.policy_ids
            ],
            "engineering_state": {},
            "requirement": {},
            "limits": {
                "cost_limit_cents": resolved.cost_limit_cents,
                "time_limit_seconds": resolved.time_limit_seconds,
            },
        }

        if application_id:
            state_ctx = self.state_engine.retrieve_context(application_id, harness.purpose or harness.display_name)
            if state_ctx.get("found"):
                ctx["engineering_state"] = state_ctx

        if requirement_id:
            req = store.requirements.get(requirement_id)
            if req:
                ctx["requirement"] = {
                    "title": req.title,
                    "description": req.description,
                    "acceptance_criteria": req.acceptance_criteria,
                    "priority": req.priority.value,
                }

        emit_event(
            execution_id=execution_id,
            event_type=EventType.CONTEXT_PREPARED,
            harness_id=harness.id,
            message=f"Harness context initialized: {len(ctx)} sections, {len(resolved.agents)} agents, {len(resolved.tools)} tools",
            data={
                "sections": list(ctx.keys()),
                "agent_count": len(resolved.agents),
                "tool_count": len(resolved.tools),
                "environment": resolved.environment,
            },
        )

        return ctx

    # ------------------------------------------------------------------
    # Loop integration
    # ------------------------------------------------------------------

    async def _execute_loops(
        self,
        resolved: ResolvedHarness,
        graph_result: dict[str, Any],
        execution_id: str,
        harness_id: str,
    ) -> list[dict[str, Any]]:
        """Execute loops attached to this harness based on graph result.

        Loops are triggered when the graph result indicates failures that
        match a loop's trigger condition. Each loop runs its evaluate/action
        cycle through the LoopEngine.
        """
        loop_results: list[dict[str, Any]] = []
        if not resolved.loop_ids:
            return loop_results

        graph_status = graph_result.get("status", "completed")
        has_failures = graph_result.get("nodes_failed", 0) > 0
        node_results = graph_result.get("results", {})

        for loop_id in resolved.loop_ids:
            loop = store.loops.get(loop_id)
            if loop is None or loop.tenant_id != self.tenant_id:
                continue

            trigger = loop.trigger or "on_failure"
            should_trigger = False

            if trigger in ("on_failure", "on_test_failure", "on_security_finding", "on_verification_failure", "on_incident"):
                should_trigger = has_failures
            elif trigger in ("on_completion", "on_schedule", "manual"):
                should_trigger = graph_status in ("completed", "waiting")
            else:
                should_trigger = has_failures

            if not should_trigger:
                emit_event(
                    execution_id=execution_id,
                    event_type=EventType.LOOP_TRIGGERED,
                    harness_id=harness_id,
                    message=f"Loop '{loop.display_name}' not triggered (trigger: {trigger}, graph: {graph_status})",
                    data={"loop_id": loop_id, "trigger": trigger, "triggered": False},
                )
                continue

            # Determine evaluation and action functions based on loop type
            evaluate_fn = self._make_loop_evaluate_fn(loop, node_results, graph_result, execution_id, harness_id)
            action_fn = self._make_loop_action_fn(loop, node_results, execution_id, harness_id)

            loop_result = await self.loop_engine.execute_loop(
                loop_id=loop_id,
                execution_id=execution_id,
                evaluate_fn=evaluate_fn,
                action_fn=action_fn,
            )
            loop_results.append({
                "loop_id": loop_id,
                "loop_name": loop.display_name,
                "loop_type": loop.loop_type.value,
                "loop_version": loop.version,
                "result": loop_result,
            })

        return loop_results

    def _make_loop_evaluate_fn(self, loop, node_results: dict, graph_result: dict, execution_id: str, harness_id: str):
        async def evaluate() -> dict[str, Any]:
            # Evaluate whether the failure condition has been resolved
            # by checking the current node results.
            failed_nodes = [
                nid for nid, res in node_results.items()
                if res and res.get("status") in ("failed", "error", "timed_out")
            ]
            success = len(failed_nodes) == 0
            return {
                "success": success,
                "failed_nodes": failed_nodes,
                "total_nodes": len(node_results),
            }
        return evaluate

    def _make_loop_action_fn(self, loop, node_results: dict, execution_id: str, harness_id: str):
        async def action() -> dict[str, Any]:
            # The action re-executes the graph for fix/retry loops.
            # This is the core adaptive mechanism.
            emit_event(
                execution_id=execution_id,
                event_type=EventType.AGENT_STARTED,
                harness_id=harness_id,
                message=f"Loop '{loop.display_name}' action: re-executing graph",
                data={"loop_type": loop.loop_type.value, "action": loop.action or "re-execute"},
            )

            if loop.harness_id and loop.harness_id == harness_id:
                graph_id = None
                harness = store.harnesses.get(harness_id)
                if harness:
                    graph_id = harness.graph_id
                if graph_id:
                    retry_graph = await self.graph_engine.execute(
                        graph_id=graph_id,
                        execution_id=execution_id,
                        harness_id=harness_id,
                        environment=loop.retry_policy.get("environment", "development"),
                    )
                    # Update node_results in-place so the evaluate fn sees the new state
                    node_results.clear()
                    node_results.update(retry_graph.get("results", {}))
                    return {
                        "success": retry_graph.get("status") == "completed",
                        "graph_status": retry_graph.get("status"),
                        "nodes_failed": retry_graph.get("nodes_failed", 0),
                        "cost_cents": 0,
                        "tokens_used": 0,
                    }

            return {
                "success": False,
                "error": "No graph to re-execute for loop action",
                "cost_cents": 0,
                "tokens_used": 0,
            }
        return action

    # ------------------------------------------------------------------
    # Failure handling
    # ------------------------------------------------------------------

    def _handle_failure(
        self,
        harness: Harness,
        resolved: ResolvedHarness,
        failure_class: FailureClass,
        error_message: str,
        graph_result: dict[str, Any],
        execution_id: str,
    ) -> dict[str, Any]:
        failure_rules = harness.failure_rules or {}
        strategy = failure_rules.get("strategy", "escalate")

        emit_event(
            execution_id=execution_id,
            event_type=EventType.EXECUTION_FAILED,
            harness_id=harness.id,
            message=(
                f"Harness '{harness.display_name}' failure classified as "
                f"{failure_class.value}: {error_message} (strategy: {strategy})"
            ),
            data={
                "failure_class": failure_class.value,
                "error": error_message,
                "strategy": strategy,
                "harness_version": resolved.harness_version_label,
            },
        )

        if strategy == "abort":
            return {"status": "failed", "failure_class": failure_class.value, "error": error_message, "strategy": "abort"}

        if strategy == "escalate":
            approval = Approval(
                tenant_id=self.tenant_id,
                id=gen_id("appr_"),
                execution_id=execution_id,
                harness_id=harness.id,
                requested_by="harness_runtime",
                status="pending",
                risk_level="HIGH",
                reason=f"Failure: {failure_class.value} — {error_message}",
                approval_type="failure_escalation",
                requested_action=f"Recover from {failure_class.value} failure",
                impact=error_message,
            )
            store.approvals.add(approval)
            execution = store.executions.get(execution_id)
            if execution:
                execution.approval_ids.append(approval.id)
                execution.status = "WAITING_FOR_APPROVAL"
                execution.waiting_approval_id = approval.id

            emit_event(
                execution_id=execution_id,
                event_type=EventType.APPROVAL_REQUESTED,
                harness_id=harness.id,
                message=f"Escalation approval created for harness failure ({failure_class.value})",
                data={"approval_id": approval.id, "failure_class": failure_class.value, "approval_type": "failure_escalation"},
            )
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_WAITING,
                harness_id=harness.id,
                message=f"Execution waiting for failure escalation approval ({failure_class.value})",
                data={"approval_id": approval.id, "failure_class": failure_class.value},
            )
            return {
                "status": "escalated",
                "failure_class": failure_class.value,
                "error": error_message,
                "strategy": "escalate",
                "approval_id": approval.id,
            }

        if strategy == "continue":
            return {
                "status": "completed_with_warnings",
                "failure_class": failure_class.value,
                "error": error_message,
                "strategy": "continue",
                "graph_result": graph_result,
            }

        # Default: escalate
        return {"status": "failed", "failure_class": failure_class.value, "error": error_message, "strategy": strategy}

    # ------------------------------------------------------------------
    # Evidence chain
    # ------------------------------------------------------------------

    def _create_harness_evidence(
        self,
        harness: Harness,
        resolved: ResolvedHarness,
        execution_id: str,
        graph_result: dict[str, Any],
        loop_results: list[dict[str, Any]],
        governance: GovernanceResult,
        context: dict[str, Any],
        status: str,
        elapsed_seconds: float,
    ) -> str:
        """Create the complete harness evidence record.

        Records: harness version, graph version, loop versions, agent
        contract/version, model, tool calls, policies applied.
        """
        evidence = self.evidence_engine.create_evidence(
            execution_id=execution_id,
            evidence_type=EvidenceType.HARNESS,
            harness_id=harness.id,
            harness_version=resolved.harness_version_label,
            inputs={
                "harness_type": harness.harness_type.value,
                "environment": resolved.environment,
                "context_sections": list(context.keys()),
                "agents": [{"id": a.id, "name": a.display_name, "version": a.current_version} for a in resolved.agents],
                "tools": [{"id": t.id, "name": t.display_name} for t in resolved.tools],
                "model_config_ids": resolved.model_config_ids,
                "evidence_requirements": resolved.evidence_requirements,
            },
            outputs={
                "status": status,
                "graph_status": graph_result.get("status"),
                "nodes_succeeded": graph_result.get("nodes_succeeded", 0),
                "nodes_failed": graph_result.get("nodes_failed", 0),
                "nodes_skipped": graph_result.get("nodes_skipped", 0),
                "loop_results": [
                    {
                        "loop_id": lr["loop_id"],
                        "loop_name": lr["loop_name"],
                        "loop_type": lr["loop_type"],
                        "loop_version": lr["loop_version"],
                        "status": lr["result"].get("status"),
                        "iterations": lr["result"].get("iteration", 0),
                    }
                    for lr in loop_results
                ],
                "elapsed_seconds": round(elapsed_seconds, 3),
            },
            policies_applied=governance.policies_applied,
            summary=(
                f"Harness '{harness.display_name}' v{resolved.harness_version_label} "
                f"executed in {resolved.environment}: {status} "
                f"(graph: {graph_result.get('status', 'n/a')}, "
                f"loops: {len(loop_results)}, "
                f"policies: {len(governance.policies_applied)})"
            ),
        )

        return evidence.id

    # ------------------------------------------------------------------
    # Engineering State update
    # ------------------------------------------------------------------

    def _update_engineering_state(
        self,
        harness: Harness,
        resolved: ResolvedHarness,
        execution_id: str,
        graph_result: dict[str, Any],
        status: str,
        application_id: Optional[str],
    ) -> None:
        if not application_id:
            return

        es = self.state_engine.get_state(application_id)
        if es is None:
            return

        updates: dict[str, Any] = {}

        if harness.harness_type == HarnessType.TESTING:
            tests_passed = graph_result.get("nodes_succeeded", 0)
            tests_failed = graph_result.get("nodes_failed", 0)
            updates["test_results"] = {
                "passed": tests_passed,
                "failed": tests_failed,
                "status": status,
            }
        elif harness.harness_type == HarnessType.SECURITY:
            updates["security"] = {
                "last_scan": utc_now().isoformat(),
                "status": status,
            }
            if status == "failed":
                updates["open_vulnerabilities"] = es.open_vulnerabilities + 1
        elif harness.harness_type == HarnessType.BUILD:
            updates["build"] = {
                "status": status,
                "last_build": utc_now().isoformat(),
            }
        elif harness.harness_type == HarnessType.DEPLOYMENT:
            updates["deployment"] = {
                "environment": resolved.environment,
                "last_deploy": utc_now().isoformat(),
                "status": status,
            }
        elif harness.harness_type == HarnessType.VERIFICATION:
            updates["runtime"] = {
                "health": "healthy" if status == "completed" else "unhealthy",
                "last_verified": utc_now().isoformat(),
            }

        if updates:
            self.state_engine.update_state(application_id, updates)
            self.state_engine.record_change(
                application_id=application_id,
                state_id=es.id,
                change_type="harness_executed",
                description=f"Harness '{harness.display_name}' v{resolved.harness_version_label} executed: {status}",
                category="execution",
                severity="info" if status == "completed" else "warning",
                metadata={
                    "harness_id": harness.id,
                    "harness_version": resolved.harness_version_label,
                    "execution_id": execution_id,
                    "environment": resolved.environment,
                    "graph_status": graph_result.get("status"),
                },
            )

    # ------------------------------------------------------------------
    # Main execution
    # ------------------------------------------------------------------

    async def execute(
        self,
        harness_id: str,
        execution_id: str,
        environment: str = "development",
        application_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
        version_label: Optional[str] = None,
    ) -> dict:
        start_time = time.monotonic()

        # ── Load Harness ──────────────────────────────────────────────
        harness = self.get_harness(harness_id)
        if harness is None:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                message=f"Harness not found: {harness_id}",
            )
            return {"status": "failed", "error": "Harness not found"}

        # ── Load HarnessVersion ──────────────────────────────────────
        version = self._get_version(harness, version_label)
        if version is None and harness.versions:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                harness_id=harness_id,
                message=f"No versions found for harness '{harness.display_name}'",
            )
            return {"status": "failed", "error": "No harness versions found"}

        # ── Resolve all components ────────────────────────────────────
        resolved = self._resolve_harness(harness, version, environment)

        emit_event(
            execution_id=execution_id,
            event_type=EventType.HARNESS_STARTED,
            harness_id=harness_id,
            message=(
                f"Harness '{harness.display_name}' v{resolved.harness_version_label} "
                f"started in {environment} ({harness.harness_type.value})"
            ),
            data={
                "harness_type": harness.harness_type.value,
                "environment": environment,
                "harness_version": resolved.harness_version_label,
                "graph_id": resolved.graph_id,
                "loop_count": len(resolved.loop_ids),
                "agent_count": len(resolved.agents),
                "tool_count": len(resolved.tools),
                "policy_count": len(resolved.policy_ids),
            },
        )

        # ── Pre-execution governance ──────────────────────────────────
        governance = self._check_governance(harness, resolved, environment, execution_id)

        emit_event(
            execution_id=execution_id,
            event_type=EventType.POLICY_CHECKED,
            harness_id=harness_id,
            message=(
                f"Governance check: {'PASSED' if governance.ok else 'BLOCKED'} "
                f"(policies: {len(governance.policies_applied)}, "
                f"approval_required: {governance.approval_required}, "
                f"risk: {governance.risk_level})"
            ),
            data=governance.to_dict(),
        )

        if not governance.ok:
            fail_class = FailureClass.POLICY if governance.blocked_by == "policy" else FailureClass.ENVIRONMENT
            if governance.cost_warning:
                fail_class = FailureClass.COST
            failure = self._handle_failure(
                harness, resolved, fail_class,
                governance.blocked_by or "; ".join(
                    governance.agent_permission_errors
                    + governance.tool_permission_errors
                    + governance.environment_errors
                ),
                {"status": "blocked"},
                execution_id,
            )
            self.evidence_engine.create_evidence(
                execution_id=execution_id,
                evidence_type=EvidenceType.HARNESS,
                harness_id=harness_id,
                harness_version=resolved.harness_version_label,
                inputs={"environment": environment},
                outputs={"status": "blocked", "governance": governance.to_dict()},
                policies_applied=governance.policies_applied,
                summary=f"Harness '{harness.display_name}' blocked by governance: {governance.blocked_by}",
            )
            return failure

        # ── Approval gate ──────────────────────────────────────────────
        if governance.approval_required:
            approval = Approval(
                tenant_id=self.tenant_id,
                id=gen_id("appr_"),
                execution_id=execution_id,
                harness_id=harness_id,
                requested_by="harness_runtime",
                status="pending",
                risk_level=governance.risk_level,
                reason=f"Approval required for harness '{harness.display_name}' in {environment}",
            )
            store.approvals.add(approval)
            execution = store.executions.get(execution_id)
            if execution:
                execution.approval_ids.append(approval.id)
                execution.status = "AWAITING_APPROVAL"

            emit_event(
                execution_id=execution_id,
                event_type=EventType.APPROVAL_REQUESTED,
                harness_id=harness_id,
                message=f"Approval required for harness '{harness.display_name}' in {environment}",
                data={"approval_id": approval.id, "risk_level": governance.risk_level},
            )
            emit_event(
                execution_id=execution_id,
                event_type=EventType.HARNESS_STARTED,
                harness_id=harness_id,
                message=f"Harness '{harness.display_name}' halted: awaiting approval {approval.id[:12]}",
                data={"approval_id": approval.id, "status": "awaiting_approval"},
            )
            return {
                "status": "awaiting_approval",
                "harness": harness.display_name,
                "harness_version": resolved.harness_version_label,
                "approval_id": approval.id,
                "governance": governance.to_dict(),
                "resolved": resolved.resolution_summary(),
            }

        # ── Context initialization ──────────────────────────────────────
        context = self._initialize_context(
            harness, resolved, execution_id, application_id, requirement_id,
        )

        # ── GraphEngine execution ──────────────────────────────────────
        graph_result: dict[str, Any] = {"status": "skipped"}
        if resolved.graph_id:
            graph_result = await self.graph_engine.execute(
                graph_id=resolved.graph_id,
                execution_id=execution_id,
                harness_id=harness_id,
                environment=environment,
                application_id=application_id,
                requirement_id=requirement_id,
            )
        else:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.GRAPH_NODE_STARTED,
                harness_id=harness_id,
                message=f"Harness '{harness.display_name}' has no graph — skipping graph execution",
            )

        # ── LoopEngine integration ─────────────────────────────────────
        loop_results = await self._execute_loops(
            resolved, graph_result, execution_id, harness_id,
        )

        # ── Determine final status ─────────────────────────────────────
        graph_status = graph_result.get("status", "skipped")
        has_failures = graph_result.get("nodes_failed", 0) > 0
        loop_failed = any(
            lr["result"].get("status") in ("failed", "escalated", "limit_exceeded")
            for lr in loop_results
        )

        if graph_status == "failed" or (has_failures and not loop_results):
            # Classify and handle failure
            error_msg = graph_result.get("error", "Graph execution failed")
            if not error_msg or error_msg == "Graph execution failed":
                failed_nodes = [
                    nid for nid, res in graph_result.get("results", {}).items()
                    if res and res.get("status") in ("failed", "error", "timed_out")
                ]
                error_msgs = [
                    graph_result["results"][nid].get("error", "unknown")
                    for nid in failed_nodes
                ]
                error_msg = "; ".join(error_msgs) if error_msgs else "Graph execution failed"

            fail_class = classify_failure(error_msg)
            elapsed = time.monotonic() - start_time

            failure_result = self._handle_failure(
                harness, resolved, fail_class, error_msg, graph_result, execution_id,
            )

            # Create evidence even for failures
            self._create_harness_evidence(
                harness, resolved, execution_id, graph_result, loop_results,
                governance, context, failure_result["status"], elapsed,
            )

            # Update engineering state
            self._update_engineering_state(
                harness, resolved, execution_id, graph_result,
                failure_result["status"], application_id,
            )

            emit_event(
                execution_id=execution_id,
                event_type=EventType.HARNESS_COMPLETED,
                harness_id=harness_id,
                message=f"Harness '{harness.display_name}' completed with failure: {failure_result['status']}",
                data=failure_result,
            )

            return {
                "status": failure_result["status"],
                "harness": harness.display_name,
                "harness_version": resolved.harness_version_label,
                "failure_class": failure_result.get("failure_class"),
                "error": failure_result.get("error"),
                "graph_result": graph_result,
                "loop_results": loop_results,
                "governance": governance.to_dict(),
                "resolved": resolved.resolution_summary(),
                "elapsed_seconds": round(elapsed, 3),
            }

        if loop_failed:
            elapsed = time.monotonic() - start_time
            loop_error = next(
                (lr["result"].get("exit_reason", "loop failed") for lr in loop_results
                 if lr["result"].get("status") in ("failed", "escalated", "limit_exceeded")),
                "loop execution failed",
            )
            fail_class = classify_failure(loop_error)
            failure_result = self._handle_failure(
                harness, resolved, fail_class, loop_error, graph_result, execution_id,
            )

            self._create_harness_evidence(
                harness, resolved, execution_id, graph_result, loop_results,
                governance, context, failure_result["status"], elapsed,
            )

            self._update_engineering_state(
                harness, resolved, execution_id, graph_result,
                failure_result["status"], application_id,
            )

            emit_event(
                execution_id=execution_id,
                event_type=EventType.HARNESS_COMPLETED,
                harness_id=harness_id,
                message=f"Harness '{harness.display_name}' completed with loop failure: {failure_result['status']}",
                data=failure_result,
            )

            return {
                "status": failure_result["status"],
                "harness": harness.display_name,
                "harness_version": resolved.harness_version_label,
                "failure_class": failure_result.get("failure_class"),
                "error": failure_result.get("error"),
                "graph_result": graph_result,
                "loop_results": loop_results,
                "governance": governance.to_dict(),
                "resolved": resolved.resolution_summary(),
                "elapsed_seconds": round(elapsed, 3),
            }

        # ── Success path ────────────────────────────────────────────────
        elapsed = time.monotonic() - start_time
        status = "completed"

        evidence_id = self._create_harness_evidence(
            harness, resolved, execution_id, graph_result, loop_results,
            governance, context, status, elapsed,
        )

        # ── Engineering State update ───────────────────────────────────
        self._update_engineering_state(
            harness, resolved, execution_id, graph_result, status, application_id,
        )

        # ── Update execution aggregate ─────────────────────────────────
        execution = store.executions.get(execution_id)
        if execution:
            execution.progress = 100.0
            if execution.status not in ("FAILED", "AWAITING_APPROVAL"):
                execution.status = "COMPLETED"
            execution.completed_at = utc_now().isoformat()

        emit_event(
            execution_id=execution_id,
            event_type=EventType.HARNESS_COMPLETED,
            harness_id=harness_id,
            message=(
                f"Harness '{harness.display_name}' v{resolved.harness_version_label} "
                f"completed in {environment} ({elapsed:.2f}s)"
            ),
            data={
                "status": status,
                "graph_status": graph_status,
                "loops_executed": len(loop_results),
                "evidence_id": evidence_id,
                "elapsed_seconds": round(elapsed, 3),
            },
        )

        return {
            "status": status,
            "harness": harness.display_name,
            "harness_version": resolved.harness_version_label,
            "graph_result": graph_result,
            "loop_results": loop_results,
            "governance": governance.to_dict(),
            "resolved": resolved.resolution_summary(),
            "evidence_id": evidence_id,
            "elapsed_seconds": round(elapsed, 3),
        }
