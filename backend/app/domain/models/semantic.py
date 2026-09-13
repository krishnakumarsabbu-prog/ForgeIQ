from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id


class SemanticEntityType(str, Enum):
    REPOSITORY = "repository"
    BRANCH = "branch"
    FOLDER = "folder"
    FILE = "file"
    MODULE = "module"
    SERVICE = "service"
    COMPONENT = "component"
    CLASS = "class"
    FUNCTION = "function"
    CONTROLLER = "controller"
    REPOSITORY_ENTITY = "repository_entity"
    API = "api"
    DATABASE = "database"
    TEST = "test"
    BUILD_SYSTEM = "build_system"
    DEPLOYMENT_CONFIG = "deployment_config"


class SemanticEntity(TenantOwned):
    application_id: str
    entity_type: SemanticEntityType
    name: str
    qualified_name: str = ""
    file_path: str = ""
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    properties: dict = Field(default_factory=dict)
    parent_id: Optional[str] = None


class SemanticRelationship(TenantOwned):
    application_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str = ""
    properties: dict = Field(default_factory=dict)
