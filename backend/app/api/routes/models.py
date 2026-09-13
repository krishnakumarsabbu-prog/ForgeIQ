from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.model_config import ModelConfiguration, ModelProvider
from ...domain.models.base import gen_id, utc_now

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
    fallback_model_id: str | None = None
    availability: str = "available"
    tenant_restricted: bool = False
    tenant_restrictions: list[str] = Field(default_factory=list)
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
    fallback_model_id: str | None = None
    availability: str | None = None
    tenant_restricted: bool | None = None
    tenant_restrictions: list[str] | None = None
    active: bool | None = None


@router.get("")
def list_models(tenant_id: str = "tenant_forgeiq", provider: str | None = None):
    models = store.models.all(tenant_id)
    if provider:
        models = [m for m in models if m.provider.value == provider]
    return models


@router.get("/providers")
def list_providers():
    return [{"value": p.value, "label": p.value} for p in ModelProvider]


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
        fallback_model_id=body.fallback_model_id,
        availability=body.availability,
        tenant_restricted=body.tenant_restricted,
        tenant_restrictions=body.tenant_restrictions,
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
