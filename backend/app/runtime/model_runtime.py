from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Optional

from ..storage.in_memory import store
from ..domain.models.model_config import (
    ModelConfiguration,
    ModelProvider,
    ModelTier,
    RoutingFactor,
)
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType
from ..events.emit import emit_event
from .model_providers import (
    ModelProviderClient,
    ModelInvocationResult,
    get_provider_client,
    resolve_provider,
)
from .policy_engine import PolicyEngine


@dataclass
class ModelUsageRecord:
    id: str
    tenant_id: str
    model_id: str
    model_name: str
    provider: str
    agent_id: str = ""
    execution_id: str = ""
    node_id: str = ""
    task: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cost_cents: float = 0.0
    latency_ms: int = 0
    success: bool = True
    error: str = ""
    fallback_used: bool = False
    original_model_id: str = ""
    timestamp: str = ""
    request_metadata: dict = field(default_factory=dict)
    response_metadata: dict = field(default_factory=dict)


@dataclass
class RoutingDecision:
    model: Optional[ModelConfiguration]
    fallback_used: bool = False
    original_model_id: str = ""
    reason: str = ""
    factors_evaluated: list[str] = field(default_factory=list)


_usage_records: list[ModelUsageRecord] = []


def _record_usage(rec: ModelUsageRecord) -> None:
    _usage_records.append(rec)


def get_usage_records(
    tenant_id: Optional[str] = None,
    model_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    execution_id: Optional[str] = None,
    limit: int = 100,
) -> list[ModelUsageRecord]:
    results = _usage_records
    if tenant_id:
        results = [r for r in results if r.tenant_id == tenant_id]
    if model_id:
        results = [r for r in results if r.model_id == model_id]
    if agent_id:
        results = [r for r in results if r.agent_id == agent_id]
    if execution_id:
        results = [r for r in results if r.execution_id == execution_id]
    return results[-limit:]


class ModelRuntime:
    """Centralized model runtime governing routing, fallback, invocation,
    tenant policy enforcement, usage tracking and evidence metadata.

    All model invocations flow through this runtime — AgentRuntime, graph
    nodes, loop steps, and any other execution component must call
    ``ModelRuntime.invoke`` rather than reaching into provider clients
    directly.
    """

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.policy_engine = PolicyEngine(tenant_id)

    # ------------------------------------------------------------------
    # Model lookup
    # ------------------------------------------------------------------

    def get_model(self, model_id: str) -> Optional[ModelConfiguration]:
        m = store.models.get(model_id)
        if m and m.tenant_id == self.tenant_id:
            return m
        return None

    def list_models(self, provider: Optional[str] = None) -> list[ModelConfiguration]:
        models = store.models.all(self.tenant_id)
        if provider:
            models = [m for m in models if m.provider.value == provider]
        return models

    def list_providers(self) -> list[dict]:
        return [
            {"value": p.value, "label": p.value, "configured": self._provider_configured(p)}
            for p in ModelProvider
        ]

    def _provider_configured(self, provider: ModelProvider) -> bool:
        try:
            client = get_provider_client(provider)
            return client.is_configured()
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Routing
    # ------------------------------------------------------------------

    def route_model(
        self,
        task: str = "",
        quality: Optional[str] = None,
        cost: Optional[str] = None,
        latency: Optional[str] = None,
        security: bool = False,
        environment: str = "",
        preferred_model_id: Optional[str] = None,
    ) -> RoutingDecision:
        """Select the best model based on routing factors.

        Routing factors evaluated:
          task       — match routing_tags / capabilities to the task
          quality    — prefer high_quality tier
          cost       — prefer low_cost tier
          latency    — prefer lowest latency_ms
          security   — only security_approved models
          tenant_policy — respect tenant restrictions
          availability — model must be active and available
        """
        factors: list[str] = []

        if preferred_model_id:
            model = self.get_model(preferred_model_id)
            if model and self._is_usable(model, security):
                factors.append("preferred_model")
                return RoutingDecision(model=model, reason="Preferred model selected", factors_evaluated=factors)

        models = store.models.all(self.tenant_id)
        candidates = [m for m in models if self._is_usable(m, security)]
        factors.append("availability")

        if security:
            candidates = [m for m in candidates if m.security_approved]
            factors.append("security")

        if quality:
            if quality == "high":
                candidates = [m for m in candidates if m.tier in (ModelTier.HIGH_QUALITY, ModelTier.ENTERPRISE_APPROVED)]
                factors.append("quality:high")
            elif quality == "low":
                candidates = [m for m in candidates if m.tier in (ModelTier.LOW_COST, ModelTier.LOCAL)]
                factors.append("quality:low")

        if cost == "minimize":
            candidates = sorted(candidates, key=lambda m: (m.cost_per_1k_input_cents + m.cost_per_1k_output_cents))
            factors.append("cost:minimize")

        if latency == "minimize":
            candidates = sorted(candidates, key=lambda m: m.latency_ms)
            factors.append("latency:minimize")

        if task:
            task_lower = task.lower()
            tagged = [m for m in candidates if any(tag in task_lower for tag in m.routing_tags)]
            if tagged:
                candidates = tagged
                factors.append("task_match")

        if not candidates:
            return RoutingDecision(
                model=None,
                reason="No model satisfies the routing constraints for this tenant.",
                factors_evaluated=factors,
            )

        return RoutingDecision(
            model=candidates[0],
            reason=f"Routed via factors: {', '.join(factors)}",
            factors_evaluated=factors,
        )

    def _is_usable(self, model: ModelConfiguration, require_security: bool = False) -> bool:
        if not model.active:
            return False
        if model.availability != "available":
            return False
        if model.tenant_id != self.tenant_id:
            return False
        if require_security and not model.security_approved:
            return False
        return True

    # ------------------------------------------------------------------
    # Governance
    # ------------------------------------------------------------------

    def check_tenant_policy(
        self,
        model: ModelConfiguration,
        execution_id: str = "",
        node_id: Optional[str] = None,
    ) -> tuple[bool, str]:
        """Verify the model is permitted under tenant policy."""
        if model.tenant_restricted:
            if self.tenant_id not in model.tenant_restrictions and "enterprise-only" in model.tenant_restrictions:
                emit_event(
                    execution_id=execution_id,
                    event_type=EventType.POLICY_CHECKED,
                    node_id=node_id,
                    message=f"Model '{model.display_name}' is tenant-restricted and not available to this tenant.",
                )
                return False, f"Model '{model.display_name}' is restricted to enterprise tenants only."

        allowed, applied = self.policy_engine.evaluate(
            scope="tenant",
            target_id=model.id,
            context={"model_id": model.id, "provider": model.provider.value},
            execution_id=execution_id,
            node_id=node_id,
        )
        if not allowed:
            return False, f"Tenant policy denied model usage: {', '.join(applied)}"

        return True, ""

    # ------------------------------------------------------------------
    # Fallback resolution
    # ------------------------------------------------------------------

    def resolve_fallback(self, model: ModelConfiguration) -> Optional[ModelConfiguration]:
        if not model.fallback_model_id:
            return None
        fallback = store.models.get(model.fallback_model_id)
        if fallback and fallback.tenant_id == self.tenant_id and fallback.active and fallback.availability == "available":
            return fallback
        return None

    # ------------------------------------------------------------------
    # Cost estimation
    # ------------------------------------------------------------------

    def estimate_cost(self, model_id: str, input_tokens: int, output_tokens: int) -> float:
        model = self.get_model(model_id)
        if model is None:
            return 0.0
        return (
            input_tokens / 1000 * model.cost_per_1k_input_cents
            + output_tokens / 1000 * model.cost_per_1k_output_cents
        ) / 100

    def check_availability(self, model_id: str) -> bool:
        model = self.get_model(model_id)
        return model is not None and model.active and model.availability == "available"

    # ------------------------------------------------------------------
    # Invocation — the single entry point for all model execution
    # ------------------------------------------------------------------

    async def invoke(
        self,
        model_id: str,
        system_instructions: str,
        messages: list[dict[str, Any]],
        temperature: Optional[float] = None,
        max_tokens: int = 4096,
        structured_output: Optional[bool] = None,
        agent_id: str = "",
        execution_id: str = "",
        node_id: Optional[str] = None,
        task: str = "",
        token_budget: int = 0,
        cost_budget_cents: float = 0.0,
    ) -> ModelInvocationResult:
        """Invoke a model with full governance: policy check, provider
        resolution, fallback, budget enforcement, usage tracking and
        evidence metadata recording.

        Returns a ``ModelInvocationResult``.  On failure the ``success``
        field is ``False`` and ``error`` explains the problem — the caller
        must surface the error rather than fabricating success.
        """
        started = time.monotonic()

        model = self.get_model(model_id)
        if model is None:
            return ModelInvocationResult(
                success=False,
                error=f"Model '{model_id}' not found or not accessible to this tenant.",
            )

        # ── Governance: tenant policy ──────────────────────────────
        policy_ok, policy_err = self.check_tenant_policy(model, execution_id, node_id)
        if not policy_ok:
            return ModelInvocationResult(
                success=False,
                provider=model.provider.value,
                model_name=model.model,
                error=policy_err,
            )

        # ── Resolve provider ────────────────────────────────────────
        provider_client, provider_err = resolve_provider(model)
        if provider_client is None:
            # Attempt fallback before failing
            fallback = self.resolve_fallback(model)
            if fallback:
                emit_event(
                    execution_id=execution_id,
                    event_type=EventType.POLICY_CHECKED,
                    node_id=node_id,
                    message=f"Primary model '{model.display_name}' unavailable, falling back to '{fallback.display_name}'",
                    data={
                        "primary_model": model.model,
                        "fallback_model": fallback.model,
                        "reason": provider_err,
                    },
                )
                fb_client, fb_err = resolve_provider(fallback)
                if fb_client is None:
                    return ModelInvocationResult(
                        success=False,
                        provider=model.provider.value,
                        model_name=model.model,
                        error=f"Primary model unavailable ({provider_err}) and fallback also unavailable ({fb_err})",
                    )
                provider_client = fb_client
                model = fallback
            else:
                return ModelInvocationResult(
                    success=False,
                    provider=model.provider.value,
                    model_name=model.model,
                    error=provider_err,
                )

        # ── Invoke ─────────────────────────────────────────────────
        temp = temperature if temperature is not None else model.temperature
        so = structured_output if structured_output is not None else model.structured_output
        effective_max = min(max_tokens, model.token_limit)

        try:
            result = await provider_client.invoke(
                model=model,
                system_instructions=system_instructions,
                messages=messages,
                temperature=temp,
                max_tokens=effective_max,
                structured_output=so,
            )
        except Exception as exc:
            result = ModelInvocationResult(
                success=False,
                provider=model.provider.value,
                model_name=model.model,
                error=str(exc),
            )

        elapsed_ms = int((time.monotonic() - started) * 1000)
        result.latency_ms = elapsed_ms

        # ── Budget enforcement ─────────────────────────────────────
        if result.success and token_budget > 0:
            total_tokens = result.input_tokens + result.output_tokens
            if total_tokens > token_budget:
                result.success = False
                result.error = f"Token budget exceeded: {total_tokens} > {token_budget}"

        if result.success and cost_budget_cents > 0:
            if result.cost_cents > cost_budget_cents:
                result.success = False
                result.error = f"Cost budget exceeded: {result.cost_cents:.4f} > {cost_budget_cents}"

        # ── Record usage ────────────────────────────────────────────
        usage = ModelUsageRecord(
            id=gen_id("usage_"),
            tenant_id=self.tenant_id,
            model_id=model.id,
            model_name=model.model,
            provider=model.provider.value,
            agent_id=agent_id,
            execution_id=execution_id,
            node_id=node_id or "",
            task=task,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            cost_cents=round(result.cost_cents, 4),
            latency_ms=elapsed_ms,
            success=result.success,
            error=result.error,
            fallback_used=(model.id != model_id),
            original_model_id=model_id if model.id != model_id else "",
            timestamp=utc_now().isoformat(),
            request_metadata={
                "temperature": temp,
                "max_tokens": effective_max,
                "structured_output": so,
                "message_count": len(messages),
            },
            response_metadata=result.raw if result.raw else {},
        )
        _record_usage(usage)

        # ── Emit event ──────────────────────────────────────────────
        if execution_id:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.AGENT_STARTED if not result.success else EventType.EVALUATION_COMPLETED,
                agent_id=agent_id if agent_id else None,
                node_id=node_id,
                message=(
                    f"Model invocation {'succeeded' if result.success else 'failed'}: "
                    f"{model.provider.value}/{model.model} "
                    f"({result.input_tokens + result.output_tokens} tokens, "
                    f"${result.cost_cents:.4f})"
                ),
                data={
                    "model": model.model,
                    "provider": model.provider.value,
                    "input_tokens": result.input_tokens,
                    "output_tokens": result.output_tokens,
                    "cost_cents": round(result.cost_cents, 4),
                    "latency_ms": elapsed_ms,
                    "fallback_used": model.id != model_id,
                    "success": result.success,
                },
            )

        return result

    # ------------------------------------------------------------------
    # Usage statistics
    # ------------------------------------------------------------------

    def usage_stats(self) -> dict:
        records = [r for r in _usage_records if r.tenant_id == self.tenant_id]
        total_tokens = sum(r.input_tokens + r.output_tokens for r in records)
        total_cost = sum(r.cost_cents for r in records)
        by_model: dict[str, dict] = {}
        by_provider: dict[str, dict] = {}
        for r in records:
            mk = r.model_name
            if mk not in by_model:
                by_model[mk] = {"invocations": 0, "tokens": 0, "cost_cents": 0.0, "failures": 0}
            by_model[mk]["invocations"] += 1
            by_model[mk]["tokens"] += r.input_tokens + r.output_tokens
            by_model[mk]["cost_cents"] += r.cost_cents
            if not r.success:
                by_model[mk]["failures"] += 1

            pv = r.provider
            if pv not in by_provider:
                by_provider[pv] = {"invocations": 0, "tokens": 0, "cost_cents": 0.0}
            by_provider[pv]["invocations"] += 1
            by_provider[pv]["tokens"] += r.input_tokens + r.output_tokens
            by_provider[pv]["cost_cents"] += r.cost_cents

        fallback_count = sum(1 for r in records if r.fallback_used)
        success_count = sum(1 for r in records if r.success)

        return {
            "total_invocations": len(records),
            "successful": success_count,
            "failed": len(records) - success_count,
            "fallbacks_used": fallback_count,
            "total_tokens": total_tokens,
            "total_cost_cents": round(total_cost, 4),
            "by_model": by_model,
            "by_provider": by_provider,
        }

    def provider_status(self) -> list[dict]:
        statuses = []
        for p in ModelProvider:
            client = None
            configured = False
            try:
                client = get_provider_client(p)
                configured = client.is_configured()
            except Exception:
                pass
            models = [m for m in store.models.all(self.tenant_id) if m.provider == p]
            statuses.append({
                "provider": p.value,
                "configured": configured,
                "model_count": len(models),
                "active_models": sum(1 for m in models if m.active),
            })
        return statuses
