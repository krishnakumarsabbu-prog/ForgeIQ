from __future__ import annotations

from fastapi import APIRouter

from ...storage.in_memory import store

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("")
def list_tenants():
    return store.tenants.all()


@router.get("/{tenant_id}")
def get_tenant(tenant_id: str):
    return store.tenants.get(tenant_id)


@router.get("/{tenant_id}/users")
def list_users(tenant_id: str):
    return store.users.all(tenant_id)
