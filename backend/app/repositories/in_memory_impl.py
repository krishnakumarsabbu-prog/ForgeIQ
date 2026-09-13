from __future__ import annotations

from typing import Any, Generic, Optional, TypeVar

T = TypeVar("T")


class InMemoryRepository(Generic[T]):
    """In-memory repository implementation matching the Repository interface.

    This wraps the existing InMemoryTable to conform to the repository protocol,
    allowing future replacement with database-backed implementations.
    """

    def __init__(self, table: Any) -> None:
        self._table = table

    def get(self, item_id: str) -> Optional[T]:
        return self._table.get(item_id)

    def all(self, tenant_id: Optional[str] = None) -> list[T]:
        return self._table.all(tenant_id)

    def add(self, item: T) -> T:
        return self._table.add(item)

    def update(self, item_id: str, patch: dict[str, Any]) -> Optional[T]:
        return self._table.update(item_id, patch)

    def delete(self, item_id: str) -> bool:
        return self._table.delete(item_id)

    def filter(self, predicate: Any) -> list[T]:
        return self._table.filter(predicate)


class InMemoryEventStore:
    """In-memory event store for execution events."""

    def __init__(self, events_list: list) -> None:
        self._events = events_list

    def append(self, event: Any) -> None:
        self._events.append(event)

    def get_by_execution(self, execution_id: str) -> list:
        return [e for e in self._events if e.execution_id == execution_id]

    def get_all(self) -> list:
        return list(self._events)
