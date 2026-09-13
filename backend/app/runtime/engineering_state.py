from __future__ import annotations

from typing import Optional

from ..storage.in_memory import store
from ..domain.models.engineering_state import EngineeringState, EngineeringDecision, StateChangeRecord
from ..domain.models.base import gen_id, utc_now


class EngineeringStateEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def get_state(self, application_id: str) -> Optional[EngineeringState]:
        for es in store.engineering_states.all(self.tenant_id):
            if es.application_id == application_id:
                return es
        return None

    def get_state_by_id(self, state_id: str) -> Optional[EngineeringState]:
        return store.engineering_states.get(state_id)

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
            self.record_change(
                application_id=application_id,
                state_id=es.id,
                change_type="decision_recorded",
                description=f"Decision recorded: {decision}",
                category="governance",
                severity="info",
                metadata={"decision_id": dec.id, "impact": impact},
            )
        return dec

    def update_from_evidence(self, application_id: str, evidence_id: str) -> None:
        es = self.get_state(application_id)
        if es:
            es.evidence_ids.append(evidence_id)
            es.last_updated = utc_now().isoformat()
            es.touch()
            self.record_change(
                application_id=application_id,
                state_id=es.id,
                change_type="evidence_added",
                description=f"Evidence linked: {evidence_id[:12]}",
                category="evidence",
                severity="info",
                metadata={"evidence_id": evidence_id},
            )

    def record_change(
        self,
        application_id: str,
        state_id: str,
        change_type: str,
        description: str,
        before_value: Optional[str] = None,
        after_value: Optional[str] = None,
        category: str = "general",
        severity: str = "info",
        metadata: Optional[dict] = None,
    ) -> StateChangeRecord:
        record = StateChangeRecord(
            tenant_id=self.tenant_id,
            id=gen_id("sch_"),
            application_id=application_id,
            state_id=state_id,
            change_type=change_type,
            description=description,
            before_value=before_value,
            after_value=after_value,
            category=category,
            severity=severity,
            metadata=metadata or {},
        )
        store.state_changes.add(record)
        es = store.engineering_states.get(state_id)
        if es:
            es.change_history_ids.append(record.id)
            es.last_updated = utc_now().isoformat()
            es.touch()
        return record

    def get_history(self, application_id: str, limit: int = 100) -> list[StateChangeRecord]:
        changes = [
            c for c in store.state_changes.all(self.tenant_id)
            if c.application_id == application_id
        ]
        changes.sort(key=lambda c: c.created_at, reverse=True)
        return changes[:limit]

    def get_history_by_state(self, state_id: str, limit: int = 100) -> list[StateChangeRecord]:
        changes = [
            c for c in store.state_changes.all(self.tenant_id)
            if c.state_id == state_id
        ]
        changes.sort(key=lambda c: c.created_at, reverse=True)
        return changes[:limit]

    def retrieve_context(self, application_id: str, query: str = "") -> dict:
        """Retrieve relevant Engineering State context for an agent.

        Given a natural-language query like 'payment service context', this returns
        matching components, APIs, dependencies, tests, architecture, recent changes,
        known issues, and relevant evidence.
        """
        es = self.get_state(application_id)
        if es is None:
            return {"found": False, "application_id": application_id, "query": query}

        q = query.lower().strip()
        keywords = [w for w in q.split() if len(w) > 2] if q else []

        def matches(text: str) -> bool:
            if not keywords:
                return True
            tl = text.lower()
            return any(kw in tl for kw in keywords)

        relevant_apis = [api for api in es.apis if matches(str(api.get("path", "")) + " " + str(api.get("description", "")))]
        relevant_deps = [dep for dep in es.dependencies if matches(str(dep.get("name", "")) + " " + str(dep.get("type", "")))]
        relevant_issues = [iss for iss in es.known_issues if matches(str(iss.get("description", "")) + " " + str(iss.get("severity", "")))]
        relevant_changes = [ch for ch in es.open_changes if matches(str(ch.get("branch", "")) + " " + str(ch.get("status", "")))]
        relevant_decisions = [d for d in es.decisions if matches(d.decision + " " + d.rationale + " " + " ".join(d.tags))]

        relevant_evidence = []
        for eid in es.evidence_ids[-20:]:
            ev = store.evidence.get(eid)
            if ev and (not keywords or matches(ev.summary + " " + ev.evidence_type)):
                relevant_evidence.append({
                    "id": ev.id,
                    "type": ev.evidence_type,
                    "summary": ev.summary,
                    "timestamp": ev.timestamp,
                })

        history = self.get_history(application_id, limit=10)

        return {
            "found": True,
            "application_id": application_id,
            "query": query,
            "version": es.version,
            "health_score": es.health_score,
            "coverage_pct": es.coverage_pct,
            "architecture": es.architecture,
            "technologies": es.technologies,
            "relevant_apis": relevant_apis,
            "relevant_dependencies": relevant_deps,
            "relevant_known_issues": relevant_issues,
            "relevant_open_changes": relevant_changes,
            "relevant_decisions": relevant_decisions,
            "relevant_evidence": relevant_evidence,
            "recent_changes": [
                {
                    "change_type": c.change_type,
                    "description": c.description,
                    "severity": c.severity,
                    "timestamp": c.created_at.isoformat() if hasattr(c.created_at, 'isoformat') else str(c.created_at),
                }
                for c in history
            ],
            "security_summary": {
                "findings": es.security_findings,
                "open_vulnerabilities": es.open_vulnerabilities,
                "last_scan": es.security.get("last_scan", ""),
            },
            "build_summary": {
                "status": es.build.get("status", ""),
                "last_build": es.build.get("last_build", ""),
            },
            "deployment_summary": {
                "environment": es.deployment.get("environment", ""),
                "last_deploy": es.deployment.get("last_deploy", ""),
            },
        }
