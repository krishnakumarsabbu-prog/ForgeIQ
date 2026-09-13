from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, Callable, Optional

from ..domain.models.execution import ExecutionEvent


class EventBus:
    """In-process async event bus for execution events.

    Supports:
    - publish: non-blocking event emission that notifies all subscribers immediately
    - subscribe: returns an async generator that yields events as they arrive
    - subscribe_to_execution: filter events for a single execution_id
    - replay: yield historical events already stored in the bus
    """

    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue[ExecutionEvent]] = []
        self._history: list[ExecutionEvent] = []
        self._lock = asyncio.Lock()

    def publish(self, event: ExecutionEvent) -> None:
        self._history.append(event)
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass

    def get_history(self, execution_id: Optional[str] = None) -> list[ExecutionEvent]:
        if execution_id is None:
            return list(self._history)
        return [e for e in self._history if e.execution_id == execution_id]

    async def subscribe(self) -> asyncio.Queue[ExecutionEvent]:
        async with self._lock:
            q: asyncio.Queue[ExecutionEvent] = asyncio.Queue(maxsize=10000)
            self._subscribers.append(q)
            return q

    def unsubscribe(self, q: asyncio.Queue[ExecutionEvent]) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def stream(
        self,
        execution_id: Optional[str] = None,
        include_history: bool = True,
    ) -> Any:
        """Async generator yielding events. If execution_id is set, filters to that execution.
        If include_history, yields past events first before live ones."""
        import json

        if include_history:
            for evt in self.get_history(execution_id):
                yield f"data: {json.dumps(evt.model_dump(), default=str)}\n\n"

        q = await self.subscribe()
        try:
            while True:
                try:
                    evt = await asyncio.wait_for(q.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
                    continue

                if execution_id and evt.execution_id != execution_id:
                    continue

                yield f"data: {json.dumps(evt.model_dump(), default=str)}\n\n"

                from ..domain.models.execution import EventType
                if evt.event_type in (EventType.EXECUTION_COMPLETED, EventType.EXECUTION_FAILED):
                    yield f"data: {json.dumps({'type': 'DONE', 'execution_id': evt.execution_id, 'event_type': evt.event_type.value}, default=str)}\n\n"
                    break
        finally:
            self.unsubscribe(q)

    def clear(self) -> None:
        self._history.clear()


event_bus = EventBus()
