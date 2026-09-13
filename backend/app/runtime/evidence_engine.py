from __future__ import annotations

import hashlib
import json
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.evidence import Evidence, EvidenceType, EvidenceStatus
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType
from ..events.emit import emit_event


class EvidenceEngine:
    """Append-only evidence engine. Records are immutable once created."""

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def create_evidence(
        self,
        execution_id: str,
        evidence_type: EvidenceType,
        application_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
        pipeline_id: Optional[str] = None,
        pipeline_version: Optional[str] = None,
        harness_id: Optional[str] = None,
        harness_version: Optional[str] = None,
        graph_id: Optional[str] = None,
        graph_version: Optional[str] = None,
        loop_id: Optional[str] = None,
        loop_iteration: Optional[int] = None,
        node_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        agent_version: Optional[str] = None,
        model_used: Optional[str] = None,
        model_provider: Optional[str] = None,
        context_reference: Optional[str] = None,
        tool_id: Optional[str] = None,
        tool_operation: Optional[str] = None,
        inputs: Optional[dict] = None,
        outputs: Optional[dict] = None,
        code_changes: Optional[list] = None,
        test_results: Optional[dict] = None,
        security_results: Optional[dict] = None,
        build_results: Optional[dict] = None,
        release_results: Optional[dict] = None,
        approvals: Optional[list] = None,
        policies_applied: Optional[list] = None,
        policy_decisions: Optional[list] = None,
        deployment: Optional[dict] = None,
        verification: Optional[dict] = None,
        status: EvidenceStatus = EvidenceStatus.SUCCESS,
        environment: str = "",
        summary: str = "",
    ) -> Evidence:
        inputs = inputs or {}
        outputs = outputs or {}

        input_hash = hashlib.sha256(
            json.dumps(inputs, sort_keys=True, default=str).encode()
        ).hexdigest()

        output_reference = hashlib.sha256(
            json.dumps(outputs, sort_keys=True, default=str).encode()
        ).hexdigest()

        # Link to previous evidence in this execution for chain integrity
        prev_id = None
        execution = store.executions.get(execution_id)
        if execution and execution.evidence_ids:
            prev_id = execution.evidence_ids[-1]

        # Build full hash over all meaningful fields
        hash_payload = json.dumps({
            "tenant_id": self.tenant_id,
            "execution_id": execution_id,
            "evidence_type": evidence_type.value,
            "agent_id": agent_id,
            "agent_version": agent_version,
            "model_used": model_used,
            "harness_id": harness_id,
            "tool_id": tool_id,
            "tool_operation": tool_operation,
            "input_hash": input_hash,
            "output_reference": output_reference,
            "timestamp": utc_now().isoformat(),
            "previous_evidence_id": prev_id,
        }, sort_keys=True)
        ev_hash = hashlib.sha256(hash_payload.encode()).hexdigest()

        evidence = Evidence(
            tenant_id=self.tenant_id,
            id=gen_id("ev_"),
            application_id=application_id,
            requirement_id=requirement_id,
            execution_id=execution_id,
            pipeline_id=pipeline_id,
            pipeline_version=pipeline_version,
            harness_id=harness_id,
            harness_version=harness_version,
            graph_id=graph_id,
            graph_version=graph_version,
            loop_id=loop_id,
            loop_iteration=loop_iteration,
            node_id=node_id,
            agent_id=agent_id,
            agent_version=agent_version,
            model_used=model_used,
            model_provider=model_provider,
            context_reference=context_reference,
            tool_id=tool_id,
            tool_operation=tool_operation,
            evidence_type=evidence_type,
            status=status,
            environment=environment,
            summary=summary or f"{evidence_type.value} evidence for execution {execution_id[:8]}",
            inputs=inputs,
            outputs=outputs,
            input_hash=f"sha256:{input_hash}",
            output_reference=f"sha256:{output_reference}",
            code_changes=code_changes or [],
            test_results=test_results or {},
            security_results=security_results or {},
            build_results=build_results or {},
            release_results=release_results or {},
            approvals=approvals or [],
            policies_applied=policies_applied or [],
            policy_decisions=policy_decisions or [],
            deployment=deployment or {},
            verification=verification or {},
            hash=f"sha256:{ev_hash}",
            previous_evidence_id=prev_id,
        )
        store.evidence.add(evidence)

        if execution:
            execution.evidence_ids.append(evidence.id)

        emit_event(
            execution_id=execution_id,
            event_type=EventType.EVIDENCE_CREATED,
            node_id=node_id,
            agent_id=agent_id,
            message=f"Evidence created: {evidence_type.value}",
            data={"evidence_id": evidence.id, "hash": evidence.hash[:20]},
        )

        return evidence

    def verify_chain(self, execution_id: str) -> dict:
        """Verify the integrity of an evidence chain for an execution."""
        evidence_list = [
            e for e in store.evidence.all(self.tenant_id) if e.execution_id == execution_id
        ]
        evidence_list.sort(key=lambda e: e.timestamp)

        verified = 0
        broken = 0
        for i, ev in enumerate(evidence_list):
            if i == 0:
                if ev.previous_evidence_id is None:
                    verified += 1
                else:
                    broken += 1
            else:
                if ev.previous_evidence_id == evidence_list[i - 1].id:
                    verified += 1
                else:
                    broken += 1

        return {
            "execution_id": execution_id,
            "total": len(evidence_list),
            "verified": verified,
            "broken": broken,
            "chain_intact": broken == 0,
        }

    def get_timeline(self, execution_id: str) -> list[Evidence]:
        """Return evidence records ordered as a timeline for an execution."""
        evidence_list = [
            e for e in store.evidence.all(self.tenant_id) if e.execution_id == execution_id
        ]
        evidence_list.sort(key=lambda e: e.timestamp)
        return evidence_list

    def filter(
        self,
        application_id: Optional[str] = None,
        execution_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        harness_id: Optional[str] = None,
        pipeline_id: Optional[str] = None,
        tool_id: Optional[str] = None,
        model_used: Optional[str] = None,
        environment: Optional[str] = None,
        evidence_type: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> list[Evidence]:
        results = store.evidence.all(self.tenant_id)

        if application_id:
            results = [e for e in results if e.application_id == application_id]
        if execution_id:
            results = [e for e in results if e.execution_id == execution_id]
        if agent_id:
            results = [e for e in results if e.agent_id == agent_id]
        if harness_id:
            results = [e for e in results if e.harness_id == harness_id]
        if pipeline_id:
            results = [e for e in results if e.pipeline_id == pipeline_id]
        if tool_id:
            results = [e for e in results if e.tool_id == tool_id]
        if model_used:
            results = [e for e in results if e.model_used and model_used.lower() in e.model_used.lower()]
        if environment:
            results = [e for e in results if e.environment and environment.lower() in e.environment.lower()]
        if evidence_type:
            results = [e for e in results if e.evidence_type.value == evidence_type]
        if status:
            results = [e for e in results if e.status.value == status]
        if date_from:
            results = [e for e in results if e.timestamp >= date_from]
        if date_to:
            results = [e for e in results if e.timestamp <= date_to]

        results.sort(key=lambda e: e.timestamp, reverse=True)
        return results

    def stats(self) -> dict:
        all_evidence = store.evidence.all(self.tenant_id)
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        by_agent: dict[str, int] = {}
        by_application: dict[str, int] = {}
        by_environment: dict[str, int] = {}

        for ev in all_evidence:
            etype = ev.evidence_type.value
            by_type[etype] = by_type.get(etype, 0) + 1

            s = ev.status.value if hasattr(ev.status, 'value') else str(ev.status)
            by_status[s] = by_status.get(s, 0) + 1

            if ev.agent_id:
                by_agent[ev.agent_id] = by_agent.get(ev.agent_id, 0) + 1
            if ev.application_id:
                by_application[ev.application_id] = by_application.get(ev.application_id, 0) + 1
            if ev.environment:
                by_environment[ev.environment] = by_environment.get(ev.environment, 0) + 1

        return {
            "total": len(all_evidence),
            "by_type": by_type,
            "by_status": by_status,
            "by_agent": by_agent,
            "by_application": by_application,
            "by_environment": by_environment,
        }
