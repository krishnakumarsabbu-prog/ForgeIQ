from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.tool import Tool, ToolRisk
from ...domain.models.base import gen_id, utc_now

router = APIRouter(prefix="/tools", tags=["tools"])


class ToolCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    risk_level: ToolRisk = ToolRisk.MEDIUM
    allowed_operations: list[str] = Field(default_factory=list)
    supported_environments: list[str] = Field(default_factory=lambda: ["development"])
    permissions: list[str] = Field(default_factory=list)
    category: str = "execution"
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_tools(tenant_id: str = "tenant_forgeiq"):
    return store.tools.all(tenant_id)


@router.get("/{tool_id}")
def get_tool(tool_id: str):
    t = store.tools.get(tool_id)
    if not t:
        raise HTTPException(404, "Tool not found")
    return t


@router.post("")
def create_tool(body: ToolCreate):
    t = Tool(
        tenant_id=body.tenant_id,
        id=gen_id("tool_"),
        name=body.name.lower().replace(" ", "-"),
        display_name=body.display_name,
        description=body.description,
        risk_level=body.risk_level,
        allowed_operations=body.allowed_operations,
        supported_environments=body.supported_environments,
        permissions=body.permissions,
        category=body.category,
        created_at=utc_now(),
    )
    store.tools.add(t)
    return t
