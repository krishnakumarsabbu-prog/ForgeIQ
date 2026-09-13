from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned


class ModelProvider(str, Enum):
    OPENAI = "OpenAI"
    ANTHROPIC = "Anthropic"
    GOOGLE = "Google"
    AZURE = "Azure"
    LOCAL = "Local"


class ModelConfiguration(TenantOwned):
    name: str
    provider: ModelProvider
    model: str
    context_size: int = 128000
    token_limit: int = 4096
    cost_per_1k_input_cents: float = 0.01
    cost_per_1k_output_cents: float = 0.03
    temperature: float = 0.7
    structured_output: bool = False
    routing: dict = Field(default_factory=dict)
    fallback_model_id: Optional[str] = None
    availability: str = "available"
    tenant_restricted: bool = False
    active: bool = True
    display_name: str = ""
    max_concurrent: int = 5
