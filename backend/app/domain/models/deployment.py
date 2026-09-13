from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id


class EnvironmentType(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    SANDBOX = "sandbox"


class Environment(TenantOwned):
    name: str
    display_name: str
    env_type: EnvironmentType = EnvironmentType.DEVELOPMENT
    application_id: Optional[str] = None
    cluster: str = ""
    region: str = "us-east-1"
    protected: bool = False
    requires_approval: bool = False
    config: dict = Field(default_factory=dict)
    active: bool = True


class Artifact(TenantOwned):
    application_id: str
    name: str
    version: str
    type: str = "container"
    build_id: Optional[str] = None
    hash: str = ""
    registry: str = ""
    size_bytes: int = 0
    tags: list[str] = Field(default_factory=list)


class Deployment(TenantOwned):
    application_id: str
    environment_id: str
    artifact_id: Optional[str] = None
    version: str = ""
    status: str = "pending"
    strategy: str = "rolling"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    verified: bool = False
    verification_results: dict = Field(default_factory=dict)
    rollback_supported: bool = True
    execution_id: Optional[str] = None
    health_checks: list[dict] = Field(default_factory=list)
