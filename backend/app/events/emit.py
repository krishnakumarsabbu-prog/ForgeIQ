from __future__ import annotations

from typing import Optional

from ..domain.models.execution import ExecutionEvent, EventType
from ..domain.models.base import gen_id
from ..storage.in_memory import store
from .event_bus import event_bus


def emit_event(
    execution_id: str,
    event_type: EventType,
    message: str,
    node_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    tool_id: Optional[str] = None,
    harness_id: Optional[str] = None,
    pipeline_id: Optional[str] = None,
    data: Optional[dict] = None,
) -> ExecutionEvent:
    """Emit an execution event to both the store and the event bus.

    This is the single emission point that all runtime engines should use
    instead of directly appending to store.events.
    """
    evt = ExecutionEvent(
        id=gen_id("evt_"),
        execution_id=execution_id,
        event_type=event_type,
        node_id=node_id,
        agent_id=agent_id,
        tool_id=tool_id,
        harness_id=harness_id,
        pipeline_id=pipeline_id,
        message=message,
        data=data or {},
    )
    store.events.append(evt)
    event_bus.publish(evt)
    return evt
