from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, VersionedEntity, gen_id


class AgentCategory(str, Enum):
    REQUIREMENT = "Requirement"
    PRODUCT_ANALYSIS = "Product Analysis"
    ARCHITECTURE = "Architecture"
    CODING = "Coding"
    CODE_REVIEW = "Code Review"
    TEST_GENERATION = "Test Generation"
    JUNIT = "JUnit"
    API_TESTING = "API Testing"
    SECURITY = "Security"
    SAST = "SAST"
    DEPENDENCY_SECURITY = "Dependency Security"
    BUILD = "Build"
    RELEASE_PLANNING = "Release Planning"
    RELEASE_NOTES = "Release Notes"
    DEPLOYMENT = "Deployment"
    VERIFICATION = "Verification"
    OPERATIONS = "Operations"
    INCIDENT_ANALYSIS = "Incident Analysis"
    ROOT_CAUSE = "Root Cause"
    REMEDIATION = "Remediation"
    CUSTOM = "Custom"


class AgentContract(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("contract_"))
    input_schema: dict = Field(default_factory=dict)
    output_schema: dict = Field(default_factory=dict)
    context_contract: dict = Field(default_factory=dict)
    skill_ids: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    model_config_id: Optional[str] = None
    permissions: list[str] = Field(default_factory=list)
    max_turns: int = 10
    timeout_seconds: int = 300
    token_budget: int = 100000
    cost_budget_cents: int = 500
    retry_policy: dict = Field(default_factory=lambda: {"max_retries": 3, "backoff": "exponential"})
    failure_behavior: str = "escalate"
    evidence_requirements: list[str] = Field(default_factory=lambda: ["input", "output", "model_used", "tokens"])
    harness_compatible: bool = True


class AgentVersion(VersionedEntity):
    agent_id: str
    contract: AgentContract = Field(default_factory=AgentContract)
    system_instructions: str = ""
    changelog: str = ""
    is_default: bool = False


class Agent(TenantOwned):
    name: str
    display_name: str
    category: AgentCategory
    purpose: str
    role: str = ""
    model_config_id: Optional[str] = None
    skill_ids: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    context_requirements: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    max_turns: int = 10
    timeout_seconds: int = 300
    token_budget: int = 100000
    cost_budget_cents: int = 500
    retry_policy: dict = Field(default_factory=lambda: {"max_retries": 3, "backoff": "exponential"})
    security_restrictions: list[str] = Field(default_factory=list)
    evidence_requirements: list[str] = Field(default_factory=lambda: ["input", "output", "model_used", "tokens"])
    current_version: str = "v1"
    versions: list[AgentVersion] = Field(default_factory=list)
    contract: AgentContract = Field(default_factory=AgentContract)
    system_instructions: str = ""
    published: bool = False
    tags: list[str] = Field(default_factory=list)
