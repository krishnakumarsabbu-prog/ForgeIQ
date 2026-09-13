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
    inputs_schema: dict = Field(default_factory=lambda: {"type": "object", "properties": {}})
    outputs_schema: dict = Field(default_factory=lambda: {"type": "object", "properties": {}})
    tenant_id: str = "tenant_forgeiq"


class ToolUpdate(BaseModel):
    display_name: str | None = None
    description: str | None = None
    risk_level: ToolRisk | None = None
    allowed_operations: list[str] | None = None
    supported_environments: list[str] | None = None
    permissions: list[str] | None = None
    category: str | None = None
    active: bool | None = None


@router.get("")
def list_tools(tenant_id: str = "tenant_forgeiq", category: str | None = None):
    tools = store.tools.all(tenant_id)
    if category:
        tools = [t for t in tools if t.category == category]
    return tools


@router.get("/categories")
def list_tool_categories():
    return [
        {"value": "vcs", "label": "Version Control"},
        {"value": "filesystem", "label": "Filesystem"},
        {"value": "shell", "label": "Shell"},
        {"value": "package", "label": "Package Manager"},
        {"value": "runtime", "label": "Runtime"},
        {"value": "build", "label": "Build"},
        {"value": "testing", "label": "Testing"},
        {"value": "security", "label": "Security"},
        {"value": "delivery", "label": "Delivery"},
        {"value": "orchestration", "label": "Orchestration"},
        {"value": "cloud", "label": "Cloud"},
        {"value": "operations", "label": "Operations"},
        {"value": "integration", "label": "Integration"},
        {"value": "notification", "label": "Notification"},
    ]


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
        inputs_schema=body.inputs_schema,
        outputs_schema=body.outputs_schema,
        created_at=utc_now(),
    )
    store.tools.add(t)
    return t


@router.put("/{tool_id}")
def update_tool(tool_id: str, body: ToolUpdate):
    t = store.tools.get(tool_id)
    if not t:
        raise HTTPException(404, "Tool not found")
    patch = body.model_dump(exclude_none=True)
    return store.tools.update(tool_id, patch)


@router.delete("/{tool_id}")
def delete_tool(tool_id: str):
    if not store.tools.delete(tool_id):
        raise HTTPException(404, "Tool not found")
    return {"deleted": True}
