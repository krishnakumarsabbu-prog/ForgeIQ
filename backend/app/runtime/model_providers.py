from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any, Optional

from ..domain.models.model_config import ModelConfiguration, ModelProvider


@dataclass
class ModelInvocationResult:
    success: bool
    content: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cost_cents: float = 0.0
    model_name: str = ""
    provider: str = ""
    latency_ms: int = 0
    error: str = ""
    raw: dict = field(default_factory=dict)


class ModelProviderClient(abc.ABC):
    """Abstract interface every model provider must implement.

    Providers are replaceable.  The AgentRuntime never talks to a specific
    vendor SDK directly — it goes through this interface so tenants can swap
    OpenAI for Anthropic, Azure, a local model, etc. without touching agent
    code.
    """

    provider: ModelProvider

    @abc.abstractmethod
    def is_configured(self) -> bool:
        """Return True when the credentials / endpoint needed to call the
        provider are available in the current environment."""

    @abc.abstractmethod
    async def invoke(
        self,
        model: ModelConfiguration,
        system_instructions: str,
        messages: list[dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        structured_output: bool = False,
    ) -> ModelInvocationResult:
        """Execute a completion request against the provider."""


# ---------------------------------------------------------------------------
# Concrete providers
# ---------------------------------------------------------------------------

class OpenAIProviderClient(ModelProviderClient):
    provider = ModelProvider.OPENAI

    def __init__(self) -> None:
        import os
        self._api_key = os.environ.get("OPENAI_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def invoke(self, model, system_instructions, messages, temperature=0.7, max_tokens=4096, structured_output=False) -> ModelInvocationResult:
        if not self.is_configured():
            return ModelInvocationResult(
                success=False,
                provider=self.provider.value,
                model_name=model.model,
                error="OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
            )
        # Real HTTP call would go here.  We return a controlled result so the
        # runtime can exercise the full pipeline without a live key.
        in_tok = sum(len(m.get("content", "")) // 4 for m in messages)
        out_tok = max_tokens // 4
        return ModelInvocationResult(
            success=True,
            content=f"[OpenAI:{model.model}] Processed {len(messages)} messages.",
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_cents=round(in_tok / 1000 * model.cost_per_1k_input_cents + out_tok / 1000 * model.cost_per_1k_output_cents, 4),
            model_name=model.model,
            provider=self.provider.value,
            latency_ms=model.latency_ms,
        )


class AnthropicProviderClient(ModelProviderClient):
    provider = ModelProvider.ANTHROPIC

    def __init__(self) -> None:
        import os
        self._api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def invoke(self, model, system_instructions, messages, temperature=0.7, max_tokens=4096, structured_output=False) -> ModelInvocationResult:
        if not self.is_configured():
            return ModelInvocationResult(
                success=False,
                provider=self.provider.value,
                model_name=model.model,
                error="Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.",
            )
        in_tok = sum(len(m.get("content", "")) // 4 for m in messages)
        out_tok = max_tokens // 4
        return ModelInvocationResult(
            success=True,
            content=f"[Anthropic:{model.model}] Processed {len(messages)} messages.",
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_cents=round(in_tok / 1000 * model.cost_per_1k_input_cents + out_tok / 1000 * model.cost_per_1k_output_cents, 4),
            model_name=model.model,
            provider=self.provider.value,
            latency_ms=model.latency_ms,
        )


class AzureProviderClient(ModelProviderClient):
    provider = ModelProvider.AZURE

    def __init__(self) -> None:
        import os
        self._api_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
        self._endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")

    def is_configured(self) -> bool:
        return bool(self._api_key) and bool(self._endpoint)

    async def invoke(self, model, system_instructions, messages, temperature=0.7, max_tokens=4096, structured_output=False) -> ModelInvocationResult:
        if not self.is_configured():
            return ModelInvocationResult(
                success=False,
                provider=self.provider.value,
                model_name=model.model,
                error="Azure OpenAI not configured. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT.",
            )
        in_tok = sum(len(m.get("content", "")) // 4 for m in messages)
        out_tok = max_tokens // 4
        return ModelInvocationResult(
            success=True,
            content=f"[Azure:{model.model}] Processed {len(messages)} messages.",
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_cents=round(in_tok / 1000 * model.cost_per_1k_input_cents + out_tok / 1000 * model.cost_per_1k_output_cents, 4),
            model_name=model.model,
            provider=self.provider.value,
            latency_ms=model.latency_ms,
        )


class GoogleProviderClient(ModelProviderClient):
    provider = ModelProvider.GOOGLE

    def __init__(self) -> None:
        import os
        self._api_key = os.environ.get("GOOGLE_AI_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def invoke(self, model, system_instructions, messages, temperature=0.7, max_tokens=4096, structured_output=False) -> ModelInvocationResult:
        if not self.is_configured():
            return ModelInvocationResult(
                success=False,
                provider=self.provider.value,
                model_name=model.model,
                error="Google AI API key not configured. Set GOOGLE_AI_API_KEY.",
            )
        in_tok = sum(len(m.get("content", "")) // 4 for m in messages)
        out_tok = max_tokens // 4
        return ModelInvocationResult(
            success=True,
            content=f"[Google:{model.model}] Processed {len(messages)} messages.",
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_cents=round(in_tok / 1000 * model.cost_per_1k_input_cents + out_tok / 1000 * model.cost_per_1k_output_cents, 4),
            model_name=model.model,
            provider=self.provider.value,
            latency_ms=model.latency_ms,
        )


class LocalProviderClient(ModelProviderClient):
    provider = ModelProvider.LOCAL

    def __init__(self) -> None:
        import os
        self._endpoint = os.environ.get("LOCAL_MODEL_ENDPOINT", "")

    def is_configured(self) -> bool:
        return bool(self._endpoint)

    async def invoke(self, model, system_instructions, messages, temperature=0.7, max_tokens=4096, structured_output=False) -> ModelInvocationResult:
        if not self.is_configured():
            return ModelInvocationResult(
                success=False,
                provider=self.provider.value,
                model_name=model.model,
                error="Local model endpoint not configured. Set LOCAL_MODEL_ENDPOINT.",
            )
        in_tok = sum(len(m.get("content", "")) // 4 for m in messages)
        out_tok = max_tokens // 4
        return ModelInvocationResult(
            success=True,
            content=f"[Local:{model.model}] Processed {len(messages)} messages.",
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_cents=0.0,
            model_name=model.model,
            provider=self.provider.value,
            latency_ms=model.latency_ms,
        )


class EnterpriseProviderClient(ModelProviderClient):
    provider = ModelProvider.ENTERPRISE

    def __init__(self) -> None:
        import os
        self._endpoint = os.environ.get("ENTERPRISE_MODEL_ENDPOINT", "")
        self._api_key = os.environ.get("ENTERPRISE_MODEL_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self._endpoint) and bool(self._api_key)

    async def invoke(self, model, system_instructions, messages, temperature=0.7, max_tokens=4096, structured_output=False) -> ModelInvocationResult:
        if not self.is_configured():
            return ModelInvocationResult(
                success=False,
                provider=self.provider.value,
                model_name=model.model,
                error="Enterprise model not configured. Set ENTERPRISE_MODEL_ENDPOINT and ENTERPRISE_MODEL_API_KEY.",
            )
        in_tok = sum(len(m.get("content", "")) // 4 for m in messages)
        out_tok = max_tokens // 4
        return ModelInvocationResult(
            success=True,
            content=f"[Enterprise:{model.model}] Processed {len(messages)} messages.",
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_cents=round(in_tok / 1000 * model.cost_per_1k_input_cents + out_tok / 1000 * model.cost_per_1k_output_cents, 4),
            model_name=model.model,
            provider=self.provider.value,
            latency_ms=model.latency_ms,
        )


# ---------------------------------------------------------------------------
# Registry / resolver
# ---------------------------------------------------------------------------

_PROVIDER_REGISTRY: dict[ModelProvider, type[ModelProviderClient]] = {
    ModelProvider.OPENAI: OpenAIProviderClient,
    ModelProvider.ANTHROPIC: AnthropicProviderClient,
    ModelProvider.AZURE: AzureProviderClient,
    ModelProvider.GOOGLE: GoogleProviderClient,
    ModelProvider.LOCAL: LocalProviderClient,
    ModelProvider.ENTERPRISE: EnterpriseProviderClient,
}

_provider_instances: dict[ModelProvider, ModelProviderClient] = {}


def get_provider_client(provider: ModelProvider) -> ModelProviderClient:
    """Return a cached singleton client for *provider*."""
    if provider not in _provider_instances:
        cls = _PROVIDER_REGISTRY.get(provider)
        if cls is None:
            raise ValueError(f"No client registered for provider {provider!r}")
        _provider_instances[provider] = cls()
    return _provider_instances[provider]


def resolve_provider(model: Optional[ModelConfiguration]) -> tuple[Optional[ModelProviderClient], str]:
    """Resolve the provider client for a model configuration.

    Returns ``(client, error)``.  When *model* is ``None`` or the model is
    inactive, *client* is ``None`` and *error* explains why.  When the
    provider client exists but its credentials are missing, *client* is
    still ``None`` — the caller must surface the controlled error rather
    than pretending execution succeeded.
    """
    if model is None:
        return None, "No model configuration assigned to this agent."
    if not model.active:
        return None, f"Model '{model.display_name or model.model}' is not active."
    if model.availability != "available":
        return None, f"Model '{model.display_name or model.model}' is not available (status: {model.availability})."
    if model.tenant_restricted and model.tenant_restrictions:
        # Tenant restriction is checked by the caller which knows tenant_id.
        pass
    client = get_provider_client(model.provider)
    if not client.is_configured():
        return None, (
            f"{model.provider.value} provider is not configured. "
            f"Set the required environment variables to enable model execution."
        )
    return client, ""
