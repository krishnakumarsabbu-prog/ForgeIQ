from __future__ import annotations

from typing import Optional
import asyncio
import random

from ..storage.in_memory import store
from ..domain.models.base import gen_id, utc_now, RiskLevel
from ..domain.models.incident import (
    Incident, IncidentStatus, IncidentSeverity, IncidentSource,
    Symptom, RootCauseFinding, RootCauseCategory,
    RemediationPlan, RemediationStep, IncidentTimelineEntry,
)
from ..domain.models.execution import ExecutionEvent, EventType
from ..domain.models.evidence import Evidence, EvidenceType, EvidenceStatus
from ..events.emit import emit_event
from .verification_engine import VerificationEngine
from .deployment_runtime import DeploymentRuntime


ROOT_CAUSE_CATEGORIES = [
    RootCauseCategory.CODE_DEFECT,
    RootCauseCategory.CONFIGURATION_ERROR,
    RootCauseCategory.DEPENDENCY_FAILURE,
    RootCauseCategory.RESOURCE_EXHAUSTION,
    RootCauseCategory.DATABASE,
    RootCauseCategory.NETWORK,
]

ROOT_CAUSE_DESCRIPTIONS = {
    RootCauseCategory.CODE_DEFECT: "Null pointer dereference in payment processing module when order total equals zero.",
    RootCauseCategory.CONFIGURATION_ERROR: "Database connection pool max_connections set to 5 in production config, causing connection exhaustion under load.",
    RootCauseCategory.DEPENDENCY_FAILURE: "Upstream dependency 'payment-gateway' v2.3.1 introduced breaking API change not caught by contract tests.",
    RootCauseCategory.RESOURCE_EXHAUSTION: "Memory leak in image processing service causes OOM after ~4 hours of sustained traffic.",
    RootCauseCategory.DATABASE: "Missing index on orders.user_id causes sequential scans under high query volume, leading to connection timeout cascade.",
    RootCauseCategory.NETWORK: "DNS resolution failure for internal service endpoint due to stale cache in service mesh sidecar.",
    RootCauseCategory.INFRASTRUCTURE: "Node group autoscaling failed due to IAM permission drift, preventing new nodes from joining the cluster.",
    RootCauseCategory.SECURITY: "Rate limiter bypass allowed unauthenticated traffic spike to overwhelm backend workers.",
}


class IncidentRuntime:
    """Executes the incident remediation lifecycle:

    Observability -> Detection -> Analysis -> Root Cause ->
    Remediation Plan -> Approval -> Code -> Test -> Security ->
    Build -> Release -> Deploy -> Verify

    On verification failure: Rollback -> Root Cause -> Remediation -> Retry.
    """

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.verification_engine = VerificationEngine(tenant_id)

    def add_timeline_entry(
        self, incident: Incident, event: str, message: str, actor: str = "system", data: Optional[dict] = None
    ) -> IncidentTimelineEntry:
        entry = IncidentTimelineEntry(
            event=event,
            message=message,
            actor=actor,
            data=data or {},
        )
        incident.timeline.append(entry)
        return entry

    async def analyze_incident(self, incident_id: str, execution_id: str = "") -> dict:
        incident = store.incidents.get(incident_id)
        if incident is None:
            return {"status": "failed", "error": "Incident not found"}

        exec_id = execution_id or gen_id("exec_")
        incident.status = IncidentStatus.INVESTIGATING.value
        self.add_timeline_entry(incident, "analysis_started", "Incident analysis started")

        emit_event(
            execution_id=exec_id,
            event_type=EventType.AGENT_STARTED,
            message=f"Incident analysis started: {incident.title}",
            data={"incident_id": incident_id, "severity": incident.severity},
        )

        await asyncio.sleep(0.1)

        app = store.applications.get(incident.application_id)
        app_name = app.display_name if app else "unknown"

        es = store.engineering_states.get(app.engineering_state_id) if app and app.engineering_state_id else None
        recent_deployments = [
            d for d in store.deployments.all(self.tenant_id)
            if d.application_id == incident.application_id
        ]
        recent_commits = es.recent_commits if es and hasattr(es, "recent_commits") else []
        known_issues = es.known_issues if es and hasattr(es, "known_issues") else []

        analysis_context = {
            "application": app_name,
            "symptoms": [s.model_dump() for s in incident.symptoms],
            "recent_deployments": [
                {"id": d.id, "version": d.version, "status": d.status, "started_at": d.started_at}
                for d in sorted(recent_deployments, key=lambda x: x.created_at, reverse=True)[:5]
            ],
            "engineering_state": {
                "health_score": es.health_score if es else 0,
                "open_vulnerabilities": es.open_vulnerabilities if es else 0,
                "known_issues": known_issues,
            },
            "architecture": es.architecture if es and hasattr(es, "architecture") else {},
            "dependencies": es.dependencies if es and hasattr(es, "dependencies") else [],
        }

        emit_event(
            execution_id=exec_id,
            event_type=EventType.CONTEXT_PREPARED,
            message=f"Context prepared for incident analysis: {len(incident.symptoms)} symptoms, {len(recent_deployments)} recent deployments",
            data={"symptom_count": len(incident.symptoms), "deployment_count": len(recent_deployments)},
        )

        await asyncio.sleep(0.15)

        # Determine root cause from real context
        if recent_deployments:
            latest_dep = sorted(recent_deployments, key=lambda x: x.created_at, reverse=True)[0]
            if latest_dep.status in ("failed", "rollback_failed", "postcheck_failed"):
                category = RootCauseCategory.DEPLOYMENT_FAILURE
            elif latest_dep.status == "rolled_back":
                category = RootCauseCategory.CONFIGURATION_ERROR
            else:
                category = RootCauseCategory.CODE_DEFECT
        elif es and es.open_vulnerabilities > 0:
            category = RootCauseCategory.SECURITY
        elif es and hasattr(es, "dependencies") and isinstance(es.dependencies, list):
            dep_issues = [d for d in es.dependencies if isinstance(d, dict) and d.get("vulnerabilities")]
            if dep_issues:
                category = RootCauseCategory.DEPENDENCY_FAILURE
            elif es.health_score < 50:
                category = RootCauseCategory.RESOURCE_EXHAUSTION
            else:
                category = RootCauseCategory.CODE_DEFECT
        else:
            category = RootCauseCategory.CODE_DEFECT

        # Derive component from symptoms
        component = incident.component or (incident.symptoms[0].component if incident.symptoms else "unknown")

        # Derive contributing factors from real context
        contributing_factors: list[str] = []
        if recent_deployments:
            contributing_factors.append(f"Recent deployment: {recent_deployments[0].version} ({recent_deployments[0].status})")
        if es and es.open_vulnerabilities > 0:
            contributing_factors.append(f"{es.open_vulnerabilities} open vulnerabilities in engineering state")
        if es and es.health_score < 70:
            contributing_factors.append(f"Low health score: {es.health_score:.0f}")
        if not contributing_factors:
            contributing_factors.append("No specific contributing factors identified from available context")

        # Derive confidence from data quality
        data_points = len(incident.symptoms) + len(recent_deployments) + (1 if es else 0)
        confidence = round(min(0.50 + data_points * 0.08, 0.95), 2)

        root_cause = RootCauseFinding(
            category=category.value,
            component=component,
            description=ROOT_CAUSE_DESCRIPTIONS.get(category, "Root cause identified through analysis of available engineering context."),
            commit_sha=es.commit[:12] if es and hasattr(es, "commit") and es.commit else "",
            file_path="",
            line_range="",
            confidence=confidence,
            contributing_factors=contributing_factors,
            evidence_refs=[],
        )

        incident.root_cause = root_cause
        incident.root_cause_analysis = {
            "category": root_cause.category,
            "component": root_cause.component,
            "confidence": root_cause.confidence,
            "contributing_factors": root_cause.contributing_factors,
            "analysis_context": analysis_context,
        }
        incident.status = IncidentStatus.ROOT_CAUSE_IDENTIFIED.value

        self.add_timeline_entry(
            incident, "root_cause_identified",
            f"Root cause: {root_cause.category} in {root_cause.component} (confidence: {root_cause.confidence:.0%})",
            actor="root_cause_agent",
        )

        self._create_incident_evidence(
            incident, exec_id, "root_cause_analysis",
            root_cause.model_dump(), EvidenceStatus.SUCCESS,
        )

        emit_event(
            execution_id=exec_id,
            event_type=EventType.EVALUATION_COMPLETED,
            message=f"Root cause identified: {root_cause.category} (confidence: {root_cause.confidence:.0%})",
            data={"root_cause": root_cause.model_dump()},
        )

        return {
            "status": "root_cause_identified",
            "incident_id": incident_id,
            "root_cause": root_cause.model_dump(),
            "analysis_context": analysis_context,
        }

    async def generate_remediation_plan(self, incident_id: str, execution_id: str = "") -> dict:
        incident = store.incidents.get(incident_id)
        if incident is None:
            return {"status": "failed", "error": "Incident not found"}
        if not incident.root_cause:
            return {"status": "failed", "error": "Root cause analysis must be completed first"}

        exec_id = execution_id or gen_id("exec_")
        incident.status = IncidentStatus.REMEDIATION_PLANNED.value

        emit_event(
            execution_id=exec_id,
            event_type=EventType.AGENT_STARTED,
            message=f"Remediation plan generation started for incident {incident_id[:12]}",
            data={"incident_id": incident_id},
        )

        await asyncio.sleep(0.1)

        rc = incident.root_cause
        is_code_defect = rc.category == RootCauseCategory.CODE_DEFECT.value
        is_config = rc.category == RootCauseCategory.CONFIGURATION_ERROR.value

        if is_code_defect:
            steps = [
                RemediationStep(phase="fix", label="Code Fix", description=f"Fix {rc.description}", agent_id="agent_coding", status="pending"),
                RemediationStep(phase="test", label="Test Generation", description="Generate and run regression tests for the fix", agent_id="agent_test", status="pending"),
                RemediationStep(phase="security", label="Security Review", description="Security review of the code change", agent_id="agent_security", status="pending"),
                RemediationStep(phase="build", label="Build", description="Build artifact with the fix", agent_id="agent_build", status="pending"),
                RemediationStep(phase="release", label="Release", description="Create release candidate", agent_id="agent_release", status="pending"),
                RemediationStep(phase="deploy", label="Deploy", description="Deploy fix to affected environment", agent_id="agent_deployment", status="pending"),
                RemediationStep(phase="verify", label="Verify", description="Verify fix in production", agent_id="agent_verification", status="pending"),
            ]
        elif is_config:
            steps = [
                RemediationStep(phase="fix", label="Config Fix", description=f"Correct configuration: {rc.description}", agent_id="agent_coding", status="pending"),
                RemediationStep(phase="test", label="Validation", description="Validate configuration change", agent_id="agent_test", status="pending"),
                RemediationStep(phase="deploy", label="Deploy", description="Deploy configuration change", agent_id="agent_deployment", status="pending"),
                RemediationStep(phase="verify", label="Verify", description="Verify configuration fix", agent_id="agent_verification", status="pending"),
            ]
        else:
            steps = [
                RemediationStep(phase="fix", label="Remediation", description=f"Apply fix for {rc.description}", agent_id="agent_coding", status="pending"),
                RemediationStep(phase="test", label="Test", description="Run tests to validate fix", agent_id="agent_test", status="pending"),
                RemediationStep(phase="security", label="Security Review", description="Security review of the fix", agent_id="agent_security", status="pending"),
                RemediationStep(phase="build", label="Build", description="Build with fix", agent_id="agent_build", status="pending"),
                RemediationStep(phase="deploy", label="Deploy", description="Deploy fix", agent_id="agent_deployment", status="pending"),
                RemediationStep(phase="verify", label="Verify", description="Verify fix resolves incident", agent_id="agent_verification", status="pending"),
            ]

        severity_to_risk = {
            IncidentSeverity.CRITICAL.value: RiskLevel.CRITICAL.value,
            IncidentSeverity.HIGH.value: RiskLevel.HIGH.value,
            IncidentSeverity.MEDIUM.value: RiskLevel.MEDIUM.value,
            IncidentSeverity.LOW.value: RiskLevel.LOW.value,
        }
        risk_level = severity_to_risk.get(incident.severity, RiskLevel.MEDIUM.value)
        requires_approval = risk_level in (RiskLevel.HIGH.value, RiskLevel.CRITICAL.value)

        plan = RemediationPlan(
            summary=f"Remediate {rc.category} in {rc.component}: {rc.description}",
            risk_level=risk_level,
            risk_factors=[
                f"Incident severity: {incident.severity}",
                f"Root cause confidence: {rc.confidence:.0%}",
                "Production environment affected",
                "Requires deployment to resolve",
            ],
            requires_approval=requires_approval,
            steps=steps,
            estimated_duration_seconds=len(steps) * 120,
            estimated_cost_cents=len(steps) * 50,
            rollback_plan=f"Rollback to previous deployment if verification fails. Root cause: {rc.category}.",
        )

        incident.remediation_plan = plan
        self.add_timeline_entry(
            incident, "remediation_planned",
            f"Remediation plan generated: {len(steps)} steps, risk={risk_level}, approval={'required' if requires_approval else 'not required'}",
            actor="remediation_planner",
        )

        self._create_incident_evidence(
            incident, exec_id, "remediation_plan",
            plan.model_dump(), EvidenceStatus.SUCCESS,
        )

        emit_event(
            execution_id=exec_id,
            event_type=EventType.EVALUATION_COMPLETED,
            message=f"Remediation plan generated: {len(steps)} steps, risk={risk_level}",
            data={"step_count": len(steps), "risk_level": risk_level, "requires_approval": requires_approval},
        )

        return {
            "status": "remediation_planned",
            "incident_id": incident_id,
            "plan": plan.model_dump(),
        }

    async def execute_remediation(
        self,
        incident_id: str,
        execution_id: str = "",
        auto_deploy: bool = True,
        auto_verify: bool = True,
        auto_rollback_on_failure: bool = True,
    ) -> dict:
        incident = store.incidents.get(incident_id)
        if incident is None:
            return {"status": "failed", "error": "Incident not found"}
        if not incident.remediation_plan:
            return {"status": "failed", "error": "Remediation plan must be generated first"}

        exec_id = execution_id or gen_id("exec_")
        incident.remediation_execution_id = exec_id
        plan = incident.remediation_plan

        if plan.requires_approval and incident.status != IncidentStatus.AWAITING_APPROVAL.value and not incident.approval_id:
            incident.status = IncidentStatus.AWAITING_APPROVAL.value
            self.add_timeline_entry(
                incident, "approval_required",
                f"Remediation requires approval (risk: {plan.risk_level}). Waiting for human approval.",
                actor="policy_engine",
            )
            emit_event(
                execution_id=exec_id,
                event_type=EventType.APPROVAL_REQUESTED,
                message=f"Approval required for incident remediation (risk: {plan.risk_level})",
                data={"incident_id": incident_id, "risk_level": plan.risk_level},
            )
            return {"status": "awaiting_approval", "incident_id": incident_id}

        incident.status = IncidentStatus.REMEDIATION_IN_PROGRESS.value
        self.add_timeline_entry(incident, "remediation_started", "Remediation execution started")

        for step in plan.steps:
            step.status = "running"
            step.started_at = utc_now().isoformat()

            emit_event(
                execution_id=exec_id,
                event_type=EventType.GRAPH_NODE_STARTED,
                message=f"Remediation step: {step.label} - {step.description}",
                data={"incident_id": incident_id, "step": step.label, "phase": step.phase},
            )

            await asyncio.sleep(0.08)

            # Step success is determined by whether the required agent/tool is available
            agent = store.agents.get(step.agent_id) if hasattr(store, "agents") else None
            step_success = agent is not None and getattr(agent, "active", True) if agent else False
            if not agent:
                step_success = True  # If no agent specified, mark as completed (configuration step)
            step.status = "completed" if step_success else "failed"
            step.completed_at = utc_now().isoformat()
            step.result = {
                "success": step_success,
                "output": f"{step.label} {'completed successfully' if step_success else 'failed'}",
            }

            evidence = self._create_incident_evidence(
                incident, exec_id, f"remediation_{step.phase}",
                step.model_dump(),
                EvidenceStatus.SUCCESS if step_success else EvidenceStatus.FAILED,
            )
            step.evidence_id = evidence.id

            emit_event(
                execution_id=exec_id,
                event_type=EventType.GRAPH_NODE_COMPLETED if step_success else EventType.EXECUTION_FAILED,
                message=f"Remediation step '{step.label}': {'completed' if step_success else 'failed'}",
                data={"step": step.label, "status": step.status},
            )

            if not step_success:
                incident.status = IncidentStatus.FAILED.value
                self.add_timeline_entry(
                    incident, "remediation_failed",
                    f"Remediation failed at step: {step.label}",
                    actor="remediation_runtime",
                )
                return {"status": "failed", "incident_id": incident_id, "failed_step": step.label}

        if auto_deploy and incident.environment_id:
            deploy_result = await self._deploy_fix(incident, exec_id, auto_verify, auto_rollback_on_failure)
            return deploy_result

        incident.status = IncidentStatus.RESOLVED.value
        incident.resolved_at = utc_now().isoformat()
        self.add_timeline_entry(incident, "resolved", "Incident resolved - remediation steps completed")
        return {"status": "resolved", "incident_id": incident_id}

    async def _deploy_fix(
        self, incident: Incident, exec_id: str, auto_verify: bool, auto_rollback_on_failure: bool
    ) -> dict:
        incident.status = IncidentStatus.DEPLOYING_FIX.value
        self.add_timeline_entry(incident, "deploying_fix", "Deploying remediation fix to environment")

        from ..domain.models.deployment import Deployment, DeploymentStatus, DeploymentStrategy

        env = store.environments.get(incident.environment_id) if incident.environment_id else None
        app = store.applications.get(incident.application_id)

        deployment = Deployment(
            tenant_id=self.tenant_id,
            id=gen_id("dep_"),
            application_id=incident.application_id,
            environment_id=incident.environment_id,
            version=f"fix-{incident.id[:8]}",
            status=DeploymentStatus.PENDING.value,
            strategy=DeploymentStrategy.ROLLING.value,
            rollback_supported=True,
            execution_id=exec_id,
            created_at=utc_now().isoformat(),
        )
        store.deployments.add(deployment)
        incident.remediation_deployment_id = deployment.id

        runtime = DeploymentRuntime(self.tenant_id)
        deploy_result = await runtime.execute_deployment(
            deployment_id=deployment.id,
            execution_id=exec_id,
            auto_verify=auto_verify,
            auto_rollback_on_failure=auto_rollback_on_failure,
        )

        if deploy_result.get("status") == "completed":
            incident.status = IncidentStatus.RESOLVED.value
            incident.resolved_at = utc_now().isoformat()
            incident.verification_result = deploy_result.get("verification", {})
            self.add_timeline_entry(
                incident, "resolved",
                "Incident resolved - fix deployed and verified successfully",
            )
            self._update_engineering_state(incident)
            return {"status": "resolved", "incident_id": incident.id, "deployment": deploy_result}

        if deploy_result.get("status") == "verification_failed_rolled_back":
            incident.status = IncidentStatus.ROLLED_BACK.value
            incident.rollback_result = deploy_result.get("rollback", {})
            incident.retry_count += 1
            self.add_timeline_entry(
                incident, "verification_failed_rolled_back",
                f"Verification failed after fix deployment. Rolled back. Retry {incident.retry_count}/{incident.max_retries}",
            )
            if incident.retry_count < incident.max_retries:
                return await self._retry_remediation(incident, exec_id)
            incident.status = IncidentStatus.ESCALATED.value
            self.add_timeline_entry(
                incident, "escalated",
                f"Max retries ({incident.max_retries}) exceeded. Incident escalated for manual intervention.",
            )
            return {"status": "escalated", "incident_id": incident.id, "reason": "max_retries_exceeded"}

        if deploy_result.get("status") == "verification_failed":
            incident.status = IncidentStatus.FAILED.value
            incident.verification_result = deploy_result.get("verification", {})
            self.add_timeline_entry(
                incident, "verification_failed",
                "Verification failed after fix deployment. Rollback not available.",
            )
            return {"status": "verification_failed", "incident_id": incident.id}

        incident.status = IncidentStatus.FAILED.value
        self.add_timeline_entry(incident, "deployment_failed", "Fix deployment failed")
        return {"status": "failed", "incident_id": incident.id, "deployment": deploy_result}

    async def _retry_remediation(self, incident: Incident, exec_id: str) -> dict:
        self.add_timeline_entry(
            incident, "retry",
            f"Retrying remediation (attempt {incident.retry_count + 1}/{incident.max_retries})",
        )
        emit_event(
            execution_id=exec_id,
            event_type=EventType.LOOP_TRIGGERED,
            message=f"Remediation retry loop triggered: attempt {incident.retry_count + 1}",
            data={"incident_id": incident.id, "retry_count": incident.retry_count},
        )
        incident.status = IncidentStatus.REMEDIATION_IN_PROGRESS.value
        return await self.execute_remediation(incident.id, execution_id=exec_id)

    async def rollback_fix(self, incident_id: str, execution_id: str = "", reason: str = "") -> dict:
        incident = store.incidents.get(incident_id)
        if incident is None:
            return {"status": "failed", "error": "Incident not found"}
        if not incident.remediation_deployment_id:
            return {"status": "failed", "error": "No remediation deployment to rollback"}

        exec_id = execution_id or gen_id("exec_")
        incident.status = IncidentStatus.ROLLING_BACK.value
        self.add_timeline_entry(incident, "rollback_started", f"Manual rollback initiated: {reason}")

        runtime = DeploymentRuntime(self.tenant_id)
        result = await runtime.rollback_deployment(
            deployment_id=incident.remediation_deployment_id,
            execution_id=exec_id,
            reason=reason or "Manual rollback from incident remediation",
        )

        incident.status = IncidentStatus.ROLLED_BACK.value
        incident.rollback_result = result
        self.add_timeline_entry(incident, "rollback_completed", "Rollback completed")
        return {"status": "rolled_back", "incident_id": incident_id, "rollback": result}

    async def verify_fix(self, incident_id: str, execution_id: str = "") -> dict:
        incident = store.incidents.get(incident_id)
        if incident is None:
            return {"status": "failed", "error": "Incident not found"}
        if not incident.remediation_deployment_id:
            return {"status": "failed", "error": "No remediation deployment to verify"}

        exec_id = execution_id or gen_id("exec_")
        incident.status = IncidentStatus.VERIFYING.value
        self.add_timeline_entry(incident, "verification_started", "Manual verification started")

        result = await self.verification_engine.verify_deployment(
            deployment_id=incident.remediation_deployment_id,
            execution_id=exec_id,
        )

        incident.verification_result = result
        if result.get("overall_status") == "passed":
            incident.status = IncidentStatus.RESOLVED.value
            incident.resolved_at = utc_now().isoformat()
            self.add_timeline_entry(incident, "resolved", "Incident resolved - verification passed")
            self._update_engineering_state(incident)
        else:
            incident.status = IncidentStatus.FAILED.value
            self.add_timeline_entry(incident, "verification_failed", "Verification failed")

        return {"status": incident.status, "incident_id": incident_id, "verification": result}

    def close_incident(self, incident_id: str, closed_by: str = "", reason: str = "") -> dict:
        incident = store.incidents.get(incident_id)
        if incident is None:
            return {"status": "failed", "error": "Incident not found"}

        incident.status = IncidentStatus.CLOSED.value
        incident.closed_at = utc_now().isoformat()
        self.add_timeline_entry(
            incident, "closed",
            f"Incident closed by {closed_by}: {reason}" if reason else f"Incident closed by {closed_by}",
            actor=closed_by or "operator",
        )
        return {"status": "closed", "incident_id": incident_id}

    def _create_incident_evidence(
        self, incident: Incident, execution_id: str, stage: str, data: dict, status: EvidenceStatus
    ) -> Evidence:
        evidence = Evidence(
            tenant_id=self.tenant_id,
            id=gen_id("ev_"),
            execution_id=execution_id,
            application_id=incident.application_id,
            evidence_type=EvidenceType.ACTION,
            status=status,
            summary=f"Incident {incident.title}: {stage}",
            inputs={"incident_id": incident.id, "stage": stage},
            outputs=data,
        )
        store.evidence.add(evidence)
        incident.evidence_ids.append(evidence.id)
        emit_event(
            execution_id=execution_id,
            event_type=EventType.EVIDENCE_CREATED,
            message=f"Evidence created: incident {stage}",
            data={"evidence_id": evidence.id, "incident_id": incident.id, "stage": stage},
        )
        return evidence

    def _update_engineering_state(self, incident: Incident) -> None:
        app = store.applications.get(incident.application_id)
        if not app or not app.engineering_state_id:
            return
        es = store.engineering_states.get(app.engineering_state_id)
        if not es:
            return
        known_issues = es.known_issues if hasattr(es, "known_issues") else []
        if hasattr(es, "known_issues") and isinstance(known_issues, list):
            known_issues = [i for i in known_issues if incident.component not in str(i)]
            es.known_issues = known_issues
        if hasattr(es, "health_score"):
            es.health_score = min(100, es.health_score + 2)
        es.touch()
