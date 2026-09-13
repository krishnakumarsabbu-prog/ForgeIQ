from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id, utc_now


class BrownfieldImportStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class BrownfieldPhaseStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class BrownfieldPhase(BaseModel):
    name: str
    label: str
    description: str
    status: BrownfieldPhaseStatus = BrownfieldPhaseStatus.PENDING
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    findings: list[dict] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
    summary: str = ""


class BrownfieldImportConfig(BaseModel):
    repository_url: str
    branch: str = "main"
    provider: str = "github"
    access_token: Optional[str] = None
    application_name: str = ""
    application_display_name: str = ""
    team: str = "Platform Engineering"
    tenant_id: str = "tenant_forgeiq"


class BrownfieldImport(TenantOwned):
    id: str = Field(default_factory=lambda: gen_id("bfimport_"))
    config: BrownfieldImportConfig
    status: BrownfieldImportStatus = BrownfieldImportStatus.PENDING
    application_id: Optional[str] = None
    engineering_state_id: Optional[str] = None
    phases: list[BrownfieldPhase] = Field(default_factory=list)
    current_phase: str = ""
    progress: float = 0.0
    semantic_model: dict = Field(default_factory=dict)
    documentation: dict = Field(default_factory=dict)
    recommended_harnesses: list[dict] = Field(default_factory=list)
    recommended_pipelines: list[dict] = Field(default_factory=list)
    error_message: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


BROWNFIELD_PHASE_DEFINITIONS = [
    ("repository_discovery", "Repository Discovery", "Clone and analyze repository structure, branches, and commit history"),
    ("technology_detection", "Technology Detection", "Identify programming languages, frameworks, and build systems"),
    ("architecture_analysis", "Architecture Analysis", "Map application architecture, layers, and component relationships"),
    ("dependency_analysis", "Dependency Analysis", "Catalog external dependencies and assess version health"),
    ("api_analysis", "API Analysis", "Discover REST/GraphQL endpoints, controllers, and service interfaces"),
    ("code_analysis", "Code Analysis", "Analyze code structure: modules, services, components, classes, functions"),
    ("test_analysis", "Test Analysis", "Identify test suites, coverage, and quality gaps"),
    ("security_analysis", "Security Analysis", "Run SAST, dependency scanning, and secret detection"),
    ("documentation_generation", "Documentation Generation", "Generate wikis, guides, and engineering decision records"),
    ("semantic_model_build", "Semantic Model Build", "Construct persistent semantic model of the application"),
    ("engineering_state_build", "Engineering State Build", "Create persistent engineering state from discovery findings"),
]


def create_default_phases() -> list[BrownfieldPhase]:
    return [
        BrownfieldPhase(
            name=name,
            label=label,
            description=desc,
        )
        for name, label, desc in BROWNFIELD_PHASE_DEFINITIONS
    ]
