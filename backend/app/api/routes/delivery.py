from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.base import gen_id, utc_now
from ...domain.models.deployment import (
    Deployment, DeploymentStatus, DeploymentStrategy,
    Environment, EnvironmentType, Artifact,
)

router = APIRouter(prefix="/delivery", tags=["delivery"])


# ─── Request Models ───────────────────────────────────────────────

class CreateDeploymentRequest(BaseModel):
    application_id: str
    environment_id: str
    artifact_id: Optional[str] = None
    version: str = ""
    strategy: str = DeploymentStrategy.ROLLING.value
    rollback_supported: bool = True
    execution_id: Optional[str] = None
    auto_verify: bool = True
    auto_rollback_on_failure: bool = True


class VerifyDeploymentRequest(BaseModel):
    execution_id: str = ""
    check_types: Optional[list[str]] = None


class RollbackDeploymentRequest(BaseModel):
    execution_id: str = ""
    reason: str = ""


class CreateEnvironmentRequest(BaseModel):
    name: str
    display_name: str
    env_type: str = EnvironmentType.DEVELOPMENT.value
    application_id: Optional[str] = None
    cluster: str = ""
    region: str = "us-east-1"
    protected: bool = False
    requires_approval: bool = False


class CreateArtifactRequest(BaseModel):
    application_id: str
    name: str
    version: str
    type: str = "container"
    hash: str = ""
    registry: str = ""
    size_bytes: int = 0
    tags: list[str] = Field(default_factory=list)


# ─── Environments ──────────────────────────────────────────────────

@router.get("/environments")
def list_environments(tenant_id: str = "tenant_forgeiq"):
    return store.environments.all(tenant_id)


@router.get("/environments/{env_id}")
def get_environment(env_id: str):
    e = store.environments.get(env_id)
    if not e:
        raise HTTPException(404, "Environment not found")
    return e


@router.post("/environments")
def create_environment(body: CreateEnvironmentRequest, tenant_id: str = "tenant_forgeiq"):
    try:
        etype = EnvironmentType(body.env_type)
    except ValueError:
        raise HTTPException(400, f"Invalid environment type: {body.env_type}")
    e = Environment(
        tenant_id=tenant_id,
        id=gen_id("env_"),
        name=body.name,
        display_name=body.display_name,
        env_type=etype,
        application_id=body.application_id,
        cluster=body.cluster,
        region=body.region,
        protected=body.protected,
        requires_approval=body.requires_approval,
        active=True,
        created_at=utc_now().isoformat(),
    )
    store.environments.add(e)
    return e


# ─── Artifacts ────────────────────────────────────────────────────

@router.get("/artifacts")
def list_artifacts(tenant_id: str = "tenant_forgeiq"):
    return store.artifacts.all(tenant_id)


@router.get("/artifacts/{artifact_id}")
def get_artifact(artifact_id: str):
    a = store.artifacts.get(artifact_id)
    if not a:
        raise HTTPException(404, "Artifact not found")
    return a


@router.post("/artifacts")
def create_artifact(body: CreateArtifactRequest, tenant_id: str = "tenant_forgeiq"):
    a = Artifact(
        tenant_id=tenant_id,
        id=gen_id("art_"),
        application_id=body.application_id,
        name=body.name,
        version=body.version,
        type=body.type,
        hash=body.hash,
        registry=body.registry,
        size_bytes=body.size_bytes,
        tags=body.tags,
        created_at=utc_now().isoformat(),
    )
    store.artifacts.add(a)
    return a


# ─── Deployments ──────────────────────────────────────────────────

@router.get("/deployments")
def list_deployments(tenant_id: str = "tenant_forgeiq"):
    return store.deployments.all(tenant_id)


@router.get("/deployments/{deployment_id}")
def get_deployment(deployment_id: str):
    d = store.deployments.get(deployment_id)
    if not d:
        raise HTTPException(404, "Deployment not found")
    return d


@router.post("/deployments")
async def create_deployment(body: CreateDeploymentRequest, tenant_id: str = "tenant_forgeiq"):
    app = store.applications.get(body.application_id)
    if not app:
        raise HTTPException(404, "Application not found")
    env = store.environments.get(body.environment_id)
    if not env:
        raise HTTPException(404, "Environment not found")

    try:
        strategy = DeploymentStrategy(body.strategy)
    except ValueError:
        raise HTTPException(400, f"Invalid deployment strategy: {body.strategy}")

    execution_id = body.execution_id or gen_id("exec_")
    deployment = Deployment(
        tenant_id=tenant_id,
        id=gen_id("dep_"),
        application_id=body.application_id,
        environment_id=body.environment_id,
        artifact_id=body.artifact_id,
        version=body.version or app.current_version,
        status=DeploymentStatus.PENDING.value,
        strategy=strategy.value,
        rollback_supported=body.rollback_supported,
        execution_id=execution_id,
        created_at=utc_now().isoformat(),
    )

    prev_deployments = [
        d for d in store.deployments.all(tenant_id)
        if d.application_id == body.application_id
        and d.environment_id == body.environment_id
        and d.id != deployment.id
    ]
    if prev_deployments:
        prev = sorted(prev_deployments, key=lambda x: x.created_at, reverse=True)[0]
        deployment.previous_deployment_id = prev.id
        deployment.metadata["previous_version"] = prev.version

    store.deployments.add(deployment)

    from ...runtime.deployment_runtime import DeploymentRuntime
    runtime = DeploymentRuntime(tenant_id)
    result = await runtime.execute_deployment(
        deployment_id=deployment.id,
        execution_id=execution_id,
        auto_verify=body.auto_verify,
        auto_rollback_on_failure=body.auto_rollback_on_failure,
    )
    return {"deployment": deployment, "execution_result": result}


@router.post("/deployments/{deployment_id}/verify")
async def verify_deployment(deployment_id: str, body: VerifyDeploymentRequest):
    d = store.deployments.get(deployment_id)
    if not d:
        raise HTTPException(404, "Deployment not found")

    execution_id = body.execution_id or d.execution_id or gen_id("exec_")
    from ...runtime.verification_engine import VerificationEngine
    engine = VerificationEngine(d.tenant_id)
    result = await engine.verify_deployment(
        deployment_id=deployment_id,
        execution_id=execution_id,
        check_types=body.check_types,
    )
    return {"deployment_id": deployment_id, "verification": result}


@router.post("/deployments/{deployment_id}/rollback")
async def rollback_deployment(deployment_id: str, body: RollbackDeploymentRequest):
    d = store.deployments.get(deployment_id)
    if not d:
        raise HTTPException(404, "Deployment not found")

    execution_id = body.execution_id or d.execution_id or gen_id("exec_")
    from ...runtime.deployment_runtime import DeploymentRuntime
    runtime = DeploymentRuntime(d.tenant_id)
    result = await runtime.rollback_deployment(
        deployment_id=deployment_id,
        execution_id=execution_id,
        reason=body.reason,
    )
    return {"deployment_id": deployment_id, "rollback": result}


@router.get("/deployments/{deployment_id}/verification")
def get_deployment_verification(deployment_id: str):
    d = store.deployments.get(deployment_id)
    if not d:
        raise HTTPException(404, "Deployment not found")
    return d.verification or d.verification_results


@router.get("/deployments/{deployment_id}/evidence")
def get_deployment_evidence(deployment_id: str):
    d = store.deployments.get(deployment_id)
    if not d:
        raise HTTPException(404, "Deployment not found")
    evidence_list = []
    for eid in d.evidence_ids:
        ev = store.evidence.get(eid)
        if ev:
            evidence_list.append(ev)
    return evidence_list


# ─── Strategy / Status enums ──────────────────────────────────────

@router.get("/deployment-strategies")
def list_deployment_strategies():
    return [{"value": s.value, "label": s.value.replace("-", " ").title()} for s in DeploymentStrategy]


@router.get("/deployment-statuses")
def list_deployment_statuses():
    return [{"value": s.value, "label": s.value.replace("_", " ").title()} for s in DeploymentStatus]


@router.get("/verification-types")
def list_verification_types():
    from ...domain.models.deployment import VerificationType
    return [{"value": v.value, "label": v.value.replace("_", " ").title()} for v in VerificationType]
