from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.brownfield_import import BrownfieldImportConfig
from ...runtime.brownfield_engine import BrownfieldDiscoveryEngine

router = APIRouter(prefix="/brownfield", tags=["brownfield"])


class ImportRequest(BaseModel):
    repository_url: str
    branch: str = "main"
    provider: str = "github"
    access_token: str | None = None
    application_name: str = ""
    application_display_name: str = ""
    team: str = "Platform Engineering"
    tenant_id: str = "tenant_forgeiq"


@router.get("/imports")
def list_imports(tenant_id: str = "tenant_forgeiq"):
    engine = BrownfieldDiscoveryEngine(tenant_id)
    return engine.list_imports()


@router.get("/imports/{import_id}")
def get_import(import_id: str, tenant_id: str = "tenant_forgeiq"):
    engine = BrownfieldDiscoveryEngine("tenant_forgeiq")
    imp = engine.get_import(import_id)
    if not imp:
        raise HTTPException(404, "Brownfield import not found")
    return imp


@router.post("/imports")
async def create_import(body: ImportRequest):
    config = BrownfieldImportConfig(
        repository_url=body.repository_url,
        branch=body.branch,
        provider=body.provider,
        access_token=body.access_token,
        application_name=body.application_name,
        application_display_name=body.application_display_name,
        team=body.team,
        tenant_id=body.tenant_id,
    )
    engine = BrownfieldDiscoveryEngine(body.tenant_id)
    imp = engine.create_import(config)
    asyncio.create_task(engine.run_discovery(imp.id))
    return imp


@router.get("/imports/{import_id}/phases")
def get_import_phases(import_id: str, tenant_id: str = "tenant_forgeiq"):
    engine = BrownfieldDiscoveryEngine(tenant_id)
    imp = engine.get_import(import_id)
    if not imp:
        raise HTTPException(404, "Brownfield import not found")
    return imp.phases


@router.get("/imports/{import_id}/semantic-model")
def get_import_semantic_model(import_id: str, tenant_id: str = "tenant_forgeiq"):
    engine = BrownfieldDiscoveryEngine(tenant_id)
    imp = engine.get_import(import_id)
    if not imp:
        raise HTTPException(404, "Brownfield import not found")
    app_id = imp.application_id or ""
    entities = [e for e in store.semantic_entities.all() if e.application_id == app_id]
    relationships = [r for r in store.semantic_relationships.all() if r.application_id == app_id]
    return {
        "entities": entities,
        "relationships": relationships,
        "summary": imp.semantic_model,
    }


@router.get("/imports/{import_id}/documentation")
def get_import_documentation(import_id: str, tenant_id: str = "tenant_forgeiq"):
    engine = BrownfieldDiscoveryEngine(tenant_id)
    imp = engine.get_import(import_id)
    if not imp:
        raise HTTPException(404, "Brownfield import not found")
    return imp.documentation


@router.get("/imports/{import_id}/recommendations")
def get_import_recommendations(import_id: str, tenant_id: str = "tenant_forgeiq"):
    engine = BrownfieldDiscoveryEngine(tenant_id)
    imp = engine.get_import(import_id)
    if not imp:
        raise HTTPException(404, "Brownfield import not found")
    return {
        "harnesses": imp.recommended_harnesses,
        "pipelines": imp.recommended_pipelines,
    }
