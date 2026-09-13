from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.model_config import ModelConfiguration, ModelProvider, ModelTier
from ...domain.models.base import gen_id, utc_now
from ...runtime.model_runtime import ModelRuntime, get_usage_records

router = APIRouter(prefix="/models", tags=["models"])


class ModelCreate(BaseModel):
    name: str
    display_name: str
    provider: ModelProvider
    model: str
    context_size: int = 128000
    token_limit: int = 4096
    cost_per_1k_input_cents: float = 0.01
    cost_per_1k_output_cents: float = 0.03
    latency_ms: int = 500
    temperature: float = 0.7
    capabilities: list[str] = Field(default_factory=lambda: ["text", "code"])
    routing_tags: list[str] = Field(default_factory=list)
    tier: ModelTier = ModelTier.BALANCED
    fallback_model_id: str | None = None
    availability: str = "available"
    tenant_restricted: bool = False
    tenant_restrictions: list[str] = Field(default_factory=list)
    security_approved: bool = False
    enterprise_approved: bool = False
    active: bool = True
    tenant_id: str = "tenant_forgeiq"


class ModelUpdate(BaseModel):
    display_name: str | None = None
    provider: ModelProvider | None = None
    model: str | None = None
    context_size: int | None = None
    token_limit: int | None = None
    cost_per_1k_input_cents: float | None = None
    cost_per_1k_output_cents: float | None = None
    latency_ms: int | None = None
    temperature: float | None = None
    capabilities: list[str] | None = None
    routing_tags: list[str] | None = None
    tier: ModelTier | None = None
    fallback_model_id: str | None = None
    availability: str | None = None
    tenant_restricted: bool | None = None
    tenant_restrictions: list[str] | None = None
    security_approved: bool | None = None
    enterprise_approved: bool | None = None
    active: bool | None = None


class RouteRequest(BaseModel):
    task: str = ""
    quality: str | None = None
    cost: str | None = None
    latency: str | None = None
    security: bool = False
    environment: str = ""
    preferred_model_id: str | None = None


@router.get("")
def list_models(tenant_id: str = "tenant_forgeiq", provider: str | None = None):
    models = store.models.all(tenant_id)
    if provider:
        models = [m for m in models if m.provider.value == provider]
    return models


@router.get("/providers")
def list_providers():
    rt = ModelRuntime("tenant_forgeiq")
    return rt.list_providers()


@router.get("/provider-status")
def provider_status():
    rt = ModelRuntime("tenant_forgeiq")
    return rt.provider_status()


@router.get("/tiers")
def list_tiers():
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in ModelTier]


@router.get("/routing-factors")
def list_routing_factors():
    from ...domain.models.model_config import RoutingFactor
    return [{"value": f.value, "label": f.value.replace("_", " ").title()} for f in RoutingFactor]


@router.post("/route")
def route_model(body: RouteRequest, tenant_id: str = "tenant_forgeiq"):
    rt = ModelRuntime(tenant_id)
    decision = rt.route_model(
        task=body.task,
        quality=body.quality,
        cost=body.cost,
        latency=body.latency,
        security=body.security,
        environment=body.environment,
        preferred_model_id=body.preferred_model_id,
    )
    return {
        "model": decision.model,
        "fallback_used": decision.fallback_used,
        "original_model_id": decision.original_model_id,
        "reason": decision.reason,
        "factors_evaluated": decision.factors_evaluated,
    }


@router.get("/usage")
def model_usage(
    tenant_id: str = "tenant_forgeiq",
    model_id: str | None = None,
    agent_id: str | None = None,
    execution_id: str | None = None,
    limit: int = Query(100, le=500),
):
    records = get_usage_records(
        tenant_id=tenant_id,
        model_id=model_id,
        agent_id=agent_id,
        execution_id=execution_id,
        limit=limit,
    )
    return [
        {
            "id": r.id,
            "model_id": r.model_id,
            "model_name": r.model_name,
            "provider": r.provider,
            "agent_id": r.agent_id,
            "execution_id": r.execution_id,
            "node_id": r.node_id,
            "task": r.task,
            "input_tokens": r.input_tokens,
            "output_tokens": r.output_tokens,
            "cost_cents": r.cost_cents,
            "latency_ms": r.latency_ms,
            "success": r.success,
            "error": r.error,
            "fallback_used": r.fallback_used,
            "original_model_id": r.original_model_id,
            "timestamp": r.timestamp,
        }
        for r in records
    ]


@router.get("/usage/stats")
def model_usage_stats(tenant_id: str = "tenant_forgeiq"):
    rt = ModelRuntime(tenant_id)
    return rt.usage_stats()


@router.get("/{model_id}")
def get_model(model_id: str):
    m = store.models.get(model_id)
    if not m:
        raise HTTPException(404, "Model not found")
    return m


@router.post("")
def create_model(body: ModelCreate):
    m = ModelConfiguration(
        tenant_id=body.tenant_id,
        id=gen_id("model_"),
        name=body.name.lower().replace(" ", "-"),
        display_name=body.display_name,
        provider=body.provider,
        model=body.model,
        context_size=body.context_size,
        token_limit=body.token_limit,
        cost_per_1k_input_cents=body.cost_per_1k_input_cents,
        cost_per_1k_output_cents=body.cost_per_1k_output_cents,
        latency_ms=body.latency_ms,
        temperature=body.temperature,
        capabilities=body.capabilities,
        routing_tags=body.routing_tags,
        tier=body.tier,
        fallback_model_id=body.fallback_model_id,
        availability=body.availability,
        tenant_restricted=body.tenant_restricted,
        tenant_restrictions=body.tenant_restrictions,
        security_approved=body.security_approved,
        enterprise_approved=body.enterprise_approved,
        active=body.active,
        created_at=utc_now(),
    )
    store.models.add(m)
    return m


@router.put("/{model_id}")
def update_model(model_id: str, body: ModelUpdate):
    m = store.models.get(model_id)
    if not m:
        raise HTTPException(404, "Model not found")
    patch = body.model_dump(exclude_none=True)
    return store.models.update(model_id, patch)


@router.delete("/{model_id}")
def delete_model(model_id: str):
    if not store.models.delete(model_id):
        raise HTTPException(404, "Model not found")
    return {"deleted": True}
