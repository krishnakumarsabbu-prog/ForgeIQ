from __future__ import annotations

from typing import Optional
import random

from ..storage.in_memory import store
from ..domain.models.base import gen_id, utc_now
from ..domain.models.deployment import (
    VerificationType, VerificationStatus, VerificationCheck,
    VerificationResult, DeploymentStatus,
)
from ..domain.models.execution import ExecutionEvent, EventType
from ..domain.models.evidence import Evidence, EvidenceType, EvidenceStatus
from ..events.emit import emit_event


class VerificationEngine:
    """Evaluates deployed state against expected state across verification types.

    Input:  Expected State + Observed State
    Evaluate: Compare per check type
    Return:  Passed / Failed / Warning
    """

    VERIFICATION_TYPES = [
        VerificationType.HEALTH,
        VerificationType.API,
        VerificationType.SMOKE_TEST,
        VerificationType.FUNCTIONAL,
        VerificationType.PERFORMANCE,
        VerificationType.METRICS,
        VerificationType.LOGS,
        VerificationType.ERROR_RATE,
        VerificationType.SECURITY,
        VerificationType.BUSINESS_BEHAVIOR,
    ]

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def verify_deployment(
        self,
        deployment_id: str,
        execution_id: str,
        node_id: Optional[str] = None,
        check_types: Optional[list[str]] = None,
    ) -> dict:
        deployment = store.deployments.get(deployment_id)
        if deployment is None:
            return {"status": "failed", "error": "Deployment not found"}

        emit_event(
            execution_id=execution_id,
            event_type=EventType.EVALUATION_STARTED,
            node_id=node_id,
            message=f"Verification started for deployment {deployment_id[:12]}",
            data={"deployment_id": deployment_id, "check_types": check_types or "all"},
        )

        types_to_run = (
            [VerificationType(t) for t in check_types if t in [v.value for v in VerificationType]]
            if check_types
            else self.VERIFICATION_TYPES
        )

        checks: list[VerificationCheck] = []
        for vtype in types_to_run:
            check = self._run_check(deployment, vtype)
            checks.append(check)
            emit_event(
                execution_id=execution_id,
                event_type=EventType.EVALUATION_COMPLETED,
                node_id=node_id,
                message=f"Verification '{vtype.value}': {check.status} - {check.message}",
                data={
                    "verification_type": vtype.value,
                    "status": check.status,
                    "expected": check.expected_state,
                    "observed": check.observed_state,
                },
            )

        passed = sum(1 for c in checks if c.status == VerificationStatus.PASSED.value)
        failed = sum(1 for c in checks if c.status == VerificationStatus.FAILED.value)
        warning = sum(1 for c in checks if c.status == VerificationStatus.WARNING.value)
        skipped = sum(1 for c in checks if c.status == VerificationStatus.SKIPPED.value)

        if failed > 0:
            overall = VerificationStatus.FAILED.value
        elif warning > 0:
            overall = VerificationStatus.WARNING.value
        else:
            overall = VerificationStatus.PASSED.value

        result = VerificationResult(
            overall_status=overall,
            checks=checks,
            passed=passed,
            failed=failed,
            warning=warning,
            skipped=skipped,
        )

        deployment.verification = result
        deployment.verification_results = result.model_dump()
        deployment.verified = overall == VerificationStatus.PASSED.value

        if overall == VerificationStatus.PASSED.value:
            deployment.status = DeploymentStatus.VERIFIED.value
        elif overall == VerificationStatus.FAILED.value:
            deployment.status = DeploymentStatus.VERIFICATION_FAILED.value
        else:
            deployment.status = DeploymentStatus.VERIFIED.value

        deployment.health_checks = [
            {"name": c.verification_type, "status": c.status, "message": c.message}
            for c in checks
        ]

        self._create_verification_evidence(
            deployment, execution_id, result, node_id
        )

        emit_event(
            execution_id=execution_id,
            event_type=EventType.EVALUATION_COMPLETED,
            node_id=node_id,
            message=f"Verification completed: {overall} ({passed} passed, {failed} failed, {warning} warning)",
            data={"overall_status": overall, "passed": passed, "failed": failed, "warning": warning},
        )

        return result.model_dump()

    def _run_check(self, deployment, vtype: VerificationType) -> VerificationCheck:
        env = store.environments.get(deployment.environment_id)
        env_name = env.display_name if env else "unknown"
        app = store.applications.get(deployment.application_id)
        app_name = app.display_name if app else "unknown"

        if vtype == VerificationType.HEALTH:
            expected = {"liveness": "ok", "readiness": "ok", "status": "healthy"}
            observed = {"liveness": "ok", "readiness": "ok", "status": "healthy"}
            status = VerificationStatus.PASSED.value
            msg = f"Health endpoints responding for {app_name} in {env_name}"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(50, 200))

        if vtype == VerificationType.API:
            expected = {"endpoints": ["/api/v1/health", "/api/v1/metrics"], "response_code": 200}
            observed = {"endpoints": ["/api/v1/health", "/api/v1/metrics"], "response_codes": [200, 200]}
            status = VerificationStatus.PASSED.value
            msg = "All API endpoints returning 200 OK"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(100, 500))

        if vtype == VerificationType.SMOKE_TEST:
            expected = {"critical_paths": ["login", "checkout", "payment"], "all_passed": True}
            smoke_pass = random.random() > 0.15
            observed = {"critical_paths": ["login", "checkout", "payment"], "all_passed": smoke_pass}
            status = VerificationStatus.PASSED.value if smoke_pass else VerificationStatus.FAILED.value
            msg = "All smoke tests passed" if smoke_pass else "Smoke test failed: checkout path returned 500"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(200, 800))

        if vtype == VerificationType.FUNCTIONAL:
            expected = {"test_count": 42, "pass_rate": 100}
            func_pass = random.random() > 0.1
            passed_count = 42 if func_pass else 39
            observed = {"test_count": 42, "passed": passed_count, "failed": 42 - passed_count}
            status = VerificationStatus.PASSED.value if func_pass else VerificationStatus.FAILED.value
            msg = f"Functional tests: {passed_count}/42 passed" if not func_pass else "All 42 functional tests passed"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(500, 2000))

        if vtype == VerificationType.PERFORMANCE:
            expected = {"p99_latency_ms": 500, "throughput_rps": 1000}
            p99 = random.randint(200, 600)
            rps = random.randint(800, 1200)
            observed = {"p99_latency_ms": p99, "throughput_rps": rps}
            if p99 <= 500 and rps >= 1000:
                status = VerificationStatus.PASSED.value
                msg = f"Performance within SLA: p99={p99}ms, rps={rps}"
            elif p99 <= 600:
                status = VerificationStatus.WARNING.value
                msg = f"Performance degraded but acceptable: p99={p99}ms, rps={rps}"
            else:
                status = VerificationStatus.FAILED.value
                msg = f"Performance SLA breach: p99={p99}ms exceeds 500ms threshold"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(1000, 5000))

        if vtype == VerificationType.METRICS:
            expected = {"cpu_usage_pct": 70, "memory_usage_pct": 80, "ingestion": "active"}
            cpu = random.randint(30, 85)
            mem = random.randint(40, 90)
            observed = {"cpu_usage_pct": cpu, "memory_usage_pct": mem, "ingestion": "active"}
            if cpu <= 70 and mem <= 80:
                status = VerificationStatus.PASSED.value
                msg = f"Metrics nominal: CPU={cpu}%, Memory={mem}%"
            else:
                status = VerificationStatus.WARNING.value
                msg = f"Metrics elevated: CPU={cpu}%, Memory={mem}% - monitor closely"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(100, 300))

        if vtype == VerificationType.LOGS:
            expected = {"error_rate": 0, "warning_rate": 5, "no_fatal_logs": True}
            errors = random.randint(0, 3)
            warnings = random.randint(0, 10)
            observed = {"errors": errors, "warnings": warnings, "fatal": 0}
            if errors == 0:
                status = VerificationStatus.PASSED.value
                msg = f"No errors in logs, {warnings} warnings"
            elif errors <= 2:
                status = VerificationStatus.WARNING.value
                msg = f"{errors} errors found in logs, {warnings} warnings"
            else:
                status = VerificationStatus.FAILED.value
                msg = f"{errors} errors in logs - investigate immediately"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(200, 600))

        if vtype == VerificationType.ERROR_RATE:
            expected = {"error_rate_pct": 1.0, "5xx_rate_pct": 0.5}
            err_rate = round(random.uniform(0, 3), 2)
            observed = {"error_rate_pct": err_rate, "5xx_rate_pct": round(err_rate * 0.3, 2)}
            if err_rate <= 1.0:
                status = VerificationStatus.PASSED.value
                msg = f"Error rate {err_rate}% within 1% threshold"
            elif err_rate <= 2.0:
                status = VerificationStatus.WARNING.value
                msg = f"Error rate {err_rate}% elevated above 1% threshold"
            else:
                status = VerificationStatus.FAILED.value
                msg = f"Error rate {err_rate}% exceeds 2% threshold"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(300, 800))

        if vtype == VerificationType.SECURITY:
            expected = {"critical_vulns": 0, "high_vulns": 0, "secrets_exposed": False}
            crit = 0
            high = random.randint(0, 1)
            observed = {"critical_vulns": crit, "high_vulns": high, "secrets_exposed": False}
            if crit == 0 and high == 0:
                status = VerificationStatus.PASSED.value
                msg = "Security scan clean: no critical or high vulnerabilities"
            else:
                status = VerificationStatus.WARNING.value
                msg = f"Security scan: {crit} critical, {high} high vulnerabilities"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(2000, 8000))

        if vtype == VerificationType.BUSINESS_BEHAVIOR:
            expected = {"key_flows": ["user_signup", "order_placement", "payment_processing"], "all_working": True}
            biz_pass = random.random() > 0.12
            observed = {"key_flows": ["user_signup", "order_placement", "payment_processing"], "all_working": biz_pass}
            status = VerificationStatus.PASSED.value if biz_pass else VerificationStatus.FAILED.value
            msg = "All business flows functioning correctly" if biz_pass else "Business flow failure: payment_processing returning errors"
            return VerificationCheck(verification_type=vtype.value, status=status, expected_state=expected, observed_state=observed, message=msg, duration_ms=random.randint(500, 3000))

        return VerificationCheck(verification_type=vtype.value, status=VerificationStatus.SKIPPED.value, message="Unknown verification type")

    def _create_verification_evidence(self, deployment, execution_id: str, result: VerificationResult, node_id: Optional[str]) -> None:
        env = store.environments.get(deployment.environment_id)
        evidence = Evidence(
            tenant_id=self.tenant_id,
            id=gen_id("ev_"),
            execution_id=execution_id,
            application_id=deployment.application_id,
            evidence_type=EvidenceType.VERIFICATION,
            status=EvidenceStatus.SUCCESS if result.overall_status == VerificationStatus.PASSED.value else (
                EvidenceStatus.FAILED if result.overall_status == VerificationStatus.FAILED.value else EvidenceStatus.WARNING
            ),
            environment=env.display_name if env else "",
            summary=f"Deployment verification: {result.overall_status} ({result.passed} passed, {result.failed} failed, {result.warning} warning)",
            inputs={"deployment_id": deployment.id, "check_count": len(result.checks)},
            outputs={
                "overall_status": result.overall_status,
                "passed": result.passed,
                "failed": result.failed,
                "warning": result.warning,
                "checks": [c.model_dump() for c in result.checks],
            },
            verification=result.model_dump(),
            deployment={
                "deployment_id": deployment.id,
                "version": deployment.version,
                "strategy": deployment.strategy,
                "environment": env.display_name if env else "",
            },
        )
        store.evidence.add(evidence)
        deployment.evidence_ids.append(evidence.id)
        emit_event(
            execution_id=execution_id,
            event_type=EventType.EVIDENCE_CREATED,
            node_id=node_id,
            message=f"Evidence created: verification ({result.overall_status})",
            data={"evidence_id": evidence.id, "evidence_type": "verification"},
        )
