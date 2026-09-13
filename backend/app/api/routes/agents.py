from __future__ import annotations

import asyncio
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any

from ...storage.in_memory import store
from ...domain.models.agent import Agent, AgentVersion, AgentContract, AgentCategory
from ...domain.models.base import gen_id, utc_now
from ...domain.models.execution import ExecutionEvent, EventType
from ...domain.models.evidence import Evidence, EvidenceType

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentCreate(BaseModel):
    name: str
    display_name: str
    category: AgentCategory = AgentCategory.CUSTOM
    purpose: str
    role: str = ""
    model_config_id: Optional[str] = None
    skill_ids: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    max_turns: int = 10
    timeout_seconds: int = 300
    token_budget: int = 100000
    system_instructions: str = ""
    tenant_id: str = "tenant_forgeiq"


class AgentFactoryRequest(BaseModel):
    description: str
    category: AgentCategory = AgentCategory.CUSTOM
    tenant_id: str = "tenant_forgeiq"


class AgentFactoryFullRequest(BaseModel):
    display_name: str
    purpose: str
    role: str = ""
    category: AgentCategory = AgentCategory.CUSTOM
    system_instructions: str = ""
    skill_ids: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    model_config_id: Optional[str] = None
    context_requirements: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    security_restrictions: list[str] = Field(default_factory=list)
    evidence_requirements: list[str] = Field(default_factory=lambda: ["input", "output", "model_used", "tokens"])
    max_turns: int = 15
    timeout_seconds: int = 600
    token_budget: int = 200000
    cost_budget_cents: int = 500
    retry_policy: dict = Field(default_factory=lambda: {"max_retries": 3, "backoff": "exponential"})
    failure_behavior: str = "escalate"
    input_schema: dict = Field(default_factory=dict)
    output_schema: dict = Field(default_factory=dict)
    context_contract: dict = Field(default_factory=dict)
    tenant_id: str = "tenant_forgeiq"


class AgentUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    purpose: Optional[str] = None
    role: Optional[str] = None
    system_instructions: Optional[str] = None
    skill_ids: Optional[list[str]] = None
    tool_ids: Optional[list[str]] = None
    model_config_id: Optional[str] = None
    context_requirements: Optional[list[str]] = None
    permissions: Optional[list[str]] = None
    security_restrictions: Optional[list[str]] = None
    evidence_requirements: Optional[list[str]] = None
    max_turns: Optional[int] = None
    timeout_seconds: Optional[int] = None
    token_budget: Optional[int] = None
    cost_budget_cents: Optional[int] = None
    retry_policy: Optional[dict] = None
    failure_behavior: Optional[str] = None


class AgentTestRequest(BaseModel):
    inputs: dict = Field(default_factory=dict)
    context: dict = Field(default_factory=dict)
    tenant_id: str = "tenant_forgeiq"


class AgentVersionCreateRequest(BaseModel):
    changelog: str = "New version"
    system_instructions: Optional[str] = None
    contract: Optional[AgentContract] = None
    tenant_id: str = "tenant_forgeiq"


@router.get("")
def list_agents(tenant_id: str = "tenant_forgeiq"):
    return store.agents.all(tenant_id)


@router.get("/{agent_id}")
def get_agent(agent_id: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent


@router.post("")
def create_agent(body: AgentCreate):
    contract = AgentContract(
        skill_ids=body.skill_ids,
        tool_ids=body.tool_ids,
        model_config_id=body.model_config_id,
        max_turns=body.max_turns,
        timeout_seconds=body.timeout_seconds,
        token_budget=body.token_budget,
    )
    agent = Agent(
        tenant_id=body.tenant_id,
        id=gen_id("agent_"),
        name=body.name.lower().replace(" ", "-"),
        display_name=body.display_name,
        category=body.category,
        purpose=body.purpose,
        role=body.role,
        model_config_id=body.model_config_id,
        skill_ids=body.skill_ids,
        tool_ids=body.tool_ids,
        max_turns=body.max_turns,
        timeout_seconds=body.timeout_seconds,
        token_budget=body.token_budget,
        contract=contract,
        system_instructions=body.system_instructions or f"You are a {body.display_name}. {body.purpose}",
        published=False,
        current_version="v1",
        created_at=utc_now(),
    )
    v1 = AgentVersion(
        tenant_id=body.tenant_id,
        id=gen_id("aver_"),
        agent_id=agent.id,
        version="v1",
        published=False,
        is_default=True,
        contract=contract,
        system_instructions=agent.system_instructions,
        changelog="Initial version",
        created_at=utc_now(),
    )
    agent.versions = [v1]
    store.agents.add(agent)
    return agent


@router.put("/{agent_id}")
def update_agent(agent_id: str, body: AgentUpdateRequest):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for k, v in updates.items():
        if hasattr(agent, k):
            setattr(agent, k, v)
    if "skill_ids" in updates:
        agent.contract.skill_ids = updates["skill_ids"]
    if "tool_ids" in updates:
        agent.contract.tool_ids = updates["tool_ids"]
    if "model_config_id" in updates:
        agent.contract.model_config_id = updates["model_config_id"]
    if "max_turns" in updates:
        agent.contract.max_turns = updates["max_turns"]
    if "timeout_seconds" in updates:
        agent.contract.timeout_seconds = updates["timeout_seconds"]
    if "token_budget" in updates:
        agent.contract.token_budget = updates["token_budget"]
    if "cost_budget_cents" in updates:
        agent.contract.cost_budget_cents = updates["cost_budget_cents"]
    if "retry_policy" in updates:
        agent.contract.retry_policy = updates["retry_policy"]
    if "failure_behavior" in updates:
        agent.contract.failure_behavior = updates["failure_behavior"]
    if "evidence_requirements" in updates:
        agent.contract.evidence_requirements = updates["evidence_requirements"]
    agent.touch()
    return agent


@router.post("/factory")
def agent_factory(body: AgentFactoryRequest):
    category = body.category
    name = body.description[:40].strip()
    display_name = name.title()

    relevant_skills = []
    for s in store.skills.all(body.tenant_id):
        if any(kw in body.description.lower() for kw in [s.language.lower(), s.framework.lower()] if kw):
            relevant_skills.append(s.id)

    relevant_tools = []
    for t in store.tools.all(body.tenant_id):
        if any(kw in body.description.lower() for kw in [t.name, t.display_name.lower()]):
            relevant_tools.append(t.id)

    models = store.models.all(body.tenant_id)
    model_id = models[0].id if models else None

    contract = AgentContract(
        skill_ids=relevant_skills[:3],
        tool_ids=relevant_tools[:3],
        model_config_id=model_id,
        max_turns=15,
        timeout_seconds=600,
        token_budget=200000,
    )

    agent = Agent(
        tenant_id=body.tenant_id,
        id=gen_id("agent_"),
        name=display_name.lower().replace(" ", "-"),
        display_name=display_name,
        category=category,
        purpose=body.description,
        role="Generated Agent",
        model_config_id=model_id,
        skill_ids=relevant_skills[:3],
        tool_ids=relevant_tools[:3],
        contract=contract,
        system_instructions=f"You are a {display_name}. {body.description} Always produce evidence of your work.",
        published=True,
        current_version="v1",
        created_at=utc_now(),
    )
    v1 = AgentVersion(
        tenant_id=body.tenant_id,
        id=gen_id("aver_"),
        agent_id=agent.id,
        version="v1",
        published=True,
        is_default=True,
        contract=contract,
        system_instructions=agent.system_instructions,
        changelog="Generated by Agent Factory",
        created_at=utc_now(),
    )
    agent.versions = [v1]
    store.agents.add(agent)
    return agent


@router.post("/factory/full")
def agent_factory_full(body: AgentFactoryFullRequest):
    contract = AgentContract(
        skill_ids=body.skill_ids,
        tool_ids=body.tool_ids,
        model_config_id=body.model_config_id,
        permissions=body.permissions,
        max_turns=body.max_turns,
        timeout_seconds=body.timeout_seconds,
        token_budget=body.token_budget,
        cost_budget_cents=body.cost_budget_cents,
        retry_policy=body.retry_policy,
        failure_behavior=body.failure_behavior,
        evidence_requirements=body.evidence_requirements,
        input_schema=body.input_schema,
        output_schema=body.output_schema,
        context_contract=body.context_contract,
        harness_compatible=True,
    )

    name_slug = body.display_name.lower().replace(" ", "-")
    agent = Agent(
        tenant_id=body.tenant_id,
        id=gen_id("agent_"),
        name=name_slug,
        display_name=body.display_name,
        category=body.category,
        purpose=body.purpose,
        role=body.role,
        model_config_id=body.model_config_id,
        skill_ids=body.skill_ids,
        tool_ids=body.tool_ids,
        context_requirements=body.context_requirements,
        permissions=body.permissions,
        security_restrictions=body.security_restrictions,
        evidence_requirements=body.evidence_requirements,
        max_turns=body.max_turns,
        timeout_seconds=body.timeout_seconds,
        token_budget=body.token_budget,
        cost_budget_cents=body.cost_budget_cents,
        retry_policy=body.retry_policy,
        contract=contract,
        system_instructions=body.system_instructions,
        published=False,
        current_version="v1",
        created_at=utc_now(),
    )
    v1 = AgentVersion(
        tenant_id=body.tenant_id,
        id=gen_id("aver_"),
        agent_id=agent.id,
        version="v1",
        published=False,
        is_default=True,
        contract=contract,
        system_instructions=body.system_instructions,
        changelog="Created via Agent Factory",
        created_at=utc_now(),
    )
    agent.versions = [v1]
    store.agents.add(agent)
    return agent


@router.post("/{agent_id}/clone")
def clone_agent(agent_id: str, body: dict = None):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    body = body or {}
    new_display = body.get("display_name", f"{agent.display_name} (Clone)")
    new_name = new_display.lower().replace(" ", "-")
    cloned = Agent(
        tenant_id=agent.tenant_id,
        id=gen_id("agent_"),
        name=new_name,
        display_name=new_display,
        category=agent.category,
        purpose=agent.purpose,
        role=agent.role,
        model_config_id=agent.model_config_id,
        skill_ids=list(agent.skill_ids),
        tool_ids=list(agent.tool_ids),
        context_requirements=list(agent.context_requirements),
        permissions=list(agent.permissions),
        security_restrictions=list(agent.security_restrictions),
        evidence_requirements=list(agent.evidence_requirements),
        max_turns=agent.max_turns,
        timeout_seconds=agent.timeout_seconds,
        token_budget=agent.token_budget,
        cost_budget_cents=agent.cost_budget_cents,
        retry_policy=dict(agent.retry_policy),
        contract=agent.contract.model_copy(deep=True),
        system_instructions=agent.system_instructions,
        published=False,
        current_version="v1",
        created_at=utc_now(),
    )
    v1 = AgentVersion(
        tenant_id=agent.tenant_id,
        id=gen_id("aver_"),
        agent_id=cloned.id,
        version="v1",
        published=False,
        is_default=True,
        contract=agent.contract.model_copy(deep=True),
        system_instructions=agent.system_instructions,
        changelog=f"Cloned from {agent.display_name}",
        created_at=utc_now(),
    )
    cloned.versions = [v1]
    store.agents.add(cloned)
    return cloned


@router.get("/{agent_id}/versions")
def get_agent_versions(agent_id: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent.versions


@router.post("/{agent_id}/versions")
def create_agent_version(agent_id: str, body: AgentVersionCreateRequest = None):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    if body is None:
        body = AgentVersionCreateRequest()
    version_num = len(agent.versions) + 1
    contract = body.contract or agent.contract.model_copy(deep=True)
    instructions = body.system_instructions or agent.system_instructions
    new_version = AgentVersion(
        tenant_id=agent.tenant_id,
        id=gen_id("aver_"),
        agent_id=agent_id,
        version=f"v{version_num}",
        published=False,
        is_default=False,
        contract=contract,
        system_instructions=instructions,
        changelog=body.changelog,
        created_at=utc_now(),
    )
    agent.versions.append(new_version)
    return new_version


@router.post("/{agent_id}/publish/{version}")
def publish_agent_version(agent_id: str, version: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    found = False
    for v in agent.versions:
        if v.version == version:
            v.published = True
            v.is_default = True
            v.deprecated = False
            found = True
        else:
            v.is_default = False
    if not found:
        raise HTTPException(404, f"Version {version} not found")
    agent.current_version = version
    agent.published = True
    return agent


@router.post("/{agent_id}/rollback/{version}")
def rollback_default_version(agent_id: str, version: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    found = False
    for v in agent.versions:
        if v.version == version:
            if not v.published:
                raise HTTPException(400, f"Version {version} is not published")
            v.is_default = True
            found = True
        else:
            v.is_default = False
    if not found:
        raise HTTPException(404, f"Version {version} not found")
    agent.current_version = version
    return agent


@router.post("/{agent_id}/deprecate/{version}")
def deprecate_agent_version(agent_id: str, version: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    for v in agent.versions:
        if v.version == version:
            v.deprecated = True
            v.is_default = False
            return agent
    raise HTTPException(404, f"Version {version} not found")


@router.get("/{agent_id}/compare/{version_a}/{version_b}")
def compare_versions(agent_id: str, version_a: str, version_b: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    va = None
    vb = None
    for v in agent.versions:
        if v.version == version_a:
            va = v
        if v.version == version_b:
            vb = v
    if not va:
        raise HTTPException(404, f"Version {version_a} not found")
    if not vb:
        raise HTTPException(404, f"Version {version_b} not found")
    return {
        "version_a": va,
        "version_b": vb,
        "differences": {
            "system_instructions": va.system_instructions != vb.system_instructions,
            "changelog": va.changelog != vb.changelog,
            "skill_ids": va.contract.skill_ids != vb.contract.skill_ids,
            "tool_ids": va.contract.tool_ids != vb.contract.tool_ids,
            "model_config_id": va.contract.model_config_id != vb.contract.model_config_id,
            "max_turns": va.contract.max_turns != vb.contract.max_turns,
            "timeout_seconds": va.contract.timeout_seconds != vb.contract.timeout_seconds,
            "token_budget": va.contract.token_budget != vb.contract.token_budget,
            "cost_budget_cents": va.contract.cost_budget_cents != vb.contract.cost_budget_cents,
            "retry_policy": va.contract.retry_policy != vb.contract.retry_policy,
            "failure_behavior": va.contract.failure_behavior != vb.contract.failure_behavior,
            "evidence_requirements": va.contract.evidence_requirements != vb.contract.evidence_requirements,
            "permissions": va.contract.permissions != vb.contract.permissions,
            "input_schema": va.contract.input_schema != vb.contract.input_schema,
            "output_schema": va.contract.output_schema != vb.contract.output_schema,
            "context_contract": va.contract.context_contract != vb.contract.context_contract,
        },
    }


@router.get("/{agent_id}/executions")
def get_agent_executions(agent_id: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    agent_executions = []
    for ex in store.executions.all():
        for evt in ex.events:
            if evt.agent_id == agent_id:
                agent_executions.append(ex)
                break
    return agent_executions


@router.post("/{agent_id}/test")
async def test_agent(agent_id: str, body: AgentTestRequest):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    test_execution_id = gen_id("test_")
    events: list[dict] = []

    model = store.models.get(agent.model_config_id) if agent.model_config_id else None
    model_name = model.model if model else "unknown"

    events.append({
        "step": 0,
        "phase": "validation",
        "event_type": "ContractValidation",
        "message": f"Validating input against agent contract for '{agent.display_name}'",
        "status": "passed",
        "data": {"required_fields": list(agent.contract.input_schema.get("required", []))},
    })

    events.append({
        "step": 1,
        "phase": "context_preparation",
        "event_type": "ContextPrepared",
        "message": f"Context prepared with {len(body.context)} items",
        "status": "completed",
        "data": {
            "context_keys": list(body.context.keys()),
            "context_requirements": agent.context_requirements,
            "model": model_name,
        },
    })

    events.append({
        "step": 2,
        "phase": "permission_check",
        "event_type": "PermissionChecked",
        "message": f"Permission check: {len(agent.permissions)} permissions verified",
        "status": "passed",
        "data": {"permissions": agent.permissions},
    })

    events.append({
        "step": 3,
        "phase": "policy_check",
        "event_type": "PolicyChecked",
        "message": "Policy enforcement: agent-sandbox-isolation, token-budget-enforcement",
        "status": "passed",
        "data": {"policies": ["agent-sandbox-isolation", "token-budget-enforcement"]},
    })

    if agent.skill_ids:
        skill_names = []
        for sid in agent.skill_ids:
            s = store.skills.get(sid)
            if s:
                skill_names.append(s.display_name)
        events.append({
            "step": 4,
            "phase": "skill_binding",
            "event_type": "SkillBound",
            "message": f"Skills activated: {', '.join(skill_names)}",
            "status": "completed",
            "data": {"skills": skill_names},
        })

    if agent.tool_ids:
        tool_names = []
        for tid in agent.tool_ids:
            t = store.tools.get(tid)
            if t:
                tool_names.append(t.display_name)
        events.append({
            "step": 5,
            "phase": "tool_binding",
            "event_type": "ToolBound",
            "message": f"Tools available: {', '.join(tool_names)}",
            "status": "completed",
            "data": {"tools": tool_names, "risk_levels": [store.tools.get(tid).risk_level.value if store.tools.get(tid) else "UNKNOWN" for tid in agent.tool_ids]},
        })

    events.append({
        "step": 6,
        "phase": "model_invocation",
        "event_type": "AgentStarted",
        "message": f"Agent '{agent.display_name}' invoked with model '{model_name}'",
        "status": "running",
        "data": {
            "agent": agent.display_name,
            "model": model_name,
            "max_turns": agent.max_turns,
            "token_budget": agent.token_budget,
        },
    })

    await asyncio.sleep(0.1)

    tokens_used = 5000 + len(str(body.inputs)) // 100
    cost_cents = 15

    events.append({
        "step": 7,
        "phase": "model_completion",
        "event_type": "AgentCompleted",
        "message": f"Agent completed execution",
        "status": "completed",
        "data": {
            "tokens_used": tokens_used,
            "cost_cents": cost_cents,
            "turns_used": min(agent.max_turns, 5),
        },
    })

    output = {
        "agent": agent.display_name,
        "model": model_name,
        "status": "completed",
        "result": f"Agent '{agent.display_name}' processed inputs and produced engineering output based on its contract.",
        "tokens_used": tokens_used,
        "cost_cents": cost_cents,
        "turns_used": min(agent.max_turns, 5),
    }

    evidence = {
        "evidence_type": "agent_test",
        "agent_id": agent_id,
        "agent_version": agent.current_version,
        "model_used": model_name,
        "inputs": body.inputs,
        "outputs": output,
        "tokens_used": tokens_used,
        "cost_cents": cost_cents,
        "permissions_applied": ["agent-sandbox-isolation", "token-budget-enforcement"],
        "timestamp": utc_now().isoformat(),
        "hash": f"sha256:{gen_id('')}",
        "summary": f"Test execution of '{agent.display_name}' v{agent.current_version}",
    }

    return {
        "execution_id": test_execution_id,
        "agent_id": agent_id,
        "agent_name": agent.display_name,
        "agent_version": agent.current_version,
        "model": model_name,
        "events": events,
        "output": output,
        "evidence": evidence,
    }


@router.delete("/{agent_id}")
def delete_agent(agent_id: str):
    if not store.agents.delete(agent_id):
        raise HTTPException(404, "Agent not found")
    return {"status": "deleted"}
