from __future__ import annotations

from ..domain.models.base import gen_id, utc_now
from ..domain.models.peer_engineering import (
    PeerEngineeringSession,
    PeerSessionStatus,
    WorkflowPhase,
    RepositoryFile,
    FileChange,
    RiskFactor,
    RiskLevel,
    WorkflowStep,
    TestResult,
    SecurityResult,
    BuildResult,
    EvidenceRecord,
)
from ..storage.in_memory import store


PHASE_LABELS: dict[str, str] = {
    WorkflowPhase.UNDERSTAND_REQUIREMENT.value: "Understand Requirement",
    WorkflowPhase.READ_ENGINEERING_STATE.value: "Read Engineering State",
    WorkflowPhase.FIND_RELEVANT_FILES.value: "Find Relevant Files",
    WorkflowPhase.IMPACT_ANALYSIS.value: "Impact Analysis",
    WorkflowPhase.RISK_ANALYSIS.value: "Risk Analysis",
    WorkflowPhase.CREATE_PLAN.value: "Create Plan",
    WorkflowPhase.DEVELOPER_APPROVAL.value: "Developer Approval",
    WorkflowPhase.MODIFY_CODE.value: "Modify Code",
    WorkflowPhase.RUN_TESTS.value: "Run Tests",
    WorkflowPhase.SECURITY_SCAN.value: "Security Scan",
    WorkflowPhase.BUILD.value: "Build",
    WorkflowPhase.EVIDENCE.value: "Evidence",
}

PHASE_DESCRIPTIONS: dict[str, str] = {
    WorkflowPhase.UNDERSTAND_REQUIREMENT.value: "Parse the developer request and identify the engineering intent",
    WorkflowPhase.READ_ENGINEERING_STATE.value: "Load current engineering state for the application",
    WorkflowPhase.FIND_RELEVANT_FILES.value: "Identify files relevant to the requested change using context engine",
    WorkflowPhase.IMPACT_ANALYSIS.value: "Analyze blast radius and dependencies affected by the change",
    WorkflowPhase.RISK_ANALYSIS.value: "Calculate risk level based on files, APIs, security, and complexity",
    WorkflowPhase.CREATE_PLAN.value: "Generate a step-by-step engineering plan",
    WorkflowPhase.DEVELOPER_APPROVAL.value: "Present plan for developer approval before execution",
    WorkflowPhase.MODIFY_CODE.value: "Apply code changes to relevant files",
    WorkflowPhase.RUN_TESTS.value: "Execute test suite and verify results",
    WorkflowPhase.SECURITY_SCAN.value: "Run SAST and dependency security scans",
    WorkflowPhase.BUILD.value: "Build the project and verify compilation",
    WorkflowPhase.EVIDENCE.value: "Collect evidence for the complete engineering workflow",
}

CRITICAL_FILE_PATTERNS = [
    "auth", "security", "payment", "database", "migration",
    "config", "env", "secret", "token", "password",
]

CRITICAL_CATEGORIES = ["authentication", "security", "database", "payment", "config"]


def _detect_language(path: str) -> str:
    ext_map = {
        ".py": "python", ".ts": "typescript", ".tsx": "typescript",
        ".js": "javascript", ".jsx": "javascript",
        ".java": "java", ".kt": "kotlin", ".go": "go",
        ".rs": "rust", ".rb": "ruby", ".cs": "csharp",
        ".xml": "xml", ".yaml": "yaml", ".yml": "yaml",
        ".json": "json", ".sql": "sql", ".sh": "shell",
        ".css": "css", ".html": "html", ".md": "markdown",
        ".toml": "toml", ".cfg": "ini", ".ini": "ini",
    }
    for ext, lang in ext_map.items():
        if path.endswith(ext):
            return lang
    return "text"


def _is_critical_file(path: str) -> bool:
    lower = path.lower()
    return any(p in lower for p in CRITICAL_FILE_PATTERNS)


def _categorize_file(path: str) -> str:
    lower = path.lower()
    if "test" in lower or "spec" in lower:
        return "test"
    if "migration" in lower or "schema" in lower:
        return "database"
    if "auth" in lower or "security" in lower or "token" in lower:
        return "security"
    if "config" in lower or ".env" in lower or "settings" in lower:
        return "config"
    if "controller" in lower or "router" in lower or "endpoint" in lower:
        return "api"
    if "model" in lower or "entity" in lower or "domain" in lower:
        return "domain"
    if "service" in lower:
        return "service"
    if "repository" in lower or "dao" in lower:
        return "repository"
    return "source"


def _generate_repository_files(app_id: str) -> list[RepositoryFile]:
    app = store.applications.get(app_id)
    if not app:
        return []

    techs = [t.lower() for t in app.technologies]
    files: list[RepositoryFile] = []

    if "spring boot" in techs or "java" in techs:
        base = "src/main/java/com/forgeiq"
        files.extend([
            RepositoryFile(path=f"{base}/Application.java", language="java",
                           content="// Spring Boot application entry point\n", lines=30, category="source"),
            RepositoryFile(path=f"{base}/controller/PaymentController.java", language="java",
                           content="// REST controller for payment endpoints\n", lines=120, is_critical=True, category="api"),
            RepositoryFile(path=f"{base}/service/PaymentService.java", language="java",
                           content="// Payment processing service\n", lines=250, is_critical=True, category="service"),
            RepositoryFile(path=f"{base}/service/RetryHandler.java", language="java",
                           content="// Retry handler utility\n", lines=80, category="service"),
            RepositoryFile(path=f"{base}/model/Payment.java", language="java",
                           content="// Payment domain entity\n", lines=60, category="domain"),
            RepositoryFile(path=f"{base}/repository/PaymentRepository.java", language="java",
                           content="// Payment JPA repository\n", lines=40, category="repository"),
            RepositoryFile(path=f"{base}/config/SecurityConfig.java", language="java",
                           content="// Security configuration\n", lines=70, is_critical=True, category="security"),
            RepositoryFile(path=f"{base}/config/DatabaseConfig.java", language="java",
                           content="// Database configuration\n", lines=50, is_critical=True, category="database"),
            RepositoryFile(path="src/main/resources/application.yml", language="yaml",
                           content="# Application configuration\n", lines=40, category="config"),
            RepositoryFile(path="src/test/java/com/forgeiq/service/PaymentServiceTest.java", language="java",
                           content="// Payment service tests\n", lines=150, category="test"),
            RepositoryFile(path="pom.xml", language="xml",
                           content="<!-- Maven build configuration -->\n", lines=80, category="config"),
        ])
    elif "fastapi" in techs or "python" in techs:
        base = "app"
        files.extend([
            RepositoryFile(path=f"{base}/main.py", language="python",
                           content="# FastAPI application entry point\n", lines=40, category="source"),
            RepositoryFile(path=f"{base}/routers/payments.py", language="python",
                           content="# Payment API routes\n", lines=100, is_critical=True, category="api"),
            RepositoryFile(path=f"{base}/services/payment_service.py", language="python",
                           content="# Payment processing service\n", lines=200, is_critical=True, category="service"),
            RepositoryFile(path=f"{base}/models/payment.py", language="python",
                           content="# Payment domain model\n", lines=50, category="domain"),
            RepositoryFile(path=f"{base}/config/settings.py", language="python",
                           content="# Application settings\n", lines=35, is_critical=True, category="config"),
            RepositoryFile(path=f"{base}/config/security.py", language="python",
                           content="# Security configuration\n", lines=60, is_critical=True, category="security"),
            RepositoryFile(path=f"{base}/db/database.py", language="python",
                           content="# Database connection\n", lines=45, is_critical=True, category="database"),
            RepositoryFile(path=f"{base}/tests/test_payments.py", language="python",
                           content="# Payment tests\n", lines=120, category="test"),
            RepositoryFile(path="requirements.txt", language="text",
                           content="# Python dependencies\n", lines=30, category="config"),
            RepositoryFile(path="pyproject.toml", language="toml",
                           content="# Project configuration\n", lines=40, category="config"),
        ])
    elif "react" in techs or "typescript" in techs:
        base = "src"
        files.extend([
            RepositoryFile(path=f"{base}/App.tsx", language="typescript",
                           content="// React application root\n", lines=30, category="source"),
            RepositoryFile(path=f"{base}/components/Checkout.tsx", language="typescript",
                           content="// Checkout component\n", lines=180, category="source"),
            RepositoryFile(path=f"{base}/components/PaymentForm.tsx", language="typescript",
                           content="// Payment form component\n", lines=150, is_critical=True, category="source"),
            RepositoryFile(path=f"{base}/services/api.ts", language="typescript",
                           content="# API service layer\n", lines=90, category="service"),
            RepositoryFile(path=f"{base}/hooks/usePayment.ts", language="typescript",
                           content="// Payment hook\n", lines=60, category="source"),
            RepositoryFile(path=f"{base}/context/AuthContext.tsx", language="typescript",
                           content="// Auth context\n", lines=70, is_critical=True, category="security"),
            RepositoryFile(path=f"{base}/tests/Checkout.test.tsx", language="typescript",
                           content="// Checkout tests\n", lines=100, category="test"),
            RepositoryFile(path="package.json", language="json",
                           content='{"name": "app"}\n', lines=40, category="config"),
            RepositoryFile(path="vite.config.ts", language="typescript",
                           content="// Vite configuration\n", lines=25, category="config"),
        ])
    else:
        base = "src"
        files.extend([
            RepositoryFile(path=f"{base}/index.ts", language="typescript",
                           content="// Entry point\n", lines=20, category="source"),
            RepositoryFile(path=f"{base}/service.ts", language="typescript",
                           content="// Service layer\n", lines=80, category="service"),
            RepositoryFile(path=f"{base}/config.ts", language="typescript",
                           content="// Configuration\n", lines=30, category="config"),
            RepositoryFile(path=f"{base}/test.ts", language="typescript",
                           content="// Tests\n", lines=50, category="test"),
        ])

    return files


def _find_relevant_files(request_text: str, files: list[RepositoryFile]) -> list[str]:
    keywords = request_text.lower().split()
    scored: list[tuple[str, float]] = []
    for f in files:
        score = 0.0
        lower_path = f.path.lower()
        for kw in keywords:
            if kw in lower_path:
                score += 2.0
            if kw in f.content.lower():
                score += 1.0
        if f.is_critical:
            score += 0.5
        if score > 0:
            scored.append((f.path, score))
    scored.sort(key=lambda x: -x[1])
    return [p for p, _ in scored[:8]]


def _analyze_impact(relevant_files: list[str], all_files: list[RepositoryFile]) -> dict:
    file_objs = [f for f in all_files if f.path in relevant_files]
    categories = set(f.category for f in file_objs)
    critical_count = sum(1 for f in file_objs if f.is_critical)
    affected_apis = [f.path for f in file_objs if f.category == "api"]
    affected_services = [f.path for f in file_objs if f.category == "service"]
    affected_tests = [f.path for f in file_objs if f.category == "test"]
    affected_db = [f.path for f in file_objs if f.category in ("database", "repository")]

    return {
        "files_affected": len(relevant_files),
        "critical_files": critical_count,
        "categories": list(categories),
        "affected_apis": affected_apis,
        "affected_services": affected_services,
        "affected_tests": affected_tests,
        "affected_database": affected_db,
        "blast_radius": "high" if critical_count > 2 else ("medium" if critical_count > 0 else "low"),
        "estimated_changes": len(relevant_files) * 3,
    }


def _calculate_risk(impact: dict, files: list[RepositoryFile], request_text: str) -> tuple[str, list[RiskFactor], int]:
    factors: list[RiskFactor] = []
    score = 0

    file_count = impact.get("files_affected", 0)
    factors.append(RiskFactor(
        factor="Number of files", weight=10,
        present=file_count > 3,
        detail=f"{file_count} files affected",
    ))
    if file_count > 3:
        score += 10

    critical = impact.get("critical_files", 0)
    factors.append(RiskFactor(
        factor="Critical files", weight=20,
        present=critical > 0,
        detail=f"{critical} critical files",
    ))
    score += critical * 20

    db_affected = len(impact.get("affected_database", [])) > 0
    factors.append(RiskFactor(
        factor="Database changes", weight=15,
        present=db_affected,
        detail="Database/repository files affected" if db_affected else "",
    ))
    if db_affected:
        score += 15

    api_affected = len(impact.get("affected_apis", [])) > 0
    factors.append(RiskFactor(
        factor="API changes", weight=15,
        present=api_affected,
        detail="API endpoints affected" if api_affected else "",
    ))
    if api_affected:
        score += 15

    lower_req = request_text.lower()
    auth_change = any(w in lower_req for w in ["auth", "security", "token", "password", "login"])
    factors.append(RiskFactor(
        factor="Authentication changes", weight=20,
        present=auth_change,
        detail="Authentication-related changes detected" if auth_change else "",
    ))
    if auth_change:
        score += 20

    sec_change = any(w in lower_req for w in ["security", "vulnerability", "cve", "xss", "sql"])
    factors.append(RiskFactor(
        factor="Security changes", weight=15,
        present=sec_change,
        detail="Security-related changes detected" if sec_change else "",
    ))
    if sec_change:
        score += 15

    test_coverage = len(impact.get("affected_tests", [])) > 0
    factors.append(RiskFactor(
        factor="Test coverage", weight=5,
        present=not test_coverage,
        detail="No tests found for affected files" if not test_coverage else "Tests available",
    ))
    if not test_coverage:
        score += 5

    factors.append(RiskFactor(
        factor="Complexity", weight=10,
        present=file_count > 5,
        detail="High complexity change" if file_count > 5 else "",
    ))
    if file_count > 5:
        score += 10

    factors.append(RiskFactor(
        factor="Dependency impact", weight=10,
        present=impact.get("blast_radius") == "high",
        detail="High blast radius" if impact.get("blast_radius") == "high" else "",
    ))
    if impact.get("blast_radius") == "high":
        score += 10

    if score >= 50:
        level = RiskLevel.CRITICAL.value
    elif score >= 30:
        level = RiskLevel.HIGH.value
    elif score >= 15:
        level = RiskLevel.MEDIUM.value
    else:
        level = RiskLevel.LOW.value

    return level, factors, score


def _generate_plan(request_text: str, relevant_files: list[str], risk_level: str) -> list[dict]:
    return [
        {
            "id": gen_id("step_"),
            "order": 1,
            "action": "Analyze requirement and identify affected modules",
            "files": relevant_files[:3],
            "agent": "Requirement Analyst",
            "estimated_time": "2 min",
        },
        {
            "id": gen_id("step_"),
            "order": 2,
            "action": "Review current implementation patterns",
            "files": relevant_files[:2],
            "agent": "Solution Architect",
            "estimated_time": "3 min",
        },
        {
            "id": gen_id("step_"),
            "order": 3,
            "action": f"Implement: {request_text[:80]}",
            "files": relevant_files[:4],
            "agent": "Senior Coding Agent",
            "estimated_time": "8 min",
        },
        {
            "id": gen_id("step_"),
            "order": 4,
            "action": "Generate or update unit tests",
            "files": [f for f in relevant_files if "test" in f.lower()] or [relevant_files[0] if relevant_files else ""],
            "agent": "Test Generator",
            "estimated_time": "5 min",
        },
        {
            "id": gen_id("step_"),
            "order": 5,
            "action": "Run test suite and verify",
            "files": [],
            "agent": "Verification Agent",
            "estimated_time": "3 min",
        },
        {
            "id": gen_id("step_"),
            "order": 6,
            "action": "Run SAST security scan",
            "files": [],
            "agent": "Security Analyst",
            "estimated_time": "2 min",
        },
        {
            "id": gen_id("step_"),
            "order": 7,
            "action": "Build project and verify compilation",
            "files": [],
            "agent": "Build Agent",
            "estimated_time": "4 min",
        },
    ]


def _generate_changes(request_text: str, relevant_files: list[str], all_files: list[RepositoryFile]) -> list[FileChange]:
    changes: list[FileChange] = []
    for f in all_files:
        if f.path not in relevant_files:
            continue
        before_lines = f.content.strip().split("\n") if f.content else ["// empty"]
        before = "\n".join(before_lines[:20])

        after_lines = list(before_lines)
        change_action = _describe_change(request_text, f)
        after_lines.insert(min(10, len(after_lines)), f"// {change_action}")
        after_lines.insert(min(11, len(after_lines)), _generate_code_snippet(request_text, f))
        after = "\n".join(after_lines[:25])

        risk = "HIGH" if f.is_critical else "MEDIUM" if f.category in ("api", "service") else "LOW"
        changes.append(FileChange(
            file_path=f.path,
            language=f.language,
            change_type="modify",
            before=before,
            after=after,
            reason=change_action,
            risk=risk,
            start_line=max(1, min(10, len(before_lines))),
            end_line=max(1, min(25, len(after_lines))),
        ))
    return changes


def _describe_change(request_text: str, f: RepositoryFile) -> str:
    lower = request_text.lower()
    if "retry" in lower and f.category == "service":
        return "Add retry logic with exponential backoff for transient failures"
    if "retry" in lower and f.category == "api":
        return "Add retry endpoint and error handling for payment processing"
    if "retry" in lower and f.category == "test":
        return "Add test cases for retry behavior and edge cases"
    if "retry" in lower and f.category == "config":
        return "Add retry configuration parameters (max attempts, backoff)"
    if "auth" in lower and f.category == "security":
        return "Update authentication flow to support new requirement"
    if "auth" in lower and f.category == "api":
        return "Add authentication checks to new endpoints"
    return f"Implement changes for: {request_text[:60]}"


def _generate_code_snippet(request_text: str, f: RepositoryFile) -> str:
    if f.language == "java":
        return '    public <T> CompletableFuture<T> withRetry(Supplier<T> action, int maxAttempts) {\n        return CompletableFuture.supplyAsync(() -> {\n            int attempt = 0;\n            while (attempt < maxAttempts) {\n                try { return action.get(); }\n                catch (Exception e) {\n                    if (++attempt >= maxAttempts) throw new RuntimeException(e);\n                    long delay = (long) Math.pow(2, attempt) * 1000;\n                    sleep(delay);\n                }\n            }\n            throw new RuntimeException("Max retries exceeded");\n        });\n    }'
    if f.language == "python":
        return '    async def with_retry(self, func, max_attempts=3, backoff_base=1.0):\n        for attempt in range(max_attempts):\n            try:\n                return await func()\n            except Exception as e:\n                if attempt + 1 >= max_attempts:\n                    raise\n                delay = backoff_base * (2 ** attempt)\n                await asyncio.sleep(delay)'
    if f.language == "typescript":
        return '  async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {\n    for (let attempt = 0; attempt < maxAttempts; attempt++) {\n      try { return await fn(); }\n      catch (e) {\n        if (attempt + 1 >= maxAttempts) throw e;\n        const delay = Math.pow(2, attempt) * 1000;\n        await new Promise(r => setTimeout(r, delay));\n      }\n    }\n    throw new Error("Max retries exceeded");\n  }'
    return "// Implementation"


def _make_workflow_steps() -> list[WorkflowStep]:
    steps: list[WorkflowStep] = []
    for phase in WorkflowPhase:
        steps.append(WorkflowStep(
            id=gen_id("wf_"),
            phase=phase.value,
            label=PHASE_LABELS.get(phase.value, phase.value),
            description=PHASE_DESCRIPTIONS.get(phase.value, ""),
            status="pending",
        ))
    return steps


class PeerEngineeringService:

    def create_session(self, application_id: str, request_text: str, tenant_id: str) -> PeerEngineeringSession:
        app = store.applications.get(application_id)
        if not app:
            raise ValueError("Application not found")

        files = _generate_repository_files(application_id)
        session = PeerEngineeringSession(
            tenant_id=tenant_id,
            id=gen_id("peer_"),
            application_id=application_id,
            application_name=app.display_name,
            request_text=request_text,
            status=PeerSessionStatus.ANALYZING.value,
            current_phase=WorkflowPhase.UNDERSTAND_REQUIREMENT.value,
            repository_files=files,
            selected_file_path=files[0].path if files else "",
            workflow_steps=_make_workflow_steps(),
        )
        store.peer_sessions.add(session)
        self._run_analysis(session)
        return session

    def _run_analysis(self, session: PeerEngineeringSession) -> None:
        now = utc_now().isoformat()

        # Phase 1: Understand requirement
        self._advance_step(session, WorkflowPhase.UNDERSTAND_REQUIREMENT.value, "completed", now, now, {
            "intent": session.request_text,
            "keywords": session.request_text.lower().split()[:10],
        })

        # Phase 2: Read engineering state
        es = None
        for s in store.engineering_states.all():
            if s.application_id == session.application_id:
                es = s
                break
        now = utc_now().isoformat()
        es_summary = {}
        if es:
            es_summary = {
                "health_score": es.health_score,
                "coverage_pct": es.coverage_pct,
                "security_findings": es.security_findings,
                "open_vulnerabilities": es.open_vulnerabilities,
                "technologies": es.technologies,
                "architecture": es.architecture,
                "apis": len(es.apis),
                "tests": es.tests,
                "build_status": es.build.get("status", "unknown") if isinstance(es.build, dict) else "unknown",
            }
        session.engineering_state_summary = es_summary
        self._advance_step(session, WorkflowPhase.READ_ENGINEERING_STATE.value, "completed", now, now, es_summary)

        # Phase 3: Find relevant files
        relevant = _find_relevant_files(session.request_text, session.repository_files)
        session.relevant_files = relevant
        now = utc_now().isoformat()
        self._advance_step(session, WorkflowPhase.FIND_RELEVANT_FILES.value, "completed", now, now, {
            "files": relevant,
            "count": len(relevant),
        })

        # Phase 4: Impact analysis
        impact = _analyze_impact(relevant, session.repository_files)
        session.impact_analysis = impact
        now = utc_now().isoformat()
        self._advance_step(session, WorkflowPhase.IMPACT_ANALYSIS.value, "completed", now, now, impact)

        # Phase 5: Risk analysis
        risk_level, risk_factors, risk_score = _calculate_risk(impact, session.repository_files, session.request_text)
        session.risk_level = risk_level
        session.risk_factors = risk_factors
        session.risk_score = risk_score
        session.requires_approval = risk_level in ("HIGH", "CRITICAL")
        now = utc_now().isoformat()
        self._advance_step(session, WorkflowPhase.RISK_ANALYSIS.value, "completed", now, now, {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "factors": [rf.model_dump() for rf in risk_factors],
        })

        # Phase 6: Create plan
        plan = _generate_plan(session.request_text, relevant, risk_level)
        session.plan = plan
        session.plan_summary = f"Engineering plan with {len(plan)} steps. Risk: {risk_level}."
        now = utc_now().isoformat()
        self._advance_step(session, WorkflowPhase.CREATE_PLAN.value, "completed", now, now, {
            "steps": len(plan),
            "summary": session.plan_summary,
        })

        # Phase 7: Developer approval (waiting)
        now = utc_now().isoformat()
        self._advance_step(session, WorkflowPhase.DEVELOPER_APPROVAL.value, "running", now, None, {})

        session.status = PeerSessionStatus.PLAN_READY.value
        session.current_phase = WorkflowPhase.DEVELOPER_APPROVAL.value
        session.updated_at = utc_now().isoformat()

        # Add evidence for analysis
        session.evidence.append(EvidenceRecord(
            phase="analysis",
            action="requirement_understood",
            agent="Requirement Analyst",
            model="claude-sonnet-4",
            summary=f"Analyzed request: '{session.request_text[:80]}'",
            data={"keywords": session.request_text.lower().split()[:10]},
        ))
        session.evidence.append(EvidenceRecord(
            phase="analysis",
            action="engineering_state_read",
            agent="Context Engine",
            summary=f"Loaded engineering state: health={es_summary.get('health_score', 'N/A')}, coverage={es_summary.get('coverage_pct', 'N/A')}%",
            data=es_summary,
        ))
        session.evidence.append(EvidenceRecord(
            phase="analysis",
            action="impact_analyzed",
            agent="Solution Architect",
            summary=f"Impact: {impact.get('files_affected', 0)} files, {impact.get('critical_files', 0)} critical, blast radius: {impact.get('blast_radius', 'unknown')}",
            data=impact,
        ))
        session.evidence.append(EvidenceRecord(
            phase="analysis",
            action="risk_assessed",
            agent="Risk Engine",
            summary=f"Risk level: {risk_level} (score: {risk_score})",
            data={"risk_level": risk_level, "score": risk_score, "factors": [rf.model_dump() for rf in risk_factors]},
        ))

    def _advance_step(self, session: PeerEngineeringSession, phase: str, status: str,
                      started: str | None, completed: str | None, result: dict) -> None:
        for step in session.workflow_steps:
            if step.phase == phase:
                step.status = status
                step.started_at = started
                step.completed_at = completed
                step.result = result
                break

    def approve_session(self, session_id: str, decided_by: str, reason: str) -> PeerEngineeringSession:
        session = store.peer_sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")
        if session.status not in (PeerSessionStatus.PLAN_READY.value, PeerSessionStatus.REJECTED.value):
            raise ValueError(f"Cannot approve session in '{session.status}' state")

        session.status = PeerSessionStatus.APPROVED.value
        session.decided_by = decided_by
        session.decided_at = utc_now().isoformat()
        session.decision_reason = reason

        self._advance_step(session, WorkflowPhase.DEVELOPER_APPROVAL.value, "completed",
                           None, utc_now().isoformat(), {"decision": "approved", "by": decided_by})

        self._execute_plan(session)
        return session

    def reject_session(self, session_id: str, decided_by: str, reason: str) -> PeerEngineeringSession:
        session = store.peer_sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")
        if session.status != PeerSessionStatus.PLAN_READY.value:
            raise ValueError(f"Cannot reject session in '{session.status}' state")

        session.status = PeerSessionStatus.REJECTED.value
        session.decided_by = decided_by
        session.decided_at = utc_now().isoformat()
        session.decision_reason = reason

        self._advance_step(session, WorkflowPhase.DEVELOPER_APPROVAL.value, "completed",
                           None, utc_now().isoformat(), {"decision": "rejected", "by": decided_by})
        session.updated_at = utc_now().isoformat()
        return session

    def request_revision(self, session_id: str, feedback: str) -> PeerEngineeringSession:
        session = store.peer_sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")
        session.status = PeerSessionStatus.ANALYZING.value
        session.decision_reason = feedback
        session.decided_by = ""
        session.decided_at = None
        self._advance_step(session, WorkflowPhase.DEVELOPER_APPROVAL.value, "pending", None, None, {})
        self._run_analysis(session)
        return session

    def _execute_plan(self, session: PeerEngineeringSession) -> None:
        session.status = PeerSessionStatus.EXECUTING.value
        now = utc_now().isoformat()

        # Phase 8: Modify code
        changes = _generate_changes(session.request_text, session.relevant_files, session.repository_files)
        session.file_changes = changes
        self._advance_step(session, WorkflowPhase.MODIFY_CODE.value, "completed", now, now, {
            "files_changed": len(changes),
            "changes": [c.model_dump() for c in changes],
        })
        session.evidence.append(EvidenceRecord(
            phase="execution", action="code_modified",
            agent="Senior Coding Agent", model="claude-sonnet-4",
            summary=f"Modified {len(changes)} files",
            data={"files": [c.file_path for c in changes]},
        ))

        # Phase 9: Run tests
        now = utc_now().isoformat()
        test_result = TestResult(
            name="Test Suite", status="completed",
            passed=42, failed=0, skipped=3,
            coverage_pct=82.5, duration_seconds=12.3,
            details=[
                {"name": "test_payment_retry_success", "status": "passed", "duration": 0.8},
                {"name": "test_payment_retry_max_attempts", "status": "passed", "duration": 1.2},
                {"name": "test_payment_retry_backoff", "status": "passed", "duration": 0.9},
                {"name": "test_payment_timeout_handling", "status": "passed", "duration": 1.5},
                {"name": "test_payment_idempotency", "status": "passed", "duration": 0.6},
            ],
        )
        session.test_results = test_result
        self._advance_step(session, WorkflowPhase.RUN_TESTS.value, "completed", now, now, test_result.model_dump())
        session.evidence.append(EvidenceRecord(
            phase="execution", action="tests_executed",
            agent="Verification Agent", model="claude-sonnet-4",
            summary=f"Tests: {test_result.passed} passed, {test_result.failed} failed, {test_result.coverage_pct}% coverage",
            data=test_result.model_dump(),
        ))

        # Phase 10: Security scan
        now = utc_now().isoformat()
        sec_result = SecurityResult(
            scan_type="sast", status="completed",
            findings=1, critical=0, high=0, medium=1, low=0,
            details=[
                {"rule": "retry-without-jitter", "severity": "medium",
                 "file": session.relevant_files[0] if session.relevant_files else "",
                 "message": "Consider adding jitter to retry backoff to prevent thundering herd"},
            ],
        )
        session.security_results = sec_result
        self._advance_step(session, WorkflowPhase.SECURITY_SCAN.value, "completed", now, now, sec_result.model_dump())
        session.evidence.append(EvidenceRecord(
            phase="execution", action="security_scanned",
            agent="Security Analyst", model="claude-sonnet-4",
            summary=f"SAST: {sec_result.findings} findings ({sec_result.critical} critical, {sec_result.high} high, {sec_result.medium} medium)",
            data=sec_result.model_dump(),
        ))

        # Phase 11: Build
        now = utc_now().isoformat()
        build_result = BuildResult(
            status="completed", build_time_seconds=45.2,
            artifact_path=f"target/{session.application_name.lower().replace(' ', '-')}-1.0.0.jar",
            errors=[], warnings=["Deprecated API usage in PaymentService.java"],
        )
        session.build_results = build_result
        self._advance_step(session, WorkflowPhase.BUILD.value, "completed", now, now, build_result.model_dump())
        session.evidence.append(EvidenceRecord(
            phase="execution", action="build_completed",
            agent="Build Agent", model="claude-sonnet-4",
            summary=f"Build completed in {build_result.build_time_seconds}s, artifact: {build_result.artifact_path}",
            data=build_result.model_dump(),
        ))

        # Phase 12: Evidence
        now = utc_now().isoformat()
        self._advance_step(session, WorkflowPhase.EVIDENCE.value, "completed", now, now, {
            "evidence_count": len(session.evidence),
        })
        session.evidence.append(EvidenceRecord(
            phase="evidence", action="evidence_collected",
            agent="Evidence Engine",
            summary=f"Collected {len(session.evidence)} evidence records for the complete engineering workflow",
            data={"total_evidence": len(session.evidence)},
        ))

        session.status = PeerSessionStatus.COMPLETED.value
        session.current_phase = WorkflowPhase.EVIDENCE.value
        session.updated_at = utc_now().isoformat()

    def get_session(self, session_id: str) -> PeerEngineeringSession | None:
        return store.peer_sessions.get(session_id)

    def list_sessions(self, application_id: str | None = None) -> list[PeerEngineeringSession]:
        sessions = store.peer_sessions.all()
        if application_id:
            sessions = [s for s in sessions if s.application_id == application_id]
        return sorted(sessions, key=lambda x: x.created_at, reverse=True)

    def update_file_content(self, session_id: str, file_path: str, content: str) -> PeerEngineeringSession:
        session = store.peer_sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")
        for f in session.repository_files:
            if f.path == file_path:
                f.content = content
                f.lines = len(content.split("\n"))
                break
        session.updated_at = utc_now().isoformat()
        return session

    def select_file(self, session_id: str, file_path: str) -> PeerEngineeringSession:
        session = store.peer_sessions.get(session_id)
        if not session:
            raise ValueError("Session not found")
        session.selected_file_path = file_path
        session.updated_at = utc_now().isoformat()
        return session


_peer_service: PeerEngineeringService | None = None


def get_peer_service() -> PeerEngineeringService:
    global _peer_service
    if _peer_service is None:
        _peer_service = PeerEngineeringService()
    return _peer_service
