from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned


class SkillCategory(str, Enum):
    FRONTEND = "Frontend"
    BACKEND = "Backend"
    TESTING = "Testing"
    ENGINEERING = "Engineering"
    SECURITY = "Security"
    DELIVERY = "Delivery"
    OPERATIONS = "Operations"


class Skill(TenantOwned):
    name: str
    display_name: str
    category: SkillCategory
    description: str = ""
    capabilities: list[str] = Field(default_factory=list)
    language: str = ""
    framework: str = ""
    version: str = "1.0"
    agent_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    active: bool = True
