from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.agent import Agent, AgentContract
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType
from ..events.emit import emit_event


class AgentRuntime:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        agent = store.agents.get(agent_id)
        if agent and agent.tenant_id == self.tenant_id:
            return agent
        return None

    def validate_contract(self, agent: Agent, inputs: dict) -> tuple[bool, str]:
        contract = agent.contract
        for key in contract.input_schema.get("required", []):
            if key not in inputs:
                return False, f"Missing required input: {key}"
        if agent.published is False:
            return False, "Agent is not published"
        return True, ""

    async def execute(self, agent_id: str, inputs: dict, execution_id: str, node_id: Optional[str] = None) -> dict:
        agent = self.get_agent(agent_id)
        if agent is None:
            return {"status": "failed", "error": "Agent not found"}

        valid, msg = self.validate_contract(agent, inputs)
        if not valid:
            return {"status": "failed", "error": msg}

        event = emit_event(
            execution_id=execution_id,
            event_type=EventType.AGENT_STARTED,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Agent '{agent.display_name}' started",
            data={"inputs": list(inputs.keys())},
        )

        await asyncio.sleep(0.05)

        model = store.models.get(agent.model_config_id) if agent.model_config_id else None
        model_name = model.model if model else "unknown"

        context_event = emit_event(
            execution_id=execution_id,
            event_type=EventType.CONTEXT_PREPARED,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Context prepared for '{agent.display_name}'",
            data={"model": model_name, "skills": len(agent.skill_ids), "tools": len(agent.tool_ids)},
        )

        await asyncio.sleep(0.05)

        output = {
            "agent": agent.display_name,
            "model": model_name,
            "status": "completed",
            "result": f"Agent '{agent.display_name}' processed inputs and produced engineering output",
            "tokens_used": 5000 + len(str(inputs)) // 100,
            "cost_cents": 15,
        }

        return output
