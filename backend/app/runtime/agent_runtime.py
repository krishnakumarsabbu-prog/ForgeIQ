from __future__ import annotations

import asyncio
import time
from enum import Enum
from typing import Any, Optional

from ..storage.in_memory import store
from ..domain.models.agent import Agent, AgentContract, AgentVersion
from ..domain.models.model_config import ModelConfiguration, ModelProvider
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType, Execution
from ..domain.models.evidence import EvidenceType
from ..events.emit import emit_event
from .model_providers import ModelInvocationResult
from .model_runtime import ModelRuntime
from .evidence_engine import EvidenceEngine
from .tool_runtime import ToolRuntime
from .policy_engine import PolicyEngine


class AgentExecutionState(str, Enum):
    PENDING = "Pending"
    PREPARING = "Preparing"
    RUNNING = "Running"
    WAITING_FOR_TOOL = "WaitingForTool"
    EVALUATING = "Evaluating"
    SUCCEEDED = "Succeeded"
    FAILED = "Failed"
    CANCELLED = "Cancelled"
    TIMED_OUT = "TimedOut"


class ContractValidationError(Exception):
    pass


class AgentRuntime:
    """Executes AgentContracts through the full ForgeIQ execution pipeline.

    Load Agent → Load Version → Validate Contract → Prepare Context →
    Resolve Model → Validate Tools → Execute Agent → Validate Output →
    Create Evidence
    """

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.evidence_engine = EvidenceEngine(tenant_id)
        self.tool_runtime = ToolRuntime(tenant_id)
        self.policy_engine = PolicyEngine(tenant_id)
        self.model_runtime = ModelRuntime(tenant_id)

    # ------------------------------------------------------------------
    # Agent / version resolution
    # ------------------------------------------------------------------

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        agent = store.agents.get(agent_id)
        if agent and agent.tenant_id == self.tenant_id:
            return agent
        return None

    def get_version(self, agent: Agent, version_label: Optional[str] = None) -> Optional[AgentVersion]:
        target = version_label or agent.current_version
        for v in agent.versions:
            if v.version == target:
                return v
        # Fall back to first version if the labelled one doesn't exist.
        return agent.versions[0] if agent.versions else None

    def _resolve_contract(self, agent: Agent, version: Optional[AgentVersion]) -> AgentContract:
        if version and version.contract:
            return version.contract
        return agent.contract

    # ------------------------------------------------------------------
    # Contract validation
    # ------------------------------------------------------------------

    def validate_contract(
        self,
        agent: Agent,
        contract: AgentContract,
        inputs: dict,
    ) -> tuple[bool, str]:
        # 1. Published check
        if not agent.published:
            return False, f"Agent '{agent.display_name}' is not published."

        # 2. Input schema — required fields
        required = contract.input_schema.get("required", [])
        for key in required:
            if key not in inputs:
                return False, f"Missing required input: {key}"

        # 3. Skills — referenced skill IDs must exist and belong to tenant
        for sid in contract.skill_ids:
            skill = store.skills.get(sid)
            if not skill:
                return False, f"Skill '{sid}' referenced in contract does not exist."
            if skill.tenant_id != self.tenant_id:
                return False, f"Skill '{sid}' does not belong to this tenant."

        # 4. Tools — referenced tool IDs must exist and belong to tenant
        for tid in contract.tool_ids:
            tool = store.tools.get(tid)
            if not tool:
                return False, f"Tool '{tid}' referenced in contract does not exist."
            if tool.tenant_id != self.tenant_id:
                return False, f"Tool '{tid}' does not belong to this tenant."

        # 5. Model — must exist and be active
        if contract.model_config_id:
            model = store.models.get(contract.model_config_id)
            if model is None:
                return False, f"Model '{contract.model_config_id}' not found."
            if model.tenant_id != self.tenant_id:
                return False, f"Model '{contract.model_config_id}' does not belong to this tenant."
            if not model.active:
                return False, f"Model '{model.display_name or model.model}' is not active."

        # 6. Permissions — agent must declare permissions for any tool it binds
        for tid in contract.tool_ids:
            tool = store.tools.get(tid)
            if tool and tool.permissions:
                missing = [p for p in tool.permissions if p not in contract.permissions]
                if missing:
                    return False, (
                        f"Agent lacks permissions for tool '{tool.display_name}': "
                        f"missing {missing}"
                    )

        # 7. Budget sanity
        if contract.token_budget <= 0:
            return False, "Token budget must be positive."
        if contract.cost_budget_cents <= 0:
            return False, "Cost budget must be positive."
        if contract.timeout_seconds <= 0:
            return False, "Timeout must be positive."
        if contract.max_turns <= 0:
            return False, "Max turns must be positive."

        return True, ""

    def validate_output(
        self,
        contract: AgentContract,
        output: dict,
    ) -> tuple[bool, str]:
        required_out = contract.output_schema.get("required", [])
        for key in required_out:
            if key not in output:
                return False, f"Missing required output field: {key}"
        return True, ""

    # ------------------------------------------------------------------
    # Context preparation
    # ------------------------------------------------------------------

    def prepare_context(
        self,
        agent: Agent,
        inputs: dict,
        execution_id: str,
        node_id: Optional[str] = None,
    ) -> dict:
        context: dict[str, Any] = {
            "agent": {
                "name": agent.display_name,
                "purpose": agent.purpose,
                "role": agent.role,
                "category": agent.category.value,
            },
            "inputs": inputs,
            "skills": [],
            "tools": [],
            "engineering_state": {},
            "policies": [],
        }

        for sid in agent.skill_ids:
            s = store.skills.get(sid)
            if s:
                context["skills"].append({
                    "id": s.id,
                    "name": s.display_name,
                    "language": s.language,
                    "framework": s.framework,
                })

        for tid in agent.tool_ids:
            t = store.tools.get(tid)
            if t:
                context["tools"].append({
                    "id": t.id,
                    "name": t.display_name,
                    "risk_level": t.risk_level.value,
                    "allowed_operations": t.allowed_operations,
                })

        emit_event(
            execution_id=execution_id,
            event_type=EventType.CONTEXT_PREPARED,
            agent_id=agent.id,
            node_id=node_id,
            message=f"Context prepared for '{agent.display_name}'",
            data={
                "skills": len(context["skills"]),
                "tools": len(context["tools"]),
                "input_keys": list(inputs.keys()),
            },
        )
        return context

    # ------------------------------------------------------------------
    # Model resolution
    # ------------------------------------------------------------------

    def resolve_model(self, contract: AgentContract) -> tuple[Optional[ModelConfiguration], str]:
        if not contract.model_config_id:
            return None, "No model configured for this agent contract."
        model = store.models.get(contract.model_config_id)
        if model is None:
            return None, f"Model '{contract.model_config_id}' not found."
        if model.tenant_id != self.tenant_id:
            return None, f"Model '{model.display_name}' does not belong to this tenant."
        if not model.active:
            return None, f"Model '{model.display_name or model.model}' is not active."
        return model, ""

    # ------------------------------------------------------------------
    # Tool validation
    # ------------------------------------------------------------------

    def validate_tools(
        self,
        contract: AgentContract,
        execution_id: str,
        node_id: Optional[str] = None,
    ) -> tuple[bool, list[str]]:
        resolved: list[str] = []
        for tid in contract.tool_ids:
            tool = store.tools.get(tid)
            if tool is None:
                emit_event(
                    execution_id=execution_id,
                    event_type=EventType.PERMISSION_CHECKED,
                    tool_id=tid,
                    node_id=node_id,
                    message=f"Tool validation failed: '{tid}' not found",
                )
                return False, resolved
            if not tool.active:
                emit_event(
                    execution_id=execution_id,
                    event_type=EventType.PERMISSION_CHECKED,
                    tool_id=tid,
                    node_id=node_id,
                    message=f"Tool validation failed: '{tool.display_name}' is inactive",
                )
                return False, resolved
            resolved.append(tid)

        emit_event(
            execution_id=execution_id,
            event_type=EventType.PERMISSION_CHECKED,
            node_id=node_id,
            message=f"Tool validation passed: {len(resolved)} tools verified",
            data={"tools": resolved},
        )
        return True, resolved

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def execute(
        self,
        agent_id: str,
        inputs: dict,
        execution_id: str,
        node_id: Optional[str] = None,
        version_label: Optional[str] = None,
        harness_id: Optional[str] = None,
    ) -> dict:
        state = AgentExecutionState.PENDING
        started_at = time.monotonic()

        def _set_state(new_state: AgentExecutionState) -> None:
            nonlocal state
            state = new_state

        # ── Load Agent ──────────────────────────────────────────────
        agent = self.get_agent(agent_id)
        if agent is None:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Agent not found: {agent_id}",
            )
            return {"status": "failed", "error": "Agent not found", "agent_id": agent_id}

        # ── Load Version ─────────────────────────────────────────────
        version = self.get_version(agent, version_label)
        if version is None:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"No versions found for agent '{agent.display_name}'",
            )
            return {"status": "failed", "error": "No agent versions found"}

        contract = self._resolve_contract(agent, version)
        _set_state(AgentExecutionState.PREPARING)

        emit_event(
            execution_id=execution_id,
            event_type=EventType.AGENT_STARTED,
            agent_id=agent_id,
            node_id=node_id,
            message=(
                f"Agent '{agent.display_name}' v{version.version} started "
                f"({agent.category.value})"
            ),
            data={
                "agent_version": version.version,
                "category": agent.category.value,
                "model_config_id": contract.model_config_id,
                "skills": len(contract.skill_ids),
                "tools": len(contract.tool_ids),
            },
        )

        # ── Validate Contract ────────────────────────────────────────
        valid, msg = self.validate_contract(agent, contract, inputs)
        if not valid:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Contract validation failed: {msg}",
            )
            return {"status": "failed", "error": msg, "agent": agent.display_name}

        emit_event(
            execution_id=execution_id,
            event_type=EventType.POLICY_CHECKED,
            agent_id=agent_id,
            node_id=node_id,
            message="Contract validation passed",
            data={
                "input_required": contract.input_schema.get("required", []),
                "output_required": contract.output_schema.get("required", []),
                "permissions": contract.permissions,
            },
        )

        # ── Prepare Context ──────────────────────────────────────────
        context = self.prepare_context(agent, inputs, execution_id, node_id)

        # ── Resolve Model ────────────────────────────────────────────
        model, model_err = self.resolve_model(contract)
        if model is None:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Model resolution failed: {model_err}",
            )
            return {
                "status": "failed",
                "error": model_err,
                "agent": agent.display_name,
                "agent_version": version.version,
            }

        emit_event(
            execution_id=execution_id,
            event_type=EventType.AGENT_STARTED,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Model resolved: {model.provider.value}/{model.model}",
            data={"model": model.model, "provider": model.provider.value},
        )

        # ── Validate Tools ───────────────────────────────────────────
        tools_ok, resolved_tools = self.validate_tools(contract, execution_id, node_id)
        if not tools_ok:
            _set_state(AgentExecutionState.FAILED)
            return {"status": "failed", "error": "Tool validation failed", "agent": agent.display_name}

        # ── Execute Agent via centralized ModelRuntime ───────────────
        _set_state(AgentExecutionState.RUNNING)

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": version.system_instructions or agent.system_instructions},
            {"role": "user", "content": self._build_user_prompt(agent, contract, context, inputs)},
        ]

        try:
            invocation = await asyncio.wait_for(
                self.model_runtime.invoke(
                    model_id=model.id,
                    system_instructions=version.system_instructions or agent.system_instructions,
                    messages=messages,
                    temperature=model.temperature,
                    max_tokens=min(model.token_limit, contract.token_budget),
                    structured_output=model.structured_output,
                    agent_id=agent_id,
                    execution_id=execution_id,
                    node_id=node_id,
                    task=agent.category.value,
                    token_budget=contract.token_budget,
                    cost_budget_cents=contract.cost_budget_cents,
                ),
                timeout=contract.timeout_seconds,
            )
        except asyncio.TimeoutError:
            _set_state(AgentExecutionState.TIMED_OUT)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Agent '{agent.display_name}' timed out after {contract.timeout_seconds}s",
            )
            return {
                "status": "timed_out",
                "error": f"Agent timed out after {contract.timeout_seconds}s",
                "agent": agent.display_name,
                "agent_version": version.version,
            }
        except Exception as exc:
            _set_state(AgentExecutionState.FAILED)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Agent execution error: {exc}",
            )
            return {
                "status": "failed",
                "error": str(exc),
                "agent": agent.display_name,
                "agent_version": version.version,
            }

        if not invocation.success:
            _set_state(AgentExecutionState.FAILED)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Model invocation failed: {invocation.error}",
                data={"model": invocation.model_name, "provider": invocation.provider},
            )
            return {
                "status": "failed",
                "error": invocation.error,
                "agent": agent.display_name,
                "agent_version": version.version,
                "model": invocation.model_name,
            }

        # ── Budget already enforced inside ModelRuntime ─────────────
        total_tokens = invocation.input_tokens + invocation.output_tokens

        # ── Validate Output ──────────────────────────────────────────
        _set_state(AgentExecutionState.EVALUATING)

        output: dict[str, Any] = {
            "agent": agent.display_name,
            "agent_version": version.version,
            "model": invocation.model_name,
            "provider": invocation.provider,
            "status": "completed",
            "result": invocation.content,
            "tokens_used": total_tokens,
            "input_tokens": invocation.input_tokens,
            "output_tokens": invocation.output_tokens,
            "cost_cents": round(invocation.cost_cents, 4),
            "turns_used": 1,
            "duration_ms": int((time.monotonic() - started_at) * 1000),
        }

        out_valid, out_msg = self.validate_output(contract, output)
        if not out_valid:
            _set_state(AgentExecutionState.FAILED)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                agent_id=agent_id,
                node_id=node_id,
                message=f"Output validation failed: {out_msg}",
            )
            return {
                "status": "failed",
                "error": out_msg,
                "agent": agent.display_name,
                "agent_version": version.version,
            }

        emit_event(
            execution_id=execution_id,
            event_type=EventType.EVALUATION_COMPLETED,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Output validated for '{agent.display_name}'",
            data={
                "tokens_used": total_tokens,
                "cost_cents": output["cost_cents"],
                "duration_ms": output["duration_ms"],
            },
        )

        # ── Create Evidence ─────────────────────────────────────────
        _set_state(AgentExecutionState.SUCCEEDED)

        evidence_inputs = self._sanitize_for_evidence(inputs, contract)
        evidence_outputs = self._sanitize_for_evidence(output, contract)

        evidence = self.evidence_engine.create_evidence(
            execution_id=execution_id,
            evidence_type=EvidenceType.AGENT,
            agent_id=agent_id,
            agent_version=version.version,
            model_used=invocation.model_name,
            model_provider=invocation.provider,
            harness_id=harness_id,
            inputs=evidence_inputs,
            outputs=evidence_outputs,
            summary=(
                f"Agent '{agent.display_name}' v{version.version} executed "
                f"with {invocation.model_name} ({total_tokens} tokens, "
                f"${invocation.cost_cents:.4f})"
            ),
            node_id=node_id,
        )

        # ── Update execution aggregate counters ──────────────────────
        execution = store.executions.get(execution_id)
        if execution:
            execution.tokens_used += total_tokens
            execution.cost_cents += int(round(invocation.cost_cents))
            execution.evidence_ids.append(evidence.id)

        emit_event(
            execution_id=execution_id,
            event_type=EventType.GRAPH_NODE_COMPLETED,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Agent '{agent.display_name}' v{version.version} succeeded",
            data={
                "state": state.value,
                "tokens_used": total_tokens,
                "cost_cents": output["cost_cents"],
                "duration_ms": output["duration_ms"],
                "evidence_id": evidence.id,
            },
        )

        return {
            "status": "succeeded",
            "agent": agent.display_name,
            "agent_version": version.version,
            "model": invocation.model_name,
            "provider": invocation.provider,
            "result": invocation.content,
            "tokens_used": total_tokens,
            "input_tokens": invocation.input_tokens,
            "output_tokens": invocation.output_tokens,
            "cost_cents": output["cost_cents"],
            "duration_ms": output["duration_ms"],
            "evidence_id": evidence.id,
            "state": state.value,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_user_prompt(
        self,
        agent: Agent,
        contract: AgentContract,
        context: dict,
        inputs: dict,
    ) -> str:
        parts: list[str] = [
            f"Agent: {agent.display_name}",
            f"Purpose: {agent.purpose}",
            f"Category: {agent.category.value}",
        ]
        if agent.role:
            parts.append(f"Role: {agent.role}")
        if context.get("skills"):
            parts.append("Skills: " + ", ".join(s["name"] for s in context["skills"]))
        if context.get("tools"):
            parts.append("Tools: " + ", ".join(t["name"] for t in context["tools"]))
        parts.append(f"Inputs: {inputs}")
        parts.append("Produce engineering output according to your contract.")
        return "\n".join(parts)

    def _sanitize_for_evidence(self, data: dict, contract: AgentContract) -> dict:
        """Remove secrets from data before it becomes evidence.

        Strips any key that looks like it might contain a secret.  The
        evidence record is append-only and auditable, so we must never
        leak credentials into it.
        """
        secret_patterns = ("key", "secret", "token", "password", "credential", "api_key")
        sanitized: dict[str, Any] = {}
        for k, v in data.items():
            if any(p in k.lower() for p in secret_patterns):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = v
        return sanitized
