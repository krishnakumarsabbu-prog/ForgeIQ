from __future__ import annotations

import hashlib
import json
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.evidence import Evidence, EvidenceType
from ..domain.models.base import gen_id, utc_now
from ..domain.models.execution import ExecutionEvent, EventType
from ..events.emit import emit_event


class EvidenceEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def create_evidence(
        self,
        execution_id: str,
        evidence_type: EvidenceType,
        agent_id: Optional[str] = None,
        agent_version: Optional[str] = None,
        model_used: Optional[str] = None,
        harness_id: Optional[str] = None,
        harness_version: Optional[str] = None,
        tool_id: Optional[str] = None,
        inputs: Optional[dict] = None,
        outputs: Optional[dict] = None,
        code_changes: Optional[list] = None,
        test_results: Optional[dict] = None,
        security_results: Optional[dict] = None,
        policies_applied: Optional[list] = None,
        summary: str = "",
        node_id: Optional[str] = None,
    ) -> Evidence:
        data_str = json.dumps({
            "execution_id": execution_id,
            "type": evidence_type.value,
            "agent_id": agent_id,
            "outputs": outputs or {},
            "timestamp": utc_now().isoformat(),
        }, sort_keys=True)
        ev_hash = hashlib.sha256(data_str.encode()).hexdigest()

        evidence = Evidence(
            tenant_id=self.tenant_id,
            id=gen_id("ev_"),
            execution_id=execution_id,
            evidence_type=evidence_type,
            agent_id=agent_id,
            agent_version=agent_version,
            model_used=model_used,
            harness_id=harness_id,
            harness_version=harness_version,
            tool_id=tool_id,
            inputs=inputs or {},
            outputs=outputs or {},
            code_changes=code_changes or [],
            test_results=test_results or {},
            security_results=security_results or {},
            policies_applied=policies_applied or [],
            hash=f"sha256:{ev_hash}",
            summary=summary or f"{evidence_type.value} evidence",
        )
        store.evidence.add(evidence)

        execution = store.executions.get(execution_id)
        if execution:
            execution.evidence_ids.append(evidence.id)

        evt = emit_event(
            execution_id=execution_id,
            event_type=EventType.EVIDENCE_CREATED,
            node_id=node_id,
            agent_id=agent_id,
            message=f"Evidence created: {evidence_type.value}",
            data={"evidence_id": evidence.id, "hash": evidence.hash[:20]},
        )

        return evidence
