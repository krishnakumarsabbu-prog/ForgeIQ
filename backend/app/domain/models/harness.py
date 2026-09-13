from __future__ import annotations

from enum import Enum
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field

from .base import TenantOwned, VersionedEntity, gen_id, utc_now


class HarnessType(str, Enum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    SECURITY = "security"
    BUILD = "build"
    RELEASE = "release"
    DEPLOYMENT = "deployment"
    VERIFICATION = "verification"
    OPERATIONS = "operations"
    REMEDIATION = "remediation"
    ARCHITECTURE = "architecture"
    INCIDENT = "incident"
    BROWNFIELD_DISCOVERY = "brownfield_discovery"
    CUSTOM = "custom"


class HarnessLifecycle(str, Enum):
    DRAFT = "draft"
    VALIDATED = "validated"
    PUBLISHED = "published"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class HarnessVersion(VersionedEntity):
    harness_id: str
    graph_id: Optional[str] = None
    graph_version: Optional[str] = None
    loop_ids: list[str] = Field(default_factory=list)
    loop_versions: list[str] = Field(default_factory=list)
    agent_ids: list[str] = Field(default_factory=list)
    agent_contract_versions: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    model_config_ids: list[str] = Field(default_factory=list)
    policy_ids: list[str] = Field(default_factory=list)
    policy_versions: list[str] = Field(default_factory=list)
    environment: str = "development"
    cost_limit_cents: int = 10000
    time_limit_seconds: int = 3600
    approval_required: bool = False
    changelog: str = ""
    is_default: bool = False
    is_immutable: bool = False
    published_at: Optional[datetime] = None


class TemplateControl(str, Enum):
    REQUIRED = "required"
    OPTIONAL = "optional"
    CONFIGURABLE = "configurable"


class TemplateInheritanceLevel(str, Enum):
    PLATFORM = "platform"
    TENANT = "tenant"
    HARNESS = "harness"


class HarnessTemplateVersion(VersionedEntity):
    template_id: str
    version: str
    published: bool = False
    is_default: bool = False
    changelog: str = ""
    mandatory_steps: list[str] = Field(default_factory=list)
    optional_steps: list[str] = Field(default_factory=list)
    configurable: list[str] = Field(default_factory=list)
    tenant_override_allowed: bool = True
    tenant_override_forbidden: list[str] = Field(default_factory=list)
    default_config: dict = Field(default_factory=dict)
    is_immutable: bool = False


class HarnessTemplate(TenantOwned):
    name: str
    display_name: str
    description: str = ""
    harness_type: HarnessType = HarnessType.CUSTOM
    inheritance_level: TemplateInheritanceLevel = TemplateInheritanceLevel.PLATFORM
    parent_template_id: Optional[str] = None
    mandatory_steps: list[str] = Field(default_factory=list)
    optional_steps: list[str] = Field(default_factory=list)
    configurable: list[str] = Field(default_factory=list)
    tenant_override_allowed: bool = True
    tenant_override_forbidden: list[str] = Field(default_factory=list)
    default_config: dict = Field(default_factory=dict)
    current_version: str = "v1"
    versions: list[HarnessTemplateVersion] = Field(default_factory=list)
    published: bool = False
    deprecated: bool = False
    last_published_at: Optional[datetime] = None


class Harness(TenantOwned):
    name: str
    display_name: str
    purpose: str = ""
    harness_type: HarnessType = HarnessType.DEVELOPMENT
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    context: dict = Field(default_factory=dict)
    graph_id: Optional[str] = None
    loop_ids: list[str] = Field(default_factory=list)
    agent_ids: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    model_config_ids: list[str] = Field(default_factory=list)
    policy_ids: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    environment: str = "development"
    execution_rules: dict = Field(default_factory=dict)
    retry_rules: dict = Field(default_factory=lambda: {"max_retries": 3})
    failure_rules: dict = Field(default_factory=dict)
    approval_rules: dict = Field(default_factory=dict)
    escalation_rules: dict = Field(default_factory=dict)
    cost_limit_cents: int = 10000
    time_limit_seconds: int = 3600
    approval_required: bool = False
    evidence_requirements: list[str] = Field(default_factory=lambda: ["graph_execution", "agent_outputs", "tool_results"])
    current_version: str = "v1"
    versions: list[HarnessVersion] = Field(default_factory=list)
    template_id: Optional[str] = None
    template_version: Optional[str] = None
    published: bool = False
    application_id: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    lifecycle: HarnessLifecycle = HarnessLifecycle.DRAFT
    deprecated: bool = False
    archived: bool = False
    last_published_at: Optional[datetime] = None
