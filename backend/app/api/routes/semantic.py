from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ...storage.in_memory import store

router = APIRouter(prefix="/semantic", tags=["semantic"])


@router.get("/entities")
def list_semantic_entities(tenant_id: str = "tenant_forgeiq", application_id: str = ""):
    entities = store.semantic_entities.all(tenant_id)
    if application_id:
        entities = [e for e in entities if e.application_id == application_id]
    return entities


@router.get("/entities/{entity_id}")
def get_semantic_entity(entity_id: str):
    e = store.semantic_entities.get(entity_id)
    if not e:
        raise HTTPException(404, "Semantic entity not found")
    return e


@router.get("/relationships")
def list_semantic_relationships(tenant_id: str = "tenant_forgeiq"):
    return store.semantic_relationships.all(tenant_id)
