from __future__ import annotations

from typing import Any, Generic, Optional, Protocol, TypeVar

T = TypeVar("T")


class Repository(Protocol, Generic[T]):
    """Repository interface for all domain entities.

    Implementations may be in-memory (current) or database-backed (future).
    All methods are tenant-scoped via tenant_id.
    """

    def get(self, item_id: str) -> Optional[T]: ...

    def all(self, tenant_id: Optional[str] = None) -> list[T]: ...

    def add(self, item: T) -> T: ...

    def update(self, item_id: str, patch: dict[str, Any]) -> Optional[T]: ...

    def delete(self, item_id: str) -> bool: ...

    def filter(self, predicate: Any) -> list[T]: ...
