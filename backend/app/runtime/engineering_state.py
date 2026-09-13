from __future__ import annotations

from typing import Optional

from ..storage.in_memory import store
from ..domain.models.engineering_state import EngineeringState, EngineeringDecision
from ..domain.models.base import gen_id, utc_now


class EngineeringStateEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def get_state(self, application_id: str) -> Optional[EngineeringState]:
        for es in store.engineering_states.all(self.tenant_id):
            if es.application_id == application_id:
                return es
        return None

    def update_state(self, application_id: str, updates: dict) -> Optional[EngineeringState]:
        es = self.get_state(application_id)
        if es is None:
            return None
        for k, v in updates.items():
            if hasattr(es, k):
                setattr(es, k, v)
        es.last_updated = utc_now().isoformat()
        es.touch()
        return es

    def add_decision(self, application_id: str, decision: str, rationale: str, decided_by: str, impact: str = "MEDIUM", tags: Optional[list] = None) -> EngineeringDecision:
        dec = EngineeringDecision(
            tenant_id=self.tenant_id,
            id=gen_id("dec_"),
            application_id=application_id,
            decision=decision,
            rationale=rationale,
            decided_by=decided_by,
            impact=impact,
            tags=tags or [],
        )
        store.decisions.add(dec)
        es = self.get_state(application_id)
        if es:
            es.decisions.append(dec)
        return dec

    def update_from_evidence(self, application_id: str, evidence_id: str) -> None:
        es = self.get_state(application_id)
        if es:
            es.evidence_ids.append(evidence_id)
            es.last_updated = utc_now().isoformat()
            es.touch()
