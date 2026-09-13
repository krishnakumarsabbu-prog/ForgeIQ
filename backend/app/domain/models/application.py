from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id


class ApplicationType(str, Enum):
    GREENFIELD = "greenfield"
    BROWNFIELD = "brownfield"


class ApplicationStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DRAFT = "draft"


class Repository(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("repo_"))
    url: str
    branch: str = "main"
    provider: str = "github"
    default_branch: str = "main"
    discovered: bool = False
    semantic_model_built: bool = False


class Application(TenantOwned):
    name: str
    display_name: str
    description: str = ""
    type: ApplicationType = ApplicationType.GREENFIELD
    status: ApplicationStatus = ApplicationStatus.ACTIVE
    repository: Optional[Repository] = None
    technologies: list[str] = Field(default_factory=list)
    team: str = "Platform Engineering"
    risk_level: str = "MEDIUM"
    current_version: str = "0.1.0"
    engineering_state_id: Optional[str] = None
    pipeline_ids: list[str] = Field(default_factory=list)
    harness_ids: list[str] = Field(default_factory=list)
    requirement_ids: list[str] = Field(default_factory=list)
