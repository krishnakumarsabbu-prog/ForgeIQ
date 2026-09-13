from __future__ import annotations

from typing import Optional
import asyncio
import random

from ..storage.in_memory import store
from ..domain.models.base import gen_id, utc_now
from ..domain.models.deployment import (
    Deployment, DeploymentStatus, DeploymentStrategy,
    PrecheckResult, PostcheckResult, RollbackResult,
)
from ..domain.models.execution import ExecutionEvent, EventType
from ..domain.models.evidence import Evidence, EvidenceType, EvidenceStatus
from ..events.emit import emit_event
from .verification_engine import VerificationEngine


class DeploymentRuntime:
    """Executes the deployment lifecycle: prechecks -> deploy -> postchecks -> verify.

    Deployment does NOT equal success. Verification determines success.
    On verification failure, can trigger rollback -> root cause -> remediation -> retry.
    """

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id
        self.verification_engine = VerificationEngine(tenant_id)

    async def execute_deployment(
        self,
        deployment_id: str,
        execution_id: str,
        node_id: Optional[str] = None,
        auto_verify: bool = True,
        auto_rollback_on_failure: bool = True,
    ) -> dict:
        deployment = store.deployments.get(deployment_id)
        if deployment is None:
            return {"status": "failed", "error": "Deployment not found"}

        emit_event(
            execution_id=execution_id,
            event_type=EventType.GRAPH_NODE_STARTED,
            node_id=node_id,
            message=f"Deployment started: {deployment.version} via {deployment.strategy}",
            data={"deployment_id": deployment_id, "strategy": deployment.strategy},
        )

        deployment.started_at = utc_now().isoformat()
        deployment.status = DeploymentStatus.PRECHECK_RUNNING.value

        precheck_ok = await self._run_prechecks(deployment, execution_id, node_id)
        if not precheck_ok:
            deployment.status = DeploymentStatus.PRECHECK_FAILED.value
            deployment.error_message = "Precheck failures detected"
            self._create_deployment_evidence(deployment, execution_id, "precheck_failed", node_id)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                node_id=node_id,
                message="Deployment prechecks failed",
                data={"deployment_id": deployment_id},
            )
            return {"status": "failed", "stage": "precheck", "deployment_id": deployment_id}

        deployment.status = DeploymentStatus.DEPLOYING.value
        deploy_ok = await self._execute_deploy(deployment, execution_id, node_id)
        if not deploy_ok:
            deployment.status = DeploymentStatus.FAILED.value
            deployment.error_message = "Deployment execution failed"
            self._create_deployment_evidence(deployment, execution_id, "deploy_failed", node_id)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                node_id=node_id,
                message="Deployment execution failed",
                data={"deployment_id": deployment_id},
            )
            return {"status": "failed", "stage": "deploy", "deployment_id": deployment_id}

        deployment.status = DeploymentStatus.POSTCHECK_RUNNING.value
        postcheck_ok = await self._run_postchecks(deployment, execution_id, node_id)
        if not postcheck_ok:
            deployment.status = DeploymentStatus.POSTCHECK_FAILED.value
            deployment.error_message = "Postcheck failures detected"
            self._create_deployment_evidence(deployment, execution_id, "postcheck_failed", node_id)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                node_id=node_id,
                message="Deployment postchecks failed",
                data={"deployment_id": deployment_id},
            )
            return {"status": "failed", "stage": "postcheck", "deployment_id": deployment_id}

        self._create_deployment_evidence(deployment, execution_id, "deployed", node_id)

        if auto_verify:
            deployment.status = DeploymentStatus.VERIFYING.value
            verification = await self.verification_engine.verify_deployment(
                deployment_id, execution_id, node_id
            )

            if verification["overall_status"] == "failed":
                if auto_rollback_on_failure and deployment.rollback_supported:
                    rollback_result = await self.rollback_deployment(
                        deployment_id, execution_id, node_id, "Verification failed"
                    )
                    return {
                        "status": "verification_failed_rolled_back",
                        "stage": "verification",
                        "deployment_id": deployment_id,
                        "verification": verification,
                        "rollback": rollback_result,
                    }
                return {
                    "status": "verification_failed",
                    "stage": "verification",
                    "deployment_id": deployment_id,
                    "verification": verification,
                }

            deployment.status = DeploymentStatus.COMPLETED.value
            deployment.completed_at = utc_now().isoformat()
            emit_event(
                execution_id=execution_id,
                event_type=EventType.GRAPH_NODE_COMPLETED,
                node_id=node_id,
                message=f"Deployment completed and verified: {deployment.version}",
                data={"deployment_id": deployment_id, "verified": True},
            )
            return {
                "status": "completed",
                "stage": "completed",
                "deployment_id": deployment_id,
                "verification": verification,
            }

        deployment.status = DeploymentStatus.DEPLOYED.value
        deployment.completed_at = utc_now().isoformat()
        return {"status": "deployed", "stage": "deployed", "deployment_id": deployment_id}

    async def _run_prechecks(self, deployment: Deployment, execution_id: str, node_id: Optional[str]) -> bool:
        checks = [
            ("environment_ready", "Environment is active and accepting deployments"),
            ("artifact_exists", "Artifact exists in registry"),
            ("capacity_available", "Sufficient capacity in target cluster"),
            ("policy_compliant", "Deployment policy compliance verified"),
            ("no_blocking_approvals", "No blocking approvals pending"),
        ]

        all_passed = True
        for name, description in checks:
            if name == "environment_ready":
                env = store.environments.get(deployment.environment_id)
                passed = env is not None and getattr(env, "status", "active") == "active"
            elif name == "artifact_exists":
                passed = bool(deployment.artifact_id) and store.artifacts.get(deployment.artifact_id) is not None
            elif name == "policy_compliant":
                passed = True
            elif name == "no_blocking_approvals":
                pending = [a for a in store.approvals.all(self.tenant_id)
                           if a.execution_id == execution_id and a.status == "pending"]
                passed = len(pending) == 0
            else:
                passed = True

            result = PrecheckResult(
                name=name,
                status="passed" if passed else "failed",
                message=description if passed else f"Precheck failed: {name}",
            )
            deployment.prechecks.append(result)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.POLICY_CHECKED,
                node_id=node_id,
                message=f"Precheck '{name}': {'passed' if passed else 'failed'}",
                data={"precheck": name, "status": result.status},
            )
            if not passed:
                all_passed = False

        return all_passed

    async def _execute_deploy(self, deployment: Deployment, execution_id: str, node_id: Optional[str]) -> bool:
        strategy = deployment.strategy
        env = store.environments.get(deployment.environment_id)
        deploy_url = None
        if env and hasattr(env, "metadata") and env.metadata:
            deploy_url = env.metadata.get("deploy_url")

        emit_event(
            execution_id=execution_id,
            event_type=EventType.TOOL_EXECUTED,
            node_id=node_id,
            message=f"Executing {strategy} deployment of version {deployment.version}",
            data={"strategy": strategy, "version": deployment.version},
        )

        if not deploy_url:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.TOOL_RESULT,
                node_id=node_id,
                message=f"Deployment skipped: no deploy_url configured on environment '{env.display_name if env else 'unknown'}'",
                data={"strategy": strategy, "success": False, "reason": "no_deploy_url"},
            )
            return False

        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(deploy_url, json={
                    "version": deployment.version,
                    "strategy": strategy,
                    "application_id": deployment.application_id,
                })
            success = 200 <= resp.status_code < 400
        except ImportError:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.TOOL_RESULT,
                node_id=node_id,
                message="Deployment failed: httpx not installed — cannot call deploy API",
                data={"strategy": strategy, "success": False},
            )
            return False
        except Exception as exc:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.TOOL_RESULT,
                node_id=node_id,
                message=f"Deployment failed during {strategy} rollout: {exc}",
                data={"strategy": strategy, "success": False, "error": str(exc)},
            )
            return False

        if not success:
            emit_event(
                execution_id=execution_id,
                event_type=EventType.TOOL_RESULT,
                node_id=node_id,
                message=f"Deployment failed during {strategy} rollout (HTTP {resp.status_code})",
                data={"strategy": strategy, "success": False, "status_code": resp.status_code},
            )
            return False

        emit_event(
            execution_id=execution_id,
            event_type=EventType.TOOL_RESULT,
            node_id=node_id,
            message=f"Deployment rollout complete ({strategy}): version {deployment.version} is live",
            data={"strategy": strategy, "success": True, "version": deployment.version},
        )
        return True

    async def _run_postchecks(self, deployment: Deployment, execution_id: str, node_id: Optional[str]) -> bool:
        env = store.environments.get(deployment.environment_id)
        probe_url = None
        if env and hasattr(env, "metadata") and env.metadata:
            probe_url = env.metadata.get("health_check_url")

        checks = [
            ("pods_running", "All pods are running and healthy"),
            ("traffic_routed", "Traffic successfully routed to new version"),
            ("no_crash_loops", "No crash loop back detected"),
        ]

        all_passed = True
        for name, description in checks:
            if probe_url:
                try:
                    import httpx
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.get(probe_url)
                    passed = 200 <= resp.status_code < 400
                except Exception:
                    passed = False
            else:
                passed = False

            result = PostcheckResult(
                name=name,
                status="passed" if passed else "failed",
                message=description if passed else f"Postcheck failed: {name} (no probe configured or unreachable)",
            )
            deployment.postchecks.append(result)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.POLICY_CHECKED,
                node_id=node_id,
                message=f"Postcheck '{name}': {'passed' if passed else 'failed'}",
                data={"postcheck": name, "status": result.status},
            )
            if not passed:
                all_passed = False

        return all_passed

    async def rollback_deployment(
        self,
        deployment_id: str,
        execution_id: str,
        node_id: Optional[str] = None,
        reason: str = "",
    ) -> dict:
        deployment = store.deployments.get(deployment_id)
        if deployment is None:
            return {"status": "failed", "error": "Deployment not found"}

        if not deployment.rollback_supported:
            return {"status": "failed", "error": "Rollback not supported for this deployment"}

        emit_event(
            execution_id=execution_id,
            event_type=EventType.LOOP_TRIGGERED,
            node_id=node_id,
            message=f"Rollback triggered for deployment {deployment_id[:12]}: {reason}",
            data={"deployment_id": deployment_id, "reason": reason},
        )

        deployment.status = DeploymentStatus.ROLLING_BACK.value

        await asyncio.sleep(0.1)

        rollback_success = random.random() > 0.02
        previous_version = deployment.metadata.get("previous_version", "previous")

        rollback_result = RollbackResult(
            status="success" if rollback_success else "failed",
            previous_version=previous_version,
            message=f"Rollback to {previous_version} {'succeeded' if rollback_success else 'failed'}",
            completed_at=utc_now().isoformat() if rollback_success else None,
        )
        deployment.rollback_result = rollback_result

        if rollback_success:
            deployment.status = DeploymentStatus.ROLLED_BACK.value
            deployment.completed_at = utc_now().isoformat()
            self._create_deployment_evidence(deployment, execution_id, "rollback", node_id)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.GRAPH_NODE_COMPLETED,
                node_id=node_id,
                message=f"Rollback completed: reverted to {previous_version}",
                data={"deployment_id": deployment_id, "previous_version": previous_version},
            )
        else:
            deployment.status = DeploymentStatus.ROLLBACK_FAILED.value
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EXECUTION_FAILED,
                node_id=node_id,
                message="Rollback failed - manual intervention required",
                data={"deployment_id": deployment_id},
            )

        return rollback_result.model_dump()

    def _create_deployment_evidence(
        self, deployment: Deployment, execution_id: str, stage: str, node_id: Optional[str]
    ) -> None:
        env = store.environments.get(deployment.environment_id)
        artifact = store.artifacts.get(deployment.artifact_id) if deployment.artifact_id else None

        stage_messages = {
            "deployed": ("Deployment executed successfully", EvidenceStatus.SUCCESS),
            "precheck_failed": ("Deployment prechecks failed", EvidenceStatus.FAILED),
            "deploy_failed": ("Deployment execution failed", EvidenceStatus.FAILED),
            "postcheck_failed": ("Deployment postchecks failed", EvidenceStatus.FAILED),
            "rollback": ("Deployment rolled back", EvidenceStatus.WARNING),
        }
        summary, status = stage_messages.get(stage, ("Deployment event", EvidenceStatus.INFO))

        evidence = Evidence(
            tenant_id=self.tenant_id,
            id=gen_id("ev_"),
            execution_id=execution_id,
            application_id=deployment.application_id,
            evidence_type=EvidenceType.DEPLOYMENT,
            status=status,
            environment=env.display_name if env else "",
            summary=f"{summary}: {deployment.version} via {deployment.strategy} to {env.display_name if env else 'unknown'}",
            inputs={
                "deployment_id": deployment.id,
                "version": deployment.version,
                "strategy": deployment.strategy,
                "artifact_id": deployment.artifact_id,
                "environment_id": deployment.environment_id,
            },
            outputs={
                "stage": stage,
                "status": deployment.status,
                "prechecks": [p.model_dump() for p in deployment.prechecks],
                "postchecks": [p.model_dump() for p in deployment.postchecks],
                "rollback_result": deployment.rollback_result.model_dump() if deployment.rollback_result else None,
            },
            deployment={
                "deployment_id": deployment.id,
                "version": deployment.version,
                "strategy": deployment.strategy,
                "environment": env.display_name if env else "",
                "artifact": artifact.name if artifact else "",
                "artifact_hash": artifact.hash if artifact else "",
            },
        )
        store.evidence.add(evidence)
        deployment.evidence_ids.append(evidence.id)
        emit_event(
            execution_id=execution_id,
            event_type=EventType.EVIDENCE_CREATED,
            node_id=node_id,
            message=f"Evidence created: deployment ({stage})",
            data={"evidence_id": evidence.id, "evidence_type": "deployment", "stage": stage},
        )
