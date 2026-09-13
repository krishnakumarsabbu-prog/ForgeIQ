from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, RiskLevel


class ToolRisk(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Tool(TenantOwned):
    name: str
    display_name: str
    description: str = ""
    risk_level: ToolRisk = ToolRisk.MEDIUM
    allowed_operations: list[str] = Field(default_factory=list)
    supported_environments: list[str] = Field(default_factory=lambda: ["development", "staging"])
    permissions: list[str] = Field(default_factory=list)
    timeout_seconds: int = 120
    output_limits: dict = Field(default_factory=lambda: {"max_lines": 10000, "max_bytes": 1048576})
    evidence_requirements: list[str] = Field(default_factory=lambda: ["command", "exit_code", "stdout", "stderr"])
    agent_ids: list[str] = Field(default_factory=list)
    active: bool = True
    category: str = "execution"
    input_validation: dict = Field(default_factory=dict)
    inputs_schema: dict = Field(default_factory=lambda: {"type": "object", "properties": {}})
    outputs_schema: dict = Field(default_factory=lambda: {"type": "object", "properties": {}})
