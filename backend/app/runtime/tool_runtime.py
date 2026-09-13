from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.tool import Tool
from ..domain.models.base import gen_id
from ..domain.models.execution import ExecutionEvent, EventType


class ToolRuntime:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def get_tool(self, tool_id: str) -> Optional[Tool]:
        tool = store.tools.get(tool_id)
        if tool and tool.tenant_id == self.tenant_id:
            return tool
        return None

    def check_permissions(self, tool: Tool, operation: str, environment: str) -> tuple[bool, str]:
        if operation not in tool.allowed_operations:
            return False, f"Operation '{operation}' not allowed for tool '{tool.display_name}'"
        if environment not in tool.supported_environments:
            return False, f"Environment '{environment}' not supported for tool '{tool.display_name}'"
        return True, ""

    def check_policies(self, tool: Tool, environment: str) -> tuple[bool, str]:
        for policy in store.policies.all(self.tenant_id):
            if not policy.active:
                continue
            if policy.scope.value == "environment" and policy.target_id == environment:
                if policy.policy_type.value == "prohibit":
                    return False, f"Policy '{policy.display_name}' prohibits tool execution in {environment}"
        return True, ""

    async def execute(self, tool_id: str, operation: str, params: dict, execution_id: str, environment: str = "development", agent_id: Optional[str] = None, node_id: Optional[str] = None) -> dict:
        tool = self.get_tool(tool_id)
        if tool is None:
            return {"status": "failed", "error": "Tool not found"}

        req_event = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.TOOL_REQUESTED,
            tool_id=tool_id,
            agent_id=agent_id,
            node_id=node_id,
            message=f"Tool '{tool.display_name}' requested for operation '{operation}'",
        )
        store.events.append(req_event)

        perm_ok, perm_msg = self.check_permissions(tool, operation, environment)
        perm_event = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.PERMISSION_CHECKED,
            tool_id=tool_id,
            node_id=node_id,
            message=f"Permission check: {'PASSED' if perm_ok else 'FAILED - ' + perm_msg}",
        )
        store.events.append(perm_event)
        if not perm_ok:
            return {"status": "failed", "error": perm_msg}

        pol_ok, pol_msg = self.check_policies(tool, environment)
        pol_event = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.POLICY_CHECKED,
            tool_id=tool_id,
            node_id=node_id,
            message=f"Policy check: {'PASSED' if pol_ok else 'FAILED - ' + pol_msg}",
        )
        store.events.append(pol_event)
        if not pol_ok:
            return {"status": "failed", "error": pol_msg}

        exec_event = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.TOOL_EXECUTED,
            tool_id=tool_id,
            node_id=node_id,
            message=f"Tool '{tool.display_name}' executing '{operation}' in {environment}",
        )
        store.events.append(exec_event)

        await asyncio.sleep(0.05)

        result = {
            "tool": tool.display_name,
            "operation": operation,
            "status": "success",
            "exit_code": 0,
            "output": f"Executed {operation} on {tool.display_name} in {environment}",
            "evidence": {"command": f"{tool.name} {operation}", "exit_code": 0},
        }

        result_event = ExecutionEvent(
            id=gen_id("evt_"),
            execution_id=execution_id,
            event_type=EventType.TOOL_RESULT,
            tool_id=tool_id,
            node_id=node_id,
            message=f"Tool '{tool.display_name}' result: success",
            data=result,
        )
        store.events.append(result_event)

        return result
