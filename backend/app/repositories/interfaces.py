from __future__ import annotations

from typing import Any, Optional, Protocol

from .base import Repository


class ApplicationRepository(Repository):
    """Application entity repository."""
    pass


class AgentRepository(Repository):
    """Agent entity repository with version support."""
    pass


class HarnessRepository(Repository):
    """Harness entity repository with version support."""
    pass


class PipelineRepository(Repository):
    """Pipeline entity repository."""
    pass


class ExecutionRepository(Repository):
    """Execution entity repository with event tracking."""
    pass


class EvidenceRepository(Repository):
    """Evidence entity repository - append-only audit trail."""
    pass


class EngineeringStateRepository(Repository):
    """Engineering State entity repository with change history."""
    pass


class SkillRepository(Repository):
    """Skill entity repository."""
    pass


class ToolRepository(Repository):
    """Tool entity repository."""
    pass


class ModelRepository(Repository):
    """Model configuration repository."""
    pass


class GraphRepository(Repository):
    """Graph entity repository with version support."""
    pass


class LoopRepository(Repository):
    """Loop entity repository."""
    pass


class PolicyRepository(Repository):
    """Policy entity repository."""
    pass


class RequirementRepository(Repository):
    """Requirement entity repository."""
    pass


class TenantRepository(Repository):
    """Tenant entity repository."""
    pass


class EnvironmentRepository(Repository):
    """Environment entity repository."""
    pass


class DeploymentRepository(Repository):
    """Deployment entity repository."""
    pass


class ArtifactRepository(Repository):
    """Artifact entity repository."""
    pass


class ApprovalRepository(Repository):
    """Approval entity repository."""
    pass


class HarnessTemplateRepository(Repository):
    """Harness template repository."""
    pass


class PipelineTemplateRepository(Repository):
    """Pipeline template repository."""
    pass


class EventStore(Protocol):
    """Event store for execution events - append-only with query support."""

    def append(self, event: Any) -> None: ...

    def get_by_execution(self, execution_id: str) -> list[Any]: ...

    def get_all(self) -> list[Any]: ...
