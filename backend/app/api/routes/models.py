from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    temperature: float = 0.7
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_models(tenant_id: str = "tenant_forgeiq"):
    return store.models.all(tenant_id)


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
        name=body.name,
        display_name=body.display_name,
        provider=body.provider,
        model=body.model,
        context_size=body.context_size,
        token_limit=body.token_limit,
        cost_per_1k_input_cents=body.cost_per_1k_input_cents,
        cost_per_1k_output_cents=body.cost_per_1k_output_cents,
        temperature=body.temperature,
        created_at=utc_now(),
    )
    store.models.add(m)
    return m
