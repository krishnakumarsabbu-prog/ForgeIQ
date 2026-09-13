from __future__ import annotations

from typing import Optional

from ..storage.in_memory import store
from ..domain.models.model_config import ModelConfiguration


class ModelRuntime:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def get_model(self, model_id: str) -> Optional[ModelConfiguration]:
        m = store.models.get(model_id)
        if m and m.tenant_id == self.tenant_id:
            return m
        return None

    def estimate_cost(self, model_id: str, input_tokens: int, output_tokens: int) -> float:
        model = self.get_model(model_id)
        if model is None:
            return 0.0
        return (input_tokens / 1000 * model.cost_per_1k_input_cents + output_tokens / 1000 * model.cost_per_1k_output_cents) / 100

    def check_availability(self, model_id: str) -> bool:
        model = self.get_model(model_id)
        return model is not None and model.active and model.availability == "available"
