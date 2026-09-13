from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id


class Role(str, Enum):
    PLATFORM_ADMIN = "Platform Administrator"
    TENANT_ADMIN = "Tenant Administrator"
    ENGINEERING_LEAD = "Engineering Lead"
    DEVELOPER = "Developer"
    SECURITY_ENGINEER = "Security Engineer"
    RELEASE_MANAGER = "Release Manager"
    OPERATOR = "Operator"
    AUDITOR = "Auditor"


class Permission(BaseModel):
    resource: str
    actions: list[str] = Field(default_factory=list)


class User(TenantOwned):
    email: str
    display_name: str
    role: Role = Role.DEVELOPER
    permissions: list[Permission] = Field(default_factory=list)
    active: bool = True


class Tenant(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("tenant_"))
    name: str
    display_name: str
    plan: str = "enterprise"
    active: bool = True
    settings: dict = Field(default_factory=dict)
    created_at: Optional[str] = None
