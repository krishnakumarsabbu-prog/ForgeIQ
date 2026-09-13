from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ...storage.in_memory import store
from ...domain.models.policy import Policy, PolicyType, PolicyScope
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/policies", tags=["policies"])


class PolicyCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    policy_type: PolicyType = PolicyType.ALLOW
    scope: PolicyScope = PolicyScope.TENANT
    target_id: Optional[str] = None
    rules: list[dict] = Field(default_factory=list)
    enforcement: str = "hard"
    priority: int = 100
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_policies(tenant_id: str = "tenant_forgeiq"):
    return store.policies.all(tenant_id)


@router.get("/{policy_id}")
def get_policy(policy_id: str):
    p = store.policies.get(policy_id)
    if not p:
        raise HTTPException(404, "Policy not found")
    return p


@router.post("")
def create_policy(body: PolicyCreate):
    p = Policy(
        tenant_id=body.tenant_id,
        id=gen_id("pol_"),
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        policy_type=body.policy_type,
        scope=body.scope,
        target_id=body.target_id,
        rules=body.rules,
        enforcement=body.enforcement,
        priority=body.priority,
        created_at=utc_now(),
    )
    store.policies.add(p)
    return p
