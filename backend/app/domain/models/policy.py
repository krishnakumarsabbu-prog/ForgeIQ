from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned


class PolicyType(str, Enum):
    ALLOW = "allow"
    REQUIRE = "require"
    PROHIBIT = "prohibit"
    GATE = "gate"
    QUOTA = "quota"
    ENVIRONMENT = "environment"


class PolicyScope(str, Enum):
    TENANT = "tenant"
    APPLICATION = "application"
    HARNESS = "harness"
    AGENT = "agent"
    TOOL = "tool"
    ENVIRONMENT = "environment"
    PIPELINE = "pipeline"


class Policy(TenantOwned):
    name: str
    display_name: str
    description: str = ""
    policy_type: PolicyType = PolicyType.ALLOW
    scope: PolicyScope = PolicyScope.TENANT
    rules: list[dict] = Field(default_factory=list)
    target_id: Optional[str] = None
    enforcement: str = "hard"
    active: bool = True
    priority: int = 100
