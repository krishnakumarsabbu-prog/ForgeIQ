from __future__ import annotations

from enum import Enum
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id, utc_now


class EnvironmentType(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    SANDBOX = "sandbox"


class DeploymentStrategy(str, Enum):
    ROLLING = "rolling"
    BLUE_GREEN = "blue-green"
    CANARY = "canary"
    RECREATE = "recreate"


class DeploymentStatus(str, Enum):
    PENDING = "pending"
    PRECHECK_RUNNING = "precheck_running"
    PRECHECK_FAILED = "precheck_failed"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"
    POSTCHECK_RUNNING = "postcheck_running"
    POSTCHECK_FAILED = "postcheck_failed"
    VERIFYING = "verifying"
    VERIFIED = "verified"
    VERIFICATION_FAILED = "verification_failed"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"
    ROLLBACK_FAILED = "rollback_failed"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class VerificationType(str, Enum):
    HEALTH = "health"
    API = "api"
    SMOKE_TEST = "smoke_test"
    FUNCTIONAL = "functional"
    PERFORMANCE = "performance"
    METRICS = "metrics"
    LOGS = "logs"
    ERROR_RATE = "error_rate"
    SECURITY = "security"
    BUSINESS_BEHAVIOR = "business_behavior"


class VerificationStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    PENDING = "pending"
    SKIPPED = "skipped"


class CheckResult(BaseModel):
    name: str
    status: str = "pending"
    expected: str = ""
    observed: str = ""
    message: str = ""
    duration_ms: int = 0
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())


class PrecheckResult(BaseModel):
    name: str
    status: str = "pending"
    message: str = ""
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())


class PostcheckResult(BaseModel):
    name: str
    status: str = "pending"
    message: str = ""
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())


class RollbackResult(BaseModel):
    status: str = "pending"
    previous_version: str = ""
    message: str = ""
    completed_at: Optional[str] = None


class VerificationCheck(BaseModel):
    verification_type: str = "health"
    status: str = "pending"
    expected_state: dict = Field(default_factory=dict)
    observed_state: dict = Field(default_factory=dict)
    message: str = ""
    duration_ms: int = 0
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())


class VerificationResult(BaseModel):
    overall_status: str = "pending"
    checks: list[VerificationCheck] = Field(default_factory=list)
    passed: int = 0
    failed: int = 0
    warning: int = 0
    skipped: int = 0
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())


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
    status: str = DeploymentStatus.PENDING.value
    strategy: str = DeploymentStrategy.ROLLING.value
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    verified: bool = False
    verification_results: dict = Field(default_factory=dict)
    rollback_supported: bool = True
    execution_id: Optional[str] = None
    health_checks: list[dict] = Field(default_factory=list)

    prechecks: list[PrecheckResult] = Field(default_factory=list)
    postchecks: list[PostcheckResult] = Field(default_factory=list)
    verification: Optional[VerificationResult] = None
    rollback_result: Optional[RollbackResult] = None
    previous_deployment_id: Optional[str] = None
    evidence_ids: list[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
