from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ...storage.in_memory import store

router = APIRouter(prefix="/delivery", tags=["delivery"])


@router.get("/environments")
def list_environments(tenant_id: str = "tenant_forgeiq"):
    return store.environments.all(tenant_id)


@router.get("/environments/{env_id}")
def get_environment(env_id: str):
    e = store.environments.get(env_id)
    if not e:
        raise HTTPException(404, "Environment not found")
    return e


@router.get("/artifacts")
def list_artifacts(tenant_id: str = "tenant_forgeiq"):
    return store.artifacts.all(tenant_id)


@router.get("/artifacts/{artifact_id}")
def get_artifact(artifact_id: str):
    a = store.artifacts.get(artifact_id)
    if not a:
        raise HTTPException(404, "Artifact not found")
    return a


@router.get("/deployments")
def list_deployments(tenant_id: str = "tenant_forgeiq"):
    return store.deployments.all(tenant_id)


@router.get("/deployments/{deployment_id}")
def get_deployment(deployment_id: str):
    d = store.deployments.get(deployment_id)
    if not d:
        raise HTTPException(404, "Deployment not found")
    return d
