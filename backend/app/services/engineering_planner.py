from __future__ import annotations

import re
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.application import Application, ApplicationType, Repository
from ..domain.models.engineering_plan import (
    EngineeringPlan, PlanStage, PlanStageType, PlanStageStatus,
)
from ..domain.models.base import gen_id, utc_now
from ..domain.models.requirement import Requirement, RequirementStatus, RequirementPriority


# Technology detection keywords -> canonical technology names
_TECH_PATTERNS: list[tuple[str, list[str]]] = [
    ("React", ["react", "jsx", "tsx", "frontend ui"]),
    ("TypeScript", ["typescript", "ts "]),
    ("JavaScript", ["javascript", "js ", "node"]),
    ("Node.js", ["node", "express", "npm"]),
    ("Python", ["python", "django", "flask"]),
    ("FastAPI", ["fastapi", "fast api"]),
    ("Java", ["java ", "jvm", "spring"]),
    ("Spring Boot", ["spring boot", "spring-boot", "springboot"]),
    ("PostgreSQL", ["postgres", "postgresql", "sql database"]),
    ("MySQL", ["mysql"]),
    ("Redis", ["redis", "cache"]),
    ("MongoDB", ["mongo", "nosql"]),
    ("Kafka", ["kafka", "event streaming"]),
    ("GraphQL", ["graphql"]),
    ("Vue", ["vue", "vuejs"]),
    ("Angular", ["angular"]),
    ("Kubernetes", ["kubernetes", "k8s"]),
    ("Docker", ["docker", "container"]),
]

# Architecture component patterns
_ARCH_PATTERNS: list[tuple[str, list[str]]] = [
    ("Product Catalog", ["catalog", "product", "inventory"]),
    ("Shopping Cart", ["cart", "basket"]),
    ("Checkout", ["checkout", "payment", "order"]),
    ("Authentication", ["auth", "login", "oauth", "oidc", "session"]),
    ("User Management", ["user", "profile", "account"]),
    ("API Gateway", ["api gateway", "gateway", "bff"]),
    ("Event System", ["event", "kafka", "message", "queue"]),
    ("Search", ["search", "elasticsearch", "index"]),
    ("Analytics", ["analytics", "dashboard", "metrics"]),
    ("Notification", ["notification", "email", "sms", "push", "slack"]),
    ("Real-time Feed", ["websocket", "real-time", "realtime", "stream"]),
    ("Payment Processing", ["payment", "billing", "stripe", "transaction"]),
]


class EngineeringPlanner:
    def __init__(self, tenant_id: str = "tenant_forgeiq") -> None:
        self.tenant_id = tenant_id

    def detect_technologies(self, text: str) -> list[str]:
        lower = text.lower()
        detected: list[str] = []
        for tech, patterns in _TECH_PATTERNS:
            if any(p in lower for p in patterns):
                if tech not in detected:
                    detected.append(tech)
        if not detected:
            detected = ["React", "TypeScript", "Node.js"]
        return detected

    def detect_architecture_components(self, text: str) -> list[str]:
        lower = text.lower()
        components: list[str] = []
        for component, patterns in _ARCH_PATTERNS:
            if any(p in lower for p in patterns):
                if component not in components:
                    components.append(component)
        if not components:
            components = ["Core API", "Data Layer", "Service Layer"]
        return components

    def assess_risk(self, text: str, technologies: list[str], components: list[str]) -> tuple[str, list[str]]:
        lower = text.lower()
        factors: list[str] = []
        risk = "MEDIUM"

        if any(k in lower for k in ["payment", "billing", "transaction"]):
            factors.append("Financial transactions involved")
            risk = "HIGH"
        if any(k in lower for k in ["auth", "oauth", "security", "credential"]):
            factors.append("Authentication/security sensitive")
            risk = "HIGH"
        if any(k in lower for k in ["production", "deploy", "migration"]):
            factors.append("Production deployment/migration")
            risk = "HIGH"
        if len(components) > 6:
            factors.append(f"High component count ({len(components)})")
            risk = "HIGH"
        if len(technologies) > 5:
            factors.append(f"Complex technology stack ({len(technologies)} technologies)")
        if any(k in lower for k in ["critical", "mission critical", "high availability"]):
            factors.append("Mission-critical requirement")
            risk = "CRITICAL"
        if not factors:
            factors.append("Standard complexity")
        return risk, factors

    def _find_harness_by_type(self, htype: str):
        for h in store.harnesses.all():
            if h.harness_type.value == htype and h.lifecycle.value == "published":
                return h
        for h in store.harnesses.all():
            if h.harness_type.value == htype:
                return h
        return None

    def _find_agents_for_stage(self, stage_type: PlanStageType) -> list[dict]:
        category_map = {
            PlanStageType.REQUIREMENT: "requirement",
            PlanStageType.ARCHITECTURE: "architecture",
            PlanStageType.DEVELOPMENT: "coding",
            PlanStageType.TESTING: "test_generation",
            PlanStageType.SECURITY: "security",
            PlanStageType.BUILD: "build",
            PlanStageType.RELEASE: "release_planning",
            PlanStageType.DEPLOYMENT: "deployment",
            PlanStageType.VERIFICATION: "verification",
        }
        target_cat = category_map.get(stage_type, "")
        agents = []
        for a in store.agents.all():
            if a.category.value == target_cat:
                agents.append({"id": a.id, "name": a.display_name})
        return agents

    def _find_skills_for_tech(self, technologies: list[str]) -> list[str]:
        skill_names: list[str] = []
        for s in store.skills.all():
            sname_lower = s.display_name.lower()
            for tech in technologies:
                if tech.lower() in sname_lower or sname_lower in tech.lower():
                    if s.display_name not in skill_names:
                        skill_names.append(s.display_name)
                    break
        return skill_names

    def _find_tools_for_stage(self, stage_type: PlanStageType) -> list[str]:
        tool_map = {
            PlanStageType.REQUIREMENT: ["Git"],
            PlanStageType.ARCHITECTURE: ["Git", "Filesystem"],
            PlanStageType.DEVELOPMENT: ["Git", "Filesystem", "Terminal", "npm", "Python"],
            PlanStageType.TESTING: ["pytest", "Jest", "Playwright", "npm"],
            PlanStageType.SECURITY: ["SAST Scanner", "Dependency Scanner"],
            PlanStageType.BUILD: ["Build Runner", "npm", "Maven"],
            PlanStageType.RELEASE: ["Git", "Jira"],
            PlanStageType.DEPLOYMENT: ["Kubernetes", "Deployment API"],
            PlanStageType.VERIFICATION: ["Kubernetes", "Observability API"],
        }
        names = tool_map.get(stage_type, [])
        result: list[str] = []
        for t in store.tools.all():
            if t.display_name in names and t.display_name not in result:
                result.append(t.display_name)
        return result

    def _build_stages(self, technologies: list[str], risk_level: str) -> list[PlanStage]:
        stage_defs = [
            (PlanStageType.REQUIREMENT, "Requirement Analysis", "development", False,
             "Analyze business requirement and produce engineering specification"),
            (PlanStageType.ARCHITECTURE, "Architecture Design", "development", False,
             "Design application architecture and technology selection"),
            (PlanStageType.DEVELOPMENT, "Code Implementation", "development", False,
             "Implement features with production-quality code"),
            (PlanStageType.TESTING, "Test Generation & Execution", "development", False,
             "Generate and run comprehensive test suites"),
            (PlanStageType.SECURITY, "Security Scanning", "development", False,
             "SAST, dependency scanning, and secret detection"),
            (PlanStageType.BUILD, "Build & Artifact Creation", "staging", False,
             "Build automation and artifact creation"),
            (PlanStageType.RELEASE, "Release Planning", "staging", risk_level in ("HIGH", "CRITICAL"),
             "Change impact analysis, versioning, and release notes"),
            (PlanStageType.DEPLOYMENT, "Deployment", "production", risk_level in ("HIGH", "CRITICAL"),
             "Production deployment with rollout strategy"),
            (PlanStageType.VERIFICATION, "Deployment Verification", "production", False,
             "Health checks, smoke tests, and production verification"),
        ]

        stages: list[PlanStage] = []
        for order, (stype, label, env, approval, desc) in enumerate(stage_defs):
            harness = self._find_harness_by_type(stype.value)
            agents = self._find_agents_for_stage(stype)
            skills = self._find_skills_for_tech(technologies) if stype in (
                PlanStageType.DEVELOPMENT, PlanStageType.TESTING, PlanStageType.ARCHITECTURE
            ) else []
            tools = self._find_tools_for_stage(stype)

            stage = PlanStage(
                stage_type=stype,
                label=label,
                harness_id=harness.id if harness else None,
                harness_name=harness.display_name if harness else "",
                agent_ids=[a["id"] for a in agents],
                agent_names=[a["name"] for a in agents],
                skill_names=skills,
                tool_names=tools,
                environment=env,
                approval_required=approval,
                description=desc,
                order=order,
            )
            stages.append(stage)
        return stages

    def _estimate_cost(self, stages: list[PlanStage]) -> tuple[int, int, int]:
        cost_per_stage = 800
        tokens_per_stage = 50000
        total_cost = len(stages) * cost_per_stage
        total_tokens = len(stages) * tokens_per_stage
        duration = len(stages) * 300
        return total_cost, total_tokens, duration

    def _build_recommended_pipeline(self, stages: list[PlanStage]) -> dict:
        return {
            "name": "greenfield-engineering-pipeline",
            "display_name": "Greenfield Engineering Pipeline",
            "stage_count": len(stages),
            "stage_types": [s.stage_type.value for s in stages],
            "approval_stages": [s.label for s in stages if s.approval_required],
        }

    def _build_recommended_harnesses(self, stages: list[PlanStage]) -> list[dict]:
        harnesses: list[dict] = []
        seen: set[str] = set()
        for s in stages:
            if s.harness_id and s.harness_id not in seen:
                h = store.harnesses.get(s.harness_id)
                if h:
                    harnesses.append({
                        "id": h.id,
                        "name": h.display_name,
                        "type": h.harness_type.value,
                        "environment": s.environment,
                    })
                    seen.add(s.harness_id)
        return harnesses

    def _build_repository_config(self, technologies: list[str], app_name: str) -> dict:
        return {
            "url": f"git@github.com:forgeiq/{app_name}.git",
            "branch": "main",
            "provider": "github",
            "default_branch": "main",
            "initialize": True,
            "technologies": technologies,
        }

    def _build_engineering_state_summary(self, technologies: list[str], components: list[str]) -> dict:
        return {
            "architecture_pattern": "microservices" if len(components) > 4 else "modular-monolith",
            "initial_technologies": technologies,
            "initial_components": components,
            "health_score": 1.0,
            "coverage_pct": 0.0,
            "security_findings": 0,
            "open_vulnerabilities": 0,
        }

    def create_plan(self, requirement_text: str, tenant_id: str = "tenant_forgeiq") -> EngineeringPlan:
        technologies = self.detect_technologies(requirement_text)
        components = self.detect_architecture_components(requirement_text)
        risk_level, risk_factors = self.assess_risk(requirement_text, technologies, components)
        stages = self._build_stages(technologies, risk_level)
        cost, tokens, duration = self._estimate_cost(stages)

        app_slug = requirement_text.lower()[:40].strip()
        app_slug = re.sub(r"[^a-z0-9]+", "-", app_slug).strip("-") or "new-application"
        app_name = " ".join(w.capitalize() for w in app_slug.split("-")[:5])

        plan = EngineeringPlan(
            tenant_id=tenant_id,
            id=gen_id("plan_"),
            application_id="",
            requirement_text=requirement_text,
            application_name=app_name,
            application_type="greenfield",
            technologies=technologies,
            architecture_summary=f"Architecture for {app_name} with {len(components)} components using {', '.join(technologies)}",
            architecture_components=components,
            repository_config=self._build_repository_config(technologies, app_slug),
            engineering_state_summary=self._build_engineering_state_summary(technologies, components),
            recommended_harnesses=self._build_recommended_harnesses(stages),
            recommended_pipeline=self._build_recommended_pipeline(stages),
            stages=stages,
            risk_level=risk_level,
            risk_factors=risk_factors,
            estimated_cost_cents=cost,
            estimated_tokens=tokens,
            estimated_duration_seconds=duration,
            status="draft",
            created_at=utc_now(),
        )
        return plan

    def approve_plan(self, plan: EngineeringPlan, decided_by: str = "Engineering Lead", reason: str = "") -> EngineeringPlan:
        plan.status = "approved"
        plan.decided_by = decided_by
        plan.decided_at = utc_now().isoformat()
        plan.decision_reason = reason

        for stage in plan.stages:
            stage.status = PlanStageStatus.APPROVED

        app = self._create_application_from_plan(plan)
        plan.application_id = app.id

        req = self._create_requirement_from_plan(plan, app.id)
        plan.requirement_id = req.id

        es = self._create_engineering_state_from_plan(plan, app.id)
        app.engineering_state_id = es.id

        return plan

    def _create_application_from_plan(self, plan: EngineeringPlan) -> Application:
        slug = plan.application_name.lower().replace(" ", "-")[:40]
        repo = Repository(
            url=plan.repository_config.get("url", f"git@github.com:forgeiq/{slug}.git"),
            branch=plan.repository_config.get("branch", "main"),
            provider=plan.repository_config.get("provider", "github"),
            default_branch=plan.repository_config.get("default_branch", "main"),
        )
        app = Application(
            tenant_id=plan.tenant_id,
            id=gen_id("app_"),
            name=slug,
            display_name=plan.application_name,
            description=plan.requirement_text,
            type=ApplicationType.GREENFIELD,
            technologies=plan.technologies,
            team="Platform Engineering",
            risk_level=plan.risk_level,
            current_version="0.1.0",
            repository=repo,
            created_at=utc_now(),
        )
        store.applications.add(app)
        return app

    def _create_requirement_from_plan(self, plan: EngineeringPlan, app_id: str) -> Requirement:
        priority = RequirementPriority.HIGH if plan.risk_level in ("HIGH", "CRITICAL") else RequirementPriority.MEDIUM
        req = Requirement(
            tenant_id=plan.tenant_id,
            id=gen_id("req_"),
            title=plan.requirement_text[:120],
            description=plan.requirement_text,
            application_id=app_id,
            status=RequirementStatus.ANALYZED,
            priority=priority,
            tags=["greenfield"] + plan.technologies[:3],
            acceptance_criteria=[
                "All pipeline stages pass",
                "Security scan shows no critical findings",
                "Test coverage meets minimum threshold",
                "Deployment verification succeeds",
            ],
            estimated_complexity="HIGH" if plan.risk_level in ("HIGH", "CRITICAL") else "MEDIUM",
            created_at=utc_now(),
        )
        store.requirements.add(req)
        app = store.applications.get(app_id)
        if app:
            app.requirement_ids.append(req.id)
        return req

    def _create_engineering_state_from_plan(self, plan: EngineeringPlan, app_id: str):
        from ..domain.models.engineering_state import EngineeringState
        es = EngineeringState(
            tenant_id=plan.tenant_id,
            id=gen_id("es_"),
            application_id=app_id,
            repository=plan.repository_config.get("url", ""),
            branch="main",
            commit="",
            version="0.1.0",
            architecture={
                "pattern": plan.engineering_state_summary.get("architecture_pattern", "microservices"),
                "components": plan.architecture_components,
            },
            technologies=plan.technologies,
            dependencies=[],
            apis=[],
            tests={"total": 0, "passed": 0, "failed": 0, "skipped": 0, "coverage_pct": 0.0},
            security={"sast_findings": 0, "dependency_vulnerabilities": 0},
            build={"status": "pending"},
            release={},
            deployment={"environment": "none"},
            known_issues=[],
            open_changes=[],
            health_score=1.0,
            coverage_pct=0.0,
            security_findings=0,
            open_vulnerabilities=0,
            last_updated=utc_now().isoformat(),
        )
        store.engineering_states.add(es)
        return es

    def reject_plan(self, plan: EngineeringPlan, decided_by: str = "Engineering Lead", reason: str = "") -> EngineeringPlan:
        plan.status = "rejected"
        plan.decided_by = decided_by
        plan.decided_at = utc_now().isoformat()
        plan.decision_reason = reason
        return plan

    def modify_stage(self, plan: EngineeringPlan, stage_id: str, modifications: dict) -> EngineeringPlan:
        for stage in plan.stages:
            if stage.id == stage_id:
                if "harness_id" in modifications:
                    stage.harness_id = modifications["harness_id"]
                    h = store.harnesses.get(modifications["harness_id"])
                    if h:
                        stage.harness_name = h.display_name
                if "approval_required" in modifications:
                    stage.approval_required = modifications["approval_required"]
                if "environment" in modifications:
                    stage.environment = modifications["environment"]
                if "description" in modifications:
                    stage.description = modifications["description"]
                stage.status = PlanStageStatus.MODIFIED
                break
        return plan


_engineering_planner_instance: Optional[EngineeringPlanner] = None


def get_planner(tenant_id: str = "tenant_forgeiq") -> EngineeringPlanner:
    global _engineering_planner_instance
    if _engineering_planner_instance is None:
        _engineering_planner_instance = EngineeringPlanner(tenant_id)
    return _engineering_planner_instance
