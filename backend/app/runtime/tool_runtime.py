"""ToolRuntime — the governed tool execution pipeline.

Pipeline:
    Agent → Tool Request → Permission Check → Policy Check → Risk Check
    → Environment Check → Input Validation → Execution → Result → Evidence

Every tool execution emits events at each pipeline stage and creates
immutable Evidence. Real adapters are used where the environment permits;
stub adapters return real configuration errors — never fake success.
"""

from __future__ import annotations

import time
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.tool import Tool, ToolRisk
from ..domain.models.base import gen_id
from ..domain.models.execution import ExecutionEvent, EventType
from ..domain.models.evidence import EvidenceType
from ..events.emit import emit_event
from .evidence_engine import EvidenceEngine
from .tool_adapters import ToolResult, get_adapter


# Risk thresholds: environment → max risk level allowed without explicit approval
_ENV_RISK_LIMITS: dict[str, ToolRisk] = {
    "development": ToolRisk.CRITICAL,
    "staging": ToolRisk.HIGH,
    "production": ToolRisk.MEDIUM,
}

_RISK_ORDER = {
    ToolRisk.LOW: 0,
    ToolRisk.MEDIUM: 1,
    ToolRisk.HIGH: 2,
    ToolRisk.CRITICAL: 3,
}


class ToolRuntime:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.evidence_engine = EvidenceEngine(tenant_id)

    # ------------------------------------------------------------------
    # Tool resolution
    # ------------------------------------------------------------------

    def get_tool(self, tool_id: str) -> Optional[Tool]:
        tool = store.tools.get(tool_id)
        if tool and tool.tenant_id == self.tenant_id:
            return tool
        return None

    # ------------------------------------------------------------------
    # Pipeline checks
    # ------------------------------------------------------------------

    def check_permissions(
        self, tool: Tool, operation: str, environment: str
    ) -> tuple[bool, str]:
        if not tool.active:
            return False, f"Tool '{tool.display_name}' is inactive"
        if operation not in tool.allowed_operations:
            return False, (
                f"Operation '{operation}' not allowed for tool '{tool.display_name}'. "
                f"Allowed: {', '.join(tool.allowed_operations)}"
            )
        if environment not in tool.supported_environments:
            return False, (
                f"Environment '{environment}' not supported for tool "
                f"'{tool.display_name}'. Supported: {', '.join(tool.supported_environments)}"
            )
        return True, ""

    def check_policies(
        self, tool: Tool, environment: str, execution_id: str, node_id: Optional[str]
    ) -> tuple[bool, list[str]]:
        applied: list[str] = []
        for policy in store.policies.all(self.tenant_id):
            if not policy.active:
                continue
            if policy.scope.value == "environment" and policy.target_id == environment:
                applied.append(policy.display_name)
                if policy.policy_type.value == "prohibit":
                    return False, applied
            if policy.scope.value == "tool" and policy.target_id == environment:
                applied.append(policy.display_name)
                if policy.policy_type.value == "prohibit":
                    return False, applied
        return True, applied

    def check_risk(
        self, tool: Tool, environment: str
    ) -> tuple[bool, str]:
        limit = _ENV_RISK_LIMITS.get(environment, ToolRisk.MEDIUM)
        if _RISK_ORDER[tool.risk_level] > _RISK_ORDER[limit]:
            return False, (
                f"Tool '{tool.display_name}' risk level {tool.risk_level.value} "
                f"exceeds environment '{environment}' limit {limit.value}"
            )
        return True, ""

    def check_environment(
        self, tool: Tool, environment: str
    ) -> tuple[bool, str]:
        envs = store.environments.all(self.tenant_id)
        env = next((e for e in envs if e.env_type.value == environment and e.active), None)
        if env and env.protected and tool.risk_level in (ToolRisk.HIGH, ToolRisk.CRITICAL):
            if not env.requires_approval:
                return False, (
                    f"Environment '{environment}' is protected — "
                    f"high-risk tool execution requires approval"
                )
        return True, ""

    def validate_input(
        self, tool: Tool, operation: str, params: dict
    ) -> tuple[bool, str]:
        if not params and tool.input_validation:
            required_keys = tool.input_validation.get("required", [])
            for key in required_keys:
                if key not in params:
                    return False, f"Missing required parameter: {key}"
        return True, ""

    # ------------------------------------------------------------------
    # Output truncation
    # ------------------------------------------------------------------

    def _truncate_output(self, text: str, max_lines: int, max_bytes: int) -> str:
        if not text:
            return ""
        if len(text) > max_bytes:
            text = text[:max_bytes] + "\n... [truncated]"
        lines = text.split("\n")
        if len(lines) > max_lines:
            text = "\n".join(lines[:max_lines]) + "\n... [truncated]"
        return text

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def execute(
        self,
        tool_id: str,
        operation: str,
        params: dict,
        execution_id: str,
        environment: str = "development",
        agent_id: Optional[str] = None,
        node_id: Optional[str] = None,
        harness_id: Optional[str] = None,
    ) -> dict:
        # ── 1. Tool Request ────────────────────────────────────────────
        emit_event(
            execution_id=execution_id,
            event_type=EventType.TOOL_REQUESTED,
            tool_id=tool_id,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Tool request: operation='{operation}', environment='{environment}'",
            data={"operation": operation, "environment": environment, "params_keys": list(params.keys())},
        )

        tool = self.get_tool(tool_id)
        if tool is None:
            return {"status": "failed", "error": "Tool not found", "tool_id": tool_id}

        # ── 2. Permission Check ───────────────────────────────────────
        perm_ok, perm_msg = self.check_permissions(tool, operation, environment)
        emit_event(
            execution_id=execution_id,
            event_type=EventType.PERMISSION_CHECKED,
            tool_id=tool_id,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Permission check: {'PASSED' if perm_ok else 'FAILED — ' + perm_msg}",
            data={"passed": perm_ok, "operation": operation, "environment": environment},
        )
        if not perm_ok:
            return {"status": "failed", "error": perm_msg, "tool": tool.display_name}

        # ── 3. Policy Check ───────────────────────────────────────────
        pol_ok, policies_applied = self.check_policies(tool, environment, execution_id, node_id)
        emit_event(
            execution_id=execution_id,
            event_type=EventType.POLICY_CHECKED,
            tool_id=tool_id,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Policy check: {'PASSED' if pol_ok else 'FAILED — prohibited by policy'}",
            data={"passed": pol_ok, "policies_applied": policies_applied},
        )
        if not pol_ok:
            return {
                "status": "failed",
                "error": f"Policy prohibits tool execution in {environment}",
                "tool": tool.display_name,
                "policies_applied": policies_applied,
            }

        # ── 4. Risk Check ─────────────────────────────────────────────
        risk_ok, risk_msg = self.check_risk(tool, environment)
        emit_event(
            execution_id=execution_id,
            event_type=EventType.PERMISSION_CHECKED,
            tool_id=tool_id,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Risk check: {'PASSED' if risk_ok else 'FAILED — ' + risk_msg}",
            data={"passed": risk_ok, "risk_level": tool.risk_level.value, "environment": environment},
        )
        if not risk_ok:
            return {"status": "failed", "error": risk_msg, "tool": tool.display_name}

        # ── 5. Environment Check ──────────────────────────────────────
        env_ok, env_msg = self.check_environment(tool, environment)
        if not env_ok:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.POLICY_CHECKED,
                tool_id=tool_id,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Environment check: FAILED — {env_msg}",
                data={"passed": False, "environment": environment},
            )
            return {"status": "failed", "error": env_msg, "tool": tool.display_name}

        # ── 6. Input Validation ───────────────────────────────────────
        input_ok, input_msg = self.validate_input(tool, operation, params)
        if not input_ok:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.PERMISSION_CHECKED,
                tool_id=tool_id,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Input validation: FAILED — {input_msg}",
                data={"passed": False},
            )
            return {"status": "failed", "error": input_msg, "tool": tool.display_name}

        # ── 7. Execution ──────────────────────────────────────────────
        adapter = get_adapter(tool.name)
        if adapter is None:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.TOOL_EXECUTED,
                tool_id=tool_id,
                agent_id=agent_id,
                node_id=node_id,
                message=f"No adapter registered for tool '{tool.display_name}' ({tool.name})",
                data={"adapter": None},
            )
            return {
                "status": "failed",
                "error": f"No adapter registered for tool '{tool.name}'",
                "tool": tool.display_name,
            }

        emit_event(
            execution_id=execution_id,
            event_type=EventType.TOOL_EXECUTED,
            tool_id=tool_id,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Executing '{tool.display_name}' operation '{operation}' in {environment}",
            data={"adapter": adapter.name, "operation": operation, "environment": environment},
        )

        start = time.monotonic()
        try:
            result: ToolResult = await adapter.run(
                operation=operation,
                params=params,
                env={"FORGEIQ_ENV": environment},
                timeout=tool.timeout_seconds,
                working_dir=params.get("working_dir"),
            )
        except Exception as exc:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            result = ToolResult(
                exit_code=1,
                stderr=f"Adapter error: {type(exc).__name__}: {exc}",
                duration_ms=elapsed_ms,
            )

        # ── 8. Apply output limits ────────────────────────────────────
        max_lines = tool.output_limits.get("max_lines", 10000)
        max_bytes = tool.output_limits.get("max_bytes", 1048576)
        stdout = self._truncate_output(result.stdout, max_lines, max_bytes)
        stderr = self._truncate_output(result.stderr, max_lines, max_bytes)

        success = result.exit_code == 0
        status = "success" if success else "failed"

        # ── 9. Result ──────────────────────────────────────────────────
        tool_result = {
            "tool": tool.display_name,
            "tool_name": tool.name,
            "operation": operation,
            "status": status,
            "exit_code": result.exit_code,
            "stdout": stdout,
            "stderr": stderr,
            "duration_ms": result.duration_ms,
            "files_changed": result.files_changed,
            "environment": environment,
            "evidence": {
                "command": f"{tool.name} {operation}",
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "working_dir": params.get("working_dir"),
            },
        }

        emit_event(
            execution_id=execution_id,
            event_type=EventType.TOOL_RESULT,
            tool_id=tool_id,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Tool '{tool.display_name}' result: {status} (exit {result.exit_code}, {result.duration_ms}ms)",
            data={
                "status": status,
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "stdout_len": len(stdout),
                "stderr_len": len(stderr),
                "files_changed": result.files_changed,
            },
        )

        # ── 10. Evidence ──────────────────────────────────────────────
        self.evidence_engine.create_evidence(
            execution_id=execution_id,
            evidence_type=EvidenceType.TOOL,
            agent_id=agent_id,
            tool_id=tool_id,
            harness_id=harness_id,
            node_id=node_id,
            inputs={
                "operation": operation,
                "params": params,
                "environment": environment,
            },
            outputs=tool_result,
            policies_applied=policies_applied,
            summary=(
                f"Tool '{tool.display_name}' {operation} in {environment}: "
                f"{status} (exit {result.exit_code}, {result.duration_ms}ms)"
            ),
        )

        return tool_result
