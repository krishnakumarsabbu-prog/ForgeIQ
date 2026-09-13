from __future__ import annotations

from datetime import datetime, timezone, timedelta

from .in_memory import store
from ..domain.models.base import gen_id, utc_now
from ..domain.models.tenant import Tenant, User, Role, Permission
from ..domain.models.application import Application, Repository, ApplicationType, ApplicationStatus
from ..domain.models.requirement import Requirement, RequirementStatus, RequirementPriority
from ..domain.models.agent import Agent, AgentVersion, AgentContract, AgentCategory
from ..domain.models.skill import Skill, SkillCategory
from ..domain.models.tool import Tool, ToolRisk
from ..domain.models.model_config import ModelConfiguration, ModelProvider
from ..domain.models.harness import (
    Harness, HarnessVersion, HarnessTemplate, HarnessTemplateVersion,
    HarnessType, HarnessLifecycle, TemplateInheritanceLevel,
)
from ..domain.models.graph import Graph, GraphNode, GraphEdge, GraphNodeType, GraphEdgeType, GraphMetadata, GraphVersion
from ..domain.models.loop import Loop, LoopType, LoopStep, LoopStepType, BackoffStrategy, FailureHandling, EscalationType
from ..runtime.loop_engine import LoopEngine
from ..domain.models.pipeline import (
    Pipeline, PipelineStage, PipelineStageType, StageConfig, FailureStrategy,
    PipelineTemplate, PipelineTemplateVersion,
)
from ..domain.models.execution import Execution, ExecutionEvent, EventType, Approval
from ..domain.models.policy import Policy, PolicyType, PolicyScope
from ..domain.models.evidence import Evidence, EvidenceType
from ..domain.models.engineering_state import EngineeringState, EngineeringDecision, StateChangeRecord
from ..domain.models.deployment import Environment, EnvironmentType, Artifact, Deployment
from ..domain.models.semantic import SemanticEntity, SemanticEntityType


TENANT_ID = "tenant_forgeiq"
TENANT_NAME = "ForgeIQ Enterprise"


def _ts(minutes_ago: int = 0) -> str:
    return (utc_now() - timedelta(minutes=minutes_ago)).isoformat()


def seed_all() -> None:
    _seed_tenant_and_users()
    _seed_models()
    _seed_skills()
    _seed_tools()
    _seed_agents()
    _seed_applications()
    _seed_requirements()
    _seed_graphs()
    _seed_loops()
    _seed_harnesses()
    _seed_harness_templates()
    _seed_pipelines()
    _seed_pipeline_templates()
    _seed_policies()
    _seed_environments()
    _seed_artifacts()
    _seed_executions()
    _seed_evidence()
    _seed_engineering_state()
    _seed_state_history()
    _seed_deployments()
    _seed_semantic_entities()


def _seed_tenant_and_users() -> None:
    tenant = Tenant(
        id=TENANT_ID,
        name=TENANT_NAME,
        display_name="ForgeIQ Enterprise",
        plan="enterprise",
        active=True,
        settings={"max_agents": 100, "max_pipelines": 50},
        created_at=_ts(14400),
    )
    store.tenants.add(tenant)

    users_data = [
        ("admin@forgeiq.io", "Sarah Chen", Role.TENANT_ADMIN),
        ("lead@forgeiq.io", "Marcus Rivera", Role.ENGINEERING_LEAD),
        ("dev@forgeiq.io", "Priya Nair", Role.DEVELOPER),
        ("sec@forgeiq.io", "James O'Brien", Role.SECURITY_ENGINEER),
        ("release@forgeiq.io", "Yuki Tanaka", Role.RELEASE_MANAGER),
        ("ops@forgeiq.io", "Dmitri Volkov", Role.OPERATOR),
        ("audit@forgeiq.io", "Helena Park", Role.AUDITOR),
    ]
    for email, name, role in users_data:
        u = User(
            tenant_id=TENANT_ID,
            id=gen_id("user_"),
            email=email,
            display_name=name,
            role=role,
            active=True,
            created_at=_ts(10000),
        )
        u.permissions = [Permission(resource="*", actions=["read"])]
        store.users.add(u)


def _seed_models() -> None:
    models = [
        # Anthropic
        ("Claude Sonnet 4", ModelProvider.ANTHROPIC, "claude-sonnet-4-20250514", 200000, 8192, 3.0, 15.0, 800, 0.7, ["text", "code", "vision", "tool_use", "structured_output"], None, "available", True),
        ("Claude Opus 4", ModelProvider.ANTHROPIC, "claude-opus-4-20250514", 200000, 8192, 15.0, 75.0, 1200, 0.7, ["text", "code", "vision", "tool_use", "structured_output"], None, "available", False),
        ("Claude Haiku", ModelProvider.ANTHROPIC, "claude-haiku-4-20250506", 200000, 8192, 0.25, 1.25, 400, 0.7, ["text", "code", "tool_use"], "claude-sonnet-4", "available", True),
        # OpenAI
        ("GPT-4o", ModelProvider.OPENAI, "gpt-4o-2024-11-20", 128000, 16384, 2.5, 10.0, 600, 0.7, ["text", "code", "vision", "tool_use", "structured_output"], None, "available", True),
        ("GPT-4o mini", ModelProvider.OPENAI, "gpt-4o-mini-2024-07-18", 128000, 16384, 0.15, 0.60, 300, 0.7, ["text", "code", "tool_use", "structured_output"], "gpt-4o", "available", True),
        ("o3-mini", ModelProvider.OPENAI, "o3-mini-2025-01-31", 200000, 100000, 1.1, 4.4, 1500, 0.7, ["text", "code", "reasoning", "tool_use"], None, "available", True),
        # Google
        ("Gemini 2.5 Pro", ModelProvider.GOOGLE, "gemini-2.5-pro-20250325", 1000000, 8192, 1.25, 5.0, 700, 0.7, ["text", "code", "vision", "audio", "tool_use", "structured_output"], None, "available", True),
        ("Gemini 2.5 Flash", ModelProvider.GOOGLE, "gemini-2.5-flash-20250325", 1000000, 8192, 0.075, 0.30, 200, 0.7, ["text", "code", "vision", "tool_use", "structured_output"], "gemini-2.5-pro", "available", True),
        # Azure
        ("GPT-4o (Azure)", ModelProvider.AZURE, "gpt-4o-azure-deploy", 128000, 16384, 2.5, 10.0, 650, 0.7, ["text", "code", "vision", "tool_use", "structured_output"], None, "available", False),
        # Enterprise Custom
        ("ForgeIQ Enterprise Model", ModelProvider.ENTERPRISE, "forgeiq-ent-v2", 256000, 8192, 0.0, 0.0, 900, 0.5, ["text", "code", "tool_use", "structured_output"], "claude-sonnet-4", "restricted", True),
        # Local
        ("Llama 3.1 70B (Local)", ModelProvider.LOCAL, "llama-3.1-70b", 128000, 4096, 0.0, 0.0, 2000, 0.5, ["text", "code"], None, "available", True),
        ("CodeLlama 34B (Local)", ModelProvider.LOCAL, "codellama-34b", 16384, 4096, 0.0, 0.0, 1500, 0.2, ["code"], None, "available", True),
    ]
    model_name_map: dict[str, str] = {}
    for name, provider, model, ctx, tok, ci, co, lat, temp, caps, fallback, avail, active in models:
        slug = name.lower().replace(" ", "-")
        m = ModelConfiguration(
            tenant_id=TENANT_ID,
            id=gen_id("model_"),
            name=slug,
            display_name=name,
            provider=provider,
            model=model,
            context_size=ctx,
            token_limit=tok,
            cost_per_1k_input_cents=ci,
            cost_per_1k_output_cents=co,
            latency_ms=lat,
            temperature=temp,
            capabilities=caps,
            fallback_model_id=fallback,
            availability=avail,
            tenant_restricted=(provider == ModelProvider.ENTERPRISE),
            tenant_restrictions=["enterprise-only"] if provider == ModelProvider.ENTERPRISE else [],
            active=active,
            created_at=_ts(8000),
        )
        store.models.add(m)
        model_name_map[slug] = m.id

    # Set fallback model IDs by name lookup
    for m in store.models.all():
        if m.fallback_model_id and m.fallback_model_id in model_name_map:
            m.fallback_model_id = model_name_map[m.fallback_model_id]


def _seed_skills() -> None:
    skills_data = [
        # Frontend
        ("React", SkillCategory.FRONTEND, "React component development with hooks and modern patterns", "JavaScript", "React"),
        ("React TypeScript", SkillCategory.FRONTEND, "React 19 with TypeScript, hooks, and modern patterns", "TypeScript", "React"),
        ("Angular", SkillCategory.FRONTEND, "Angular application development with modules and services", "TypeScript", "Angular"),
        ("Vue", SkillCategory.FRONTEND, "Vue.js application development with composition API", "JavaScript", "Vue"),
        ("HTML/CSS", SkillCategory.FRONTEND, "Semantic HTML and modern CSS with responsive design", "HTML", "CSS"),
        ("Accessibility", SkillCategory.FRONTEND, "WCAG compliance, ARIA patterns, and accessibility auditing", "Multi", "WCAG"),
        ("Frontend Testing", SkillCategory.FRONTEND, "Frontend component and integration testing", "TypeScript", "Testing Library"),
        # Backend
        ("Python", SkillCategory.BACKEND, "Python application development and scripting", "Python", ""),
        ("FastAPI", SkillCategory.BACKEND, "Python FastAPI service development", "Python", "FastAPI"),
        ("Java", SkillCategory.BACKEND, "Java application development with modern patterns", "Java", ""),
        ("Spring Boot", SkillCategory.BACKEND, "Java Spring Boot application development and configuration", "Java", "Spring Boot"),
        ("Node.js", SkillCategory.BACKEND, "Node.js server-side development", "JavaScript", "Node.js"),
        ("REST", SkillCategory.BACKEND, "REST API design, implementation, and documentation", "Multi", "OpenAPI"),
        ("GraphQL", SkillCategory.BACKEND, "GraphQL schema design and resolver implementation", "Multi", "GraphQL"),
        # Testing
        ("JUnit", SkillCategory.TESTING, "Java unit testing with JUnit 5 and Mockito", "Java", "JUnit"),
        ("pytest", SkillCategory.TESTING, "Python testing with pytest and fixtures", "Python", "pytest"),
        ("Jest", SkillCategory.TESTING, "JavaScript and TypeScript unit testing with Jest", "TypeScript", "Jest"),
        ("Playwright", SkillCategory.TESTING, "End-to-end browser testing with Playwright", "TypeScript", "Playwright"),
        ("Cypress", SkillCategory.TESTING, "End-to-end browser testing with Cypress", "JavaScript", "Cypress"),
        ("API Testing", SkillCategory.TESTING, "REST API contract testing and validation", "Python", "httpx"),
        ("Integration Testing", SkillCategory.TESTING, "Service integration testing with real dependencies", "Multi", ""),
        ("Regression Testing", SkillCategory.TESTING, "Regression test suite management and execution", "Multi", ""),
        # Engineering
        ("Git", SkillCategory.ENGINEERING, "Git version control operations and branch management", "Git", ""),
        ("GitHub", SkillCategory.ENGINEERING, "GitHub repository operations, PRs, and code review workflows", "Multi", "GitHub"),
        ("GitLab", SkillCategory.ENGINEERING, "GitLab CI/CD pipeline configuration and repository management", "Multi", "GitLab"),
        ("Branch Management", SkillCategory.ENGINEERING, "Git branch strategy and merge conflict resolution", "Git", ""),
        ("Code Review", SkillCategory.ENGINEERING, "Automated code review with best practices enforcement", "Multi", ""),
        ("Refactoring", SkillCategory.ENGINEERING, "Code refactoring for maintainability and testability", "Multi", ""),
        ("Debugging", SkillCategory.ENGINEERING, "Systematic debugging and fault isolation", "Multi", ""),
        # Security
        ("SAST", SkillCategory.SECURITY, "Static application security testing and vulnerability detection", "Multi", "Semgrep"),
        ("SCA", SkillCategory.SECURITY, "Software composition analysis and dependency vulnerability scanning", "Multi", "OWASP"),
        ("Dependency Analysis", SkillCategory.SECURITY, "Dependency vulnerability analysis and remediation guidance", "Multi", "OWASP"),
        ("Secret Detection", SkillCategory.SECURITY, "Detection of hardcoded secrets and credentials in source code", "Multi", "TruffleHog"),
        ("Vulnerability Remediation", SkillCategory.SECURITY, "Implementation of fixes for identified security vulnerabilities", "Multi", ""),
        ("Security Review", SkillCategory.SECURITY, "Security architecture review and threat modeling", "Multi", ""),
        # Delivery
        ("Build Automation", SkillCategory.DELIVERY, "Build pipeline configuration and optimization", "Multi", ""),
        ("Artifact Management", SkillCategory.DELIVERY, "Artifact repository management and versioning", "Multi", ""),
        ("Release Management", SkillCategory.DELIVERY, "Release planning, versioning, and changelog generation", "Multi", ""),
        ("Deployment", SkillCategory.DELIVERY, "Application deployment with rollout strategies", "Multi", ""),
        ("Kubernetes", SkillCategory.DELIVERY, "Kubernetes deployment and rollout management", "YAML", "kubectl"),
        ("Cloud Deployment", SkillCategory.DELIVERY, "Cloud infrastructure deployment and management", "Multi", "Terraform"),
        ("Environment Validation", SkillCategory.DELIVERY, "Environment readiness validation and health checks", "Multi", ""),
        # Operations
        ("Observability", SkillCategory.OPERATIONS, "Metrics, logs, and traces analysis with OpenTelemetry", "Multi", "OpenTelemetry"),
        ("Incident Analysis", SkillCategory.OPERATIONS, "Production incident analysis and root cause identification", "Multi", ""),
        ("Root Cause Analysis", SkillCategory.OPERATIONS, "Systematic root cause analysis using 5-whys and fishbone", "Multi", ""),
        ("Remediation", SkillCategory.OPERATIONS, "Incident remediation with fix implementation and verification", "Multi", ""),
        ("Rollback", SkillCategory.OPERATIONS, "Deployment rollback execution and verification", "Multi", ""),
        ("Production Verification", SkillCategory.OPERATIONS, "Post-deployment production verification and smoke testing", "Multi", ""),
    ]
    for name, cat, desc, lang, fw in skills_data:
        s = Skill(
            tenant_id=TENANT_ID,
            id=gen_id("skill_"),
            name=name.lower().replace(" ", "-"),
            display_name=name,
            category=cat,
            description=desc,
            language=lang,
            framework=fw,
            capabilities=["code_generation", "analysis", "validation"] if cat in (SkillCategory.FRONTEND, SkillCategory.BACKEND) else ["analysis", "validation"],
            active=True,
            created_at=_ts(7000),
        )
        store.skills.add(s)


def _seed_tools() -> None:
    tools_data = [
        ("Git", "Git version control operations", ToolRisk.LOW, ["clone", "checkout", "status", "diff", "log", "commit"], ["development", "staging", "production"], "vcs",
         {"repository": "string", "branch": "string", "operation": "string"}, {"success": "boolean", "output": "string", "files_changed": "array"}),
        ("Filesystem", "File read/write operations", ToolRisk.MEDIUM, ["read", "write", "list", "search"], ["development"], "filesystem",
         {"path": "string", "operation": "string", "content": "string?"}, {"success": "boolean", "content": "string?", "files": "array?"}),
        ("Terminal", "Shell command execution", ToolRisk.HIGH, ["execute"], ["development", "staging"], "shell",
         {"command": "string", "timeout": "integer"}, {"exit_code": "integer", "stdout": "string", "stderr": "string"}),
        ("Shell", "Shell script execution with environment control", ToolRisk.HIGH, ["execute", "script"], ["development", "staging"], "shell",
         {"script": "string", "env": "object"}, {"exit_code": "integer", "stdout": "string", "stderr": "string"}),
        ("npm", "Node.js package manager", ToolRisk.MEDIUM, ["install", "test", "run", "build"], ["development", "staging"], "package",
         {"command": "string", "args": "array"}, {"exit_code": "integer", "output": "string"}),
        ("Python", "Python runtime", ToolRisk.MEDIUM, ["execute", "pip", "pytest"], ["development", "staging"], "runtime",
         {"command": "string", "args": "array"}, {"exit_code": "integer", "output": "string"}),
        ("Maven", "Java build tool", ToolRisk.MEDIUM, ["compile", "test", "package", "verify"], ["development", "staging"], "build",
         {"goal": "string", "profile": "string?"}, {"exit_code": "integer", "output": "string", "artifact_path": "string?"}),
        ("Gradle", "Gradle build tool", ToolRisk.MEDIUM, ["build", "test", "bootJar"], ["development", "staging"], "build",
         {"task": "string", "args": "array"}, {"exit_code": "integer", "output": "string"}),
        ("pytest", "Python test runner", ToolRisk.LOW, ["run", "collect", "report"], ["development", "staging"], "testing",
         {"test_path": "string", "options": "array"}, {"passed": "integer", "failed": "integer", "skipped": "integer", "report": "string"}),
        ("JUnit", "Java test runner", ToolRisk.LOW, ["run", "report"], ["development", "staging"], "testing",
         {"test_class": "string"}, {"passed": "integer", "failed": "integer", "report": "string"}),
        ("Jest", "JavaScript test runner", ToolRisk.LOW, ["run", "watch", "coverage"], ["development", "staging"], "testing",
         {"test_path": "string", "options": "array"}, {"passed": "integer", "failed": "integer", "coverage_pct": "number"}),
        ("Playwright", "E2E browser test runner", ToolRisk.LOW, ["run", "debug", "report"], ["development", "staging"], "testing",
         {"spec": "string", "browser": "string"}, {"passed": "integer", "failed": "integer", "screenshots": "array"}),
        ("Build Runner", "Generic build automation runner", ToolRisk.MEDIUM, ["build", "package", "publish"], ["development", "staging"], "build",
         {"project": "string", "target": "string"}, {"exit_code": "integer", "artifact_path": "string"}),
        ("SAST Scanner", "Static application security testing scanner", ToolRisk.LOW, ["scan", "report"], ["development", "staging", "production"], "security",
         {"target_path": "string", "rules": "array?"}, {"findings": "array", "severity_counts": "object", "report": "string"}),
        ("Dependency Scanner", "Dependency vulnerability scanner", ToolRisk.LOW, ["scan", "audit"], ["development", "staging"], "security",
         {"project_path": "string"}, {"vulnerabilities": "array", "severity_counts": "object", "report": "string"}),
        ("Artifact Repository", "Artifact storage and retrieval", ToolRisk.MEDIUM, ["push", "pull", "list", "delete"], ["development", "staging", "production"], "delivery",
         {"artifact": "string", "version": "string"}, {"success": "boolean", "url": "string"}),
        ("Deployment API", "Cloud deployment API", ToolRisk.HIGH, ["deploy", "status", "rollback"], ["staging", "production"], "delivery",
         {"service": "string", "version": "string", "environment": "string"}, {"deployment_id": "string", "status": "string"}),
        ("Kubernetes", "Kubernetes cluster operations", ToolRisk.CRITICAL, ["apply", "rollout", "scale", "delete", "logs"], ["staging", "production"], "orchestration",
         {"resource": "string", "operation": "string", "namespace": "string"}, {"success": "boolean", "resources": "array"}),
        ("Cloud API", "Cloud provider API operations", ToolRisk.HIGH, ["create", "update", "delete", "list"], ["staging", "production"], "cloud",
         {"service": "string", "operation": "string", "params": "object"}, {"success": "boolean", "resource_id": "string?"}),
        ("Observability API", "Metrics, logs, and traces query API", ToolRisk.LOW, ["query", "metrics", "logs", "traces"], ["development", "staging", "production"], "operations",
         {"query": "string", "time_range": "string"}, {"results": "array", "metrics": "object"}),
        ("Jira", "Issue tracking integration", ToolRisk.LOW, ["create", "update", "transition", "search"], ["development"], "integration",
         {"issue_key": "string?", "operation": "string", "fields": "object"}, {"issue_key": "string", "status": "string"}),
        ("Documentation", "Documentation generation and publishing", ToolRisk.LOW, ["generate", "publish", "update"], ["development", "staging"], "integration",
         {"source": "string", "format": "string"}, {"url": "string", "pages": "integer"}),
        ("Slack", "Notification messaging integration", ToolRisk.LOW, ["post", "update", "schedule"], ["development", "staging", "production"], "notification",
         {"channel": "string", "message": "string"}, {"success": "boolean", "timestamp": "string"}),
    ]
    for name, desc, risk, ops, envs, cat, inputs, outputs in tools_data:
        t = Tool(
            tenant_id=TENANT_ID,
            id=gen_id("tool_"),
            name=name.lower().replace(" ", "-"),
            display_name=name,
            description=desc,
            risk_level=risk,
            allowed_operations=ops,
            supported_environments=envs,
            permissions=[f"tool:{name.lower().replace(' ', '_')}:execute"],
            category=cat,
            inputs_schema={"type": "object", "properties": inputs},
            outputs_schema={"type": "object", "properties": outputs},
            active=True,
            created_at=_ts(7000),
        )
        store.tools.add(t)


def _seed_agents() -> None:
    skills = {s.name: s.id for s in store.skills.all()}
    tools = {t.name: t.id for t in store.tools.all()}
    models_by_name = {m.name: m.id for m in store.models.all()}
    models_by_model = {m.model: m.id for m in store.models.all()}

    agents_data = [
        ("Requirement Analyst", AgentCategory.REQUIREMENT, "Analyzes business requirements and produces engineering specifications", "Requirement Agent", "claude-sonnet-4", ["react-typescript", "spring-boot"], ["git"], 15, 600, 200000),
        ("Product Analyst", AgentCategory.PRODUCT_ANALYSIS, "Performs product analysis and user story decomposition", "Product Analysis Agent", "claude-sonnet-4", ["react-typescript"], ["git"], 10, 300, 150000),
        ("Solution Architect", AgentCategory.ARCHITECTURE, "Designs application architecture and technology selection", "Architecture Agent", "claude-sonnet-4", ["react-typescript", "spring-boot", "fastapi"], ["git", "filesystem"], 20, 900, 300000),
        ("Senior Coding Agent", AgentCategory.CODING, "Implements features and fixes with production-quality code", "Coding Agent", "claude-sonnet-4", ["react-typescript", "fastapi", "spring-boot"], ["git", "filesystem", "terminal", "npm", "python"], 25, 1800, 500000),
        ("Code Reviewer", AgentCategory.CODE_REVIEW, "Reviews code changes for quality, security, and best practices", "Code Review Agent", "claude-sonnet-4", ["code-review", "refactoring"], ["git"], 15, 600, 200000),
        ("Test Generator", AgentCategory.TEST_GENERATION, "Generates comprehensive test suites for new and existing code", "Test Agent", "claude-sonnet-4", ["pytest", "junit", "playwright", "api-testing"], ["python", "npm"], 20, 900, 300000),
        ("Security Analyst", AgentCategory.SECURITY, "Performs security analysis and vulnerability assessment", "Security Agent", "claude-sonnet-4", ["sast", "dependency-analysis", "secret-detection"], ["sast-scanner", "dependency-scanner"], 15, 600, 200000),
        ("Build Engineer", AgentCategory.BUILD, "Manages build automation and artifact creation", "Build Agent", "gpt-4o", ["build-automation"], ["build-runner", "npm", "maven", "gradle"], 10, 600, 100000),
        ("Release Planner", AgentCategory.RELEASE_PLANNING, "Plans releases with change impact analysis and versioning", "Release Agent", "claude-sonnet-4", ["git", "release-management"], ["git", "jira"], 10, 300, 100000),
        ("Release Notes Writer", AgentCategory.RELEASE_NOTES, "Generates comprehensive release notes from evidence", "Release Notes Agent", "claude-sonnet-4", [], [], 5, 300, 50000),
        ("Deployment Engineer", AgentCategory.DEPLOYMENT, "Executes deployments with rollout strategies", "Deployment Agent", "gpt-4o", ["kubernetes", "deployment"], ["kubernetes", "deployment-api"], 10, 900, 100000),
        ("Verification Agent", AgentCategory.VERIFICATION, "Verifies deployments through health checks and smoke tests", "Verification Agent", "gpt-4o-mini", ["production-verification"], [], 10, 300, 50000),
        ("Incident Analyst", AgentCategory.INCIDENT_ANALYSIS, "Analyzes production incidents and identifies root causes", "Incident Agent", "claude-sonnet-4", ["incident-analysis", "observability"], ["terminal", "observability-api"], 15, 600, 200000),
        ("Root Cause Analyst", AgentCategory.ROOT_CAUSE, "Performs systematic root cause analysis", "RCA Agent", "claude-sonnet-4", ["root-cause-analysis"], [], 15, 600, 200000),
        ("Remediation Agent", AgentCategory.REMEDIATION, "Implements fixes for identified issues and incidents", "Remediation Agent", "claude-sonnet-4", ["remediation", "rollback"], [], 20, 1800, 500000),
    ]

    for name, cat, purpose, role, model_key, skill_names, tool_names, max_turns, timeout, token_budget in agents_data:
        skill_ids = [skills[sn] for sn in skill_names if sn in skills]
        tool_ids = [tools[tn] for tn in tool_names if tn in tools]
        model_id = models_by_name.get(model_key) or models_by_model.get(model_key)

        contract = AgentContract(
            skill_ids=skill_ids,
            tool_ids=tool_ids,
            model_config_id=model_id,
            max_turns=max_turns,
            timeout_seconds=timeout,
            token_budget=token_budget,
            permissions=[f"agent:{name.lower().replace(' ', '-')}:execute"],
        )

        a = Agent(
            tenant_id=TENANT_ID,
            id=gen_id("agent_"),
            name=name.lower().replace(" ", "-"),
            display_name=name,
            category=cat,
            purpose=purpose,
            role=role,
            model_config_id=model_id,
            skill_ids=skill_ids,
            tool_ids=tool_ids,
            max_turns=max_turns,
            timeout_seconds=timeout,
            token_budget=token_budget,
            contract=contract,
            system_instructions=f"You are a {name}. {purpose} Always produce evidence of your work.",
            published=True,
            current_version="v1",
            created_at=_ts(6000),
        )

        v1 = AgentVersion(
            tenant_id=TENANT_ID,
            id=gen_id("aver_"),
            agent_id=a.id,
            version="v1",
            published=True,
            is_default=True,
            contract=contract,
            system_instructions=a.system_instructions,
            changelog="Initial version",
            created_at=_ts(6000),
        )
        a.versions = [v1]

        v2 = AgentVersion(
            tenant_id=TENANT_ID,
            id=gen_id("aver_"),
            agent_id=a.id,
            version="v2",
            published=True,
            is_default=False,
            contract=contract,
            system_instructions=a.system_instructions + " Improved context handling.",
            changelog="Enhanced context window utilization and reduced hallucination rate",
            created_at=_ts(3000),
        )
        a.versions.append(v2)

        if cat in (AgentCategory.CODING, AgentCategory.SECURITY, AgentCategory.CODE_REVIEW):
            v3 = AgentVersion(
                tenant_id=TENANT_ID,
                id=gen_id("aver_"),
                agent_id=a.id,
                version="v3",
                published=False,
                is_default=False,
                contract=contract,
                system_instructions=a.system_instructions + " Added multi-file coordination.",
                changelog="Multi-file coordination and dependency-aware changes",
                created_at=_ts(500),
            )
            a.versions.append(v3)
            a.current_version = "v2"

        store.agents.add(a)


def _seed_applications() -> None:
    apps_data = [
        ("E-Commerce Platform", "ecommerce-platform", "React 19 + Spring Boot e-commerce with catalog, cart, checkout, and auth", ApplicationType.GREENFIELD, ["React", "TypeScript", "Spring Boot", "PostgreSQL", "Redis"], "Platform Engineering", "2.4.1", "MEDIUM"),
        ("Payment Gateway", "payment-gateway", "High-throughput payment processing service with idempotency and retry", ApplicationType.BROWNFIELD, ["Java", "Spring Boot", "Kafka", "PostgreSQL"], "Payments Team", "5.1.0", "HIGH"),
        ("Inventory Service", "inventory-service", "Real-time inventory management with event sourcing", ApplicationType.BROWNFIELD, ["Python", "FastAPI", "PostgreSQL", "Redis"], "Supply Chain", "1.8.3", "MEDIUM"),
        ("User Auth Service", "user-auth-service", "OAuth2/OIDC authentication and authorization service", ApplicationType.BROWNFIELD, ["Java", "Spring Boot", "PostgreSQL", "Redis"], "Identity Team", "3.2.0", "CRITICAL"),
        ("Analytics Dashboard", "analytics-dashboard", "Real-time analytics dashboard with ECharts and WebSocket feeds", ApplicationType.GREENFIELD, ["React", "TypeScript", "Node.js", "PostgreSQL"], "Data Platform", "1.0.0", "LOW"),
        ("Notification Hub", "notification-hub", "Multi-channel notification delivery (email, SMS, push, Slack)", ApplicationType.BROWNFIELD, ["Python", "FastAPI", "Redis", "RabbitMQ"], "Platform Engineering", "2.0.1", "MEDIUM"),
    ]
    for name, slug, desc, app_type, techs, team, version, risk in apps_data:
        repo = None
        if app_type == ApplicationType.BROWNFIELD:
            repo = Repository(
                url=f"git@github.com:forgeiq/{slug}.git",
                branch="main",
                provider="github",
                default_branch="main",
                discovered=True,
                semantic_model_built=True,
            )
        app = Application(
            tenant_id=TENANT_ID,
            id=gen_id("app_"),
            name=slug,
            display_name=name,
            description=desc,
            type=app_type,
            status=ApplicationStatus.ACTIVE,
            repository=repo,
            technologies=techs,
            team=team,
            risk_level=risk,
            current_version=version,
            created_at=_ts(5000),
        )
        store.applications.add(app)


def _seed_requirements() -> None:
    apps = store.applications.all()
    reqs_data = [
        ("Add retry support to payment processing", "Implement idempotent retry with exponential backoff for failed payment transactions. Must handle network timeouts, 5xx responses, and rate limiting.", "high"),
        ("Migrate to React 19", "Upgrade e-commerce frontend from React 18 to React 19. Update all hooks, remove deprecated APIs, and leverage new concurrent features.", "medium"),
        ("Implement OAuth2 PKCE flow", "Add PKCE support to the auth service for public clients. Must be backward compatible with existing client registrations.", "high"),
        ("Add real-time inventory reservation", "Implement inventory reservation with 15-minute TTL for pending orders. Must support concurrent reservations and rollback.", "critical"),
        ("Add WebSocket analytics feed", "Implement WebSocket-based real-time analytics feed with configurable aggregation windows and client-side buffering.", "medium"),
        ("Add Slack notification channel", "Add Slack as a notification delivery channel with template support and rate limiting.", "low"),
        ("Implement SAST in CI pipeline", "Integrate SAST scanning into the CI pipeline with fail-fast on critical findings and SARIF report generation.", "high"),
        ("Add Playwright E2E tests for checkout", "Create comprehensive E2E tests covering cart, checkout, payment, and order confirmation flows.", "medium"),
    ]
    for i, (title, desc, priority) in enumerate(reqs_data):
        app = apps[i % len(apps)]
        r = Requirement(
            tenant_id=TENANT_ID,
            id=gen_id("req_"),
            title=title,
            description=desc,
            application_id=app.id,
            status=RequirementStatus.IN_PROGRESS if i < 4 else RequirementStatus.ANALYZED,
            priority=RequirementPriority(priority),
            tags=["backend"] if i % 2 == 0 else ["frontend", "backend"],
            acceptance_criteria=[
                "All tests pass in CI",
                "Code review approved by lead engineer",
                "Security scan shows no new findings",
                "Documentation updated",
            ],
            estimated_complexity="MEDIUM" if priority != "critical" else "HIGH",
            created_at=_ts(4000 - i * 100),
        )
        store.requirements.add(r)
        app.requirement_ids.append(r.id)


def _seed_graphs() -> None:
    agents = {a.name: a.id for a in store.agents.all()}
    tools = {t.name: t.id for t in store.tools.all()}

    def _make_version(g: Graph, changelog: str, is_default: bool = False) -> GraphVersion:
        return GraphVersion(
            tenant_id=TENANT_ID, id=gen_id("gver_"), graph_id=g.id,
            version="v1" if not g.versions else f"v{len(g.versions) + 1}",
            published=True, is_default=is_default,
            nodes=[n.model_copy() for n in g.nodes],
            edges=[e.model_copy() for e in g.edges],
            metadata=g.metadata.model_copy(),
            changelog=changelog, created_at=_ts(5000 - len(g.versions) * 500),
        )

    # Development Graph
    g1 = Graph(
        tenant_id=TENANT_ID,
        id=gen_id("graph_"),
        name="development-graph",
        display_name="Development Graph",
        description="Standard development workflow: requirement -> architecture -> coding -> review -> test",
        version="v2",
        published=True,
        is_default=True,
        metadata=GraphMetadata(
            inputs=["requirement", "application_context"],
            outputs=["code", "tests", "evidence"],
            environment="development",
            failure_path_enabled=True,
            approval_path_enabled=False,
            execution_context={"max_parallel": 3},
            dependencies=["requirement-analyst", "solution-architect", "senior-coding-agent"],
            conditions=["code_ready", "review_passed"],
        ),
        created_at=_ts(5000),
    )
    g1.nodes = [
        GraphNode(id="n1", node_type=GraphNodeType.AGENT, label="Requirement Analysis", ref_id=agents.get("requirement-analyst"), position_x=100, position_y=50, is_entry=True, inputs=["requirement"], outputs=["spec"]),
        GraphNode(id="n2", node_type=GraphNodeType.AGENT, label="Architecture Design", ref_id=agents.get("solution-architect"), position_x=100, position_y=200, inputs=["spec"], outputs=["architecture"]),
        GraphNode(id="n3", node_type=GraphNodeType.AGENT, label="Code Implementation", ref_id=agents.get("senior-coding-agent"), position_x=100, position_y=350, inputs=["architecture"], outputs=["code"]),
        GraphNode(id="n4", node_type=GraphNodeType.AGENT, label="Code Review", ref_id=agents.get("code-reviewer"), position_x=350, position_y=350, inputs=["code"], outputs=["review_result"]),
        GraphNode(id="n5", node_type=GraphNodeType.AGENT, label="Test Generation", ref_id=agents.get("test-generator"), position_x=100, position_y=500, inputs=["code"], outputs=["tests"]),
        GraphNode(id="n6", node_type=GraphNodeType.VERIFICATION, label="Verify Tests Pass", position_x=350, position_y=500, is_terminal=False),
        GraphNode(id="n7", node_type=GraphNodeType.EVIDENCE, label="Collect Evidence", position_x=225, position_y=650, is_terminal=True, inputs=["review_result", "tests"], outputs=["evidence"]),
    ]
    g1.edges = [
        GraphEdge(source_node_id="n1", target_node_id="n2", label="requirement_analyzed"),
        GraphEdge(source_node_id="n2", target_node_id="n3", label="architecture_ready"),
        GraphEdge(source_node_id="n3", target_node_id="n4", label="code_ready"),
        GraphEdge(source_node_id="n3", target_node_id="n5", label="code_ready"),
        GraphEdge(source_node_id="n4", target_node_id="n6", label="review_passed"),
        GraphEdge(source_node_id="n5", target_node_id="n6", label="tests_generated"),
        GraphEdge(source_node_id="n6", target_node_id="n7", label="verified"),
    ]
    g1.entry_node_id = "n1"
    g1.terminal_node_ids = ["n7"]
    g1.versions = [_make_version(g1, "Initial version", True), _make_version(g1, "Added entry/terminal markers and metadata")]
    g1.versions[1].version = "v2"
    store.graphs.add(g1)

    # Security Graph
    g2 = Graph(
        tenant_id=TENANT_ID,
        id=gen_id("graph_"),
        name="security-graph",
        display_name="Security Scan Graph",
        description="Security scanning: SAST -> dependency scan -> secret detection -> report",
        version="v1",
        published=True,
        is_default=True,
        metadata=GraphMetadata(
            inputs=["source_code", "dependencies"],
            outputs=["security_report", "evidence"],
            environment="development",
            failure_path_enabled=True,
            approval_path_enabled=False,
            execution_context={"max_parallel": 2},
            dependencies=["security-analyst"],
            conditions=["scan_complete", "policy_checked"],
        ),
        created_at=_ts(5000),
    )
    g2.nodes = [
        GraphNode(id="s1", node_type=GraphNodeType.AGENT, label="SAST Scan", ref_id=agents.get("security-analyst"), position_x=100, position_y=50, is_entry=True, inputs=["source_code"], outputs=["scan_request"]),
        GraphNode(id="s2", node_type=GraphNodeType.TOOL, label="SAST Scanner", ref_id=tools.get("sast-scanner"), position_x=100, position_y=200, inputs=["scan_request"], outputs=["sast_findings"]),
        GraphNode(id="s3", node_type=GraphNodeType.TOOL, label="Dependency Scanner", ref_id=tools.get("dependency-scanner"), position_x=350, position_y=200, inputs=["dependencies"], outputs=["dep_findings"]),
        GraphNode(id="s4", node_type=GraphNodeType.POLICY, label="Security Policy Check", position_x=225, position_y=350, inputs=["sast_findings", "dep_findings"], outputs=["policy_result"]),
        GraphNode(id="s5", node_type=GraphNodeType.EVIDENCE, label="Security Evidence", position_x=225, position_y=500, is_terminal=True, inputs=["policy_result"], outputs=["evidence"]),
    ]
    g2.edges = [
        GraphEdge(source_node_id="s1", target_node_id="s2", label="start_scan"),
        GraphEdge(source_node_id="s1", target_node_id="s3", label="start_scan"),
        GraphEdge(source_node_id="s2", target_node_id="s4", label="scan_complete"),
        GraphEdge(source_node_id="s3", target_node_id="s4", label="scan_complete"),
        GraphEdge(source_node_id="s4", target_node_id="s5", label="policy_checked"),
    ]
    g2.entry_node_id = "s1"
    g2.terminal_node_ids = ["s5"]
    g2.versions = [_make_version(g2, "Initial version", True)]
    store.graphs.add(g2)

    # Deployment Graph
    g3 = Graph(
        tenant_id=TENANT_ID,
        id=gen_id("graph_"),
        name="deployment-graph",
        display_name="Deployment Graph",
        description="Deployment with verification and rollback capability",
        version="v2",
        published=True,
        is_default=True,
        metadata=GraphMetadata(
            inputs=["artifact", "environment_config"],
            outputs=["deployment_result", "evidence"],
            environment="production",
            failure_path_enabled=True,
            approval_path_enabled=True,
            execution_context={"max_parallel": 1},
            dependencies=["deployment-engineer", "verification-agent"],
            conditions=["healthy", "failure"],
        ),
        created_at=_ts(5000),
    )
    g3.nodes = [
        GraphNode(id="d1", node_type=GraphNodeType.APPROVAL, label="Deployment Approval", position_x=100, position_y=50, is_entry=True, inputs=["artifact"], outputs=["approval"]),
        GraphNode(id="d2", node_type=GraphNodeType.AGENT, label="Deploy", ref_id=agents.get("deployment-engineer"), position_x=100, position_y=200, inputs=["approval"], outputs=["deployment"]),
        GraphNode(id="d3", node_type=GraphNodeType.TOOL, label="Kubernetes", ref_id=tools.get("kubernetes"), position_x=100, position_y=350, inputs=["deployment"], outputs=["deploy_result"]),
        GraphNode(id="d4", node_type=GraphNodeType.AGENT, label="Verify", ref_id=agents.get("verification-agent"), position_x=350, position_y=350, inputs=["deploy_result"], outputs=["verification"]),
        GraphNode(id="d5", node_type=GraphNodeType.CONDITION, label="Health Check", position_x=225, position_y=500, inputs=["verification"], outputs=["health_result"]),
        GraphNode(id="d6", node_type=GraphNodeType.EVIDENCE, label="Deployment Evidence", position_x=225, position_y=650, is_terminal=True, inputs=["health_result"], outputs=["evidence"]),
        GraphNode(id="d7", node_type=GraphNodeType.FAILURE_HANDLER, label="Rollback Handler", position_x=450, position_y=500, inputs=["health_result"], outputs=["rollback"]),
    ]
    g3.edges = [
        GraphEdge(source_node_id="d1", target_node_id="d2", label="approved"),
        GraphEdge(source_node_id="d2", target_node_id="d3", label="deploy"),
        GraphEdge(source_node_id="d3", target_node_id="d4", label="deployed"),
        GraphEdge(source_node_id="d4", target_node_id="d5", label="verified"),
        GraphEdge(source_node_id="d5", target_node_id="d6", label="healthy", condition="success"),
        GraphEdge(source_node_id="d5", target_node_id="d7", label="rollback", condition="failure", is_failure_path=True, edge_type=GraphEdgeType.FAILURE),
        GraphEdge(source_node_id="d7", target_node_id="d2", label="retry_deploy", is_failure_path=True, edge_type=GraphEdgeType.FAILURE),
    ]
    g3.entry_node_id = "d1"
    g3.terminal_node_ids = ["d6"]
    g3.versions = [_make_version(g3, "Initial version", True), _make_version(g3, "Added failure handler and rollback path")]
    g3.versions[1].version = "v2"
    store.graphs.add(g3)


def _seed_loops() -> None:
    loops_data = [
        ("test-fix-loop", "Test Fix Loop", LoopType.FIX, "on_test_failure",
         "Evaluate test failure and generate fix", "Run coding agent to fix failing tests",
         3, "all_tests_pass", "escalate", "human_approval",
         BackoffStrategy.EXPONENTIAL, 2000, 30000, 5000, 1800,
         ["iteration_log", "evaluation_result", "exit_reason", "code_diff"]),
        ("security-remediation-loop", "Security Remediation Loop", LoopType.SECURITY_REMEDIATION,
         "on_security_finding", "Assess vulnerability severity and exploitability", "Apply remediation via coding agent",
         5, "no_critical_findings", "escalate", "security_engineer_approval",
         BackoffStrategy.EXPONENTIAL, 3000, 60000, 8000, 3600,
         ["iteration_log", "scan_results", "remediation_diff", "exit_reason"]),
        ("deployment-verification-loop", "Deployment Verification Loop", LoopType.DEPLOYMENT_VERIFICATION,
         "on_deployment", "Run health checks and smoke tests", "Verify deployment health",
         3, "all_checks_pass", "rollback", "human_approval",
         BackoffStrategy.LINEAR, 5000, 30000, 3000, 900,
         ["iteration_log", "health_check_results", "smoke_test_results", "exit_reason"]),
        ("rollback-loop", "Rollback Loop", LoopType.ROLLBACK,
         "on_verification_failure", "Assess deployment failure scope", "Execute rollback to previous version",
         1, "rollback_complete", "escalate", "incident_remediation",
         BackoffStrategy.NONE, 0, 0, 2000, 600,
         ["iteration_log", "rollback_result", "exit_reason"]),
        ("incident-remediation-loop", "Incident Remediation Loop", LoopType.INCIDENT_REMEDIATION,
         "on_incident", "Analyze incident and identify root cause", "Implement and deploy fix",
         3, "incident_resolved", "escalate", "human_approval",
         BackoffStrategy.EXPONENTIAL, 5000, 60000, 10000, 5400,
         ["iteration_log", "incident_analysis", "fix_diff", "test_results", "exit_reason"]),
        ("retry-loop", "Standard Retry Loop", LoopType.RETRY,
         "on_failure", "Check if error is transient", "Retry the failed operation",
         3, "success", "escalate", "human_approval",
         BackoffStrategy.EXPONENTIAL, 1000, 30000, 2000, 1800,
         ["iteration_log", "evaluation_result", "exit_reason"]),
        ("validation-loop", "Validation Loop", LoopType.VALIDATION,
         "on_completion", "Validate output against acceptance criteria", "Run validation checks",
         2, "validation_passed", "escalate", "human_approval",
         BackoffStrategy.FIXED, 1000, 5000, 1500, 900,
         ["iteration_log", "validation_results", "exit_reason"]),
        ("human-escalation-loop", "Human Escalation Loop", LoopType.HUMAN_ESCALATION,
         "on_failure", "Escalate to human when automated resolution fails", "Notify and create approval request",
         1, "approval_decision", "abort", "human_approval",
         BackoffStrategy.NONE, 0, 0, 500, 3600,
         ["iteration_log", "approval_request", "decision_record"]),
        ("continuous-improvement-loop", "Continuous Improvement Loop", LoopType.CONTINUOUS_IMPROVEMENT,
         "on_schedule", "Analyze quality and performance metrics", "Apply identified improvements",
         10, "no_improvement_possible", "continue", "notify_only",
         BackoffStrategy.LINEAR, 10000, 60000, 5000, 7200,
         ["iteration_log", "metrics_snapshot", "improvement_diff", "exit_reason"]),
    ]

    for (name, display, ltype, trigger, evaluation, action, max_iter,
         exit_cond, failure, escalation, backoff, backoff_init, backoff_max,
         cost_limit, time_limit, evidence_reqs) in loops_data:
        steps_template = LoopEngine.generate_steps_for_type(ltype)
        steps = [
            LoopStep(
                step_type=LoopStepType(s["step_type"]),
                label=s["label"],
                description=s["description"],
                position_x=s["position_x"],
                position_y=s["position_y"],
            )
            for s in steps_template
        ]
        for i in range(len(steps) - 1):
            steps[i].next_step_id = steps[i + 1].id

        l = Loop(
            tenant_id=TENANT_ID,
            id=gen_id("loop_"),
            name=name,
            display_name=display,
            loop_type=ltype,
            trigger=trigger,
            evaluation=evaluation,
            action=action,
            max_iterations=max_iter,
            backoff_strategy=backoff,
            backoff_initial_ms=backoff_init,
            backoff_max_ms=backoff_max,
            cost_limit_cents=cost_limit,
            time_limit_seconds=time_limit,
            retry_policy={"retry_on": "transient", "max_retries": max_iter},
            exit_condition=exit_cond,
            failure_handling=failure,
            escalation=escalation,
            steps=steps,
            evidence_requirements=evidence_reqs,
            version="v1",
            published=True,
            is_default=True,
            created_at=_ts(5000),
        )
        store.loops.add(l)


def _seed_harnesses() -> None:
    agents = {a.name: a.id for a in store.agents.all()}
    skills = {s.name: s.id for s in store.skills.all()}
    tools = {t.name: t.id for t in store.tools.all()}
    models = {m.name: m.id for m in store.models.all()}
    graphs = {g.name: g.id for g in store.graphs.all()}
    loops = {l.name: l.id for l in store.loops.all()}

    harnesses_data = [
        ("Development Harness", "development-harness", HarnessType.DEVELOPMENT, "Governed development execution from requirement to tested code", "development-graph", ["test-fix-loop", "validation-loop"], ["requirement-analyst", "solution-architect", "senior-coding-agent", "code-reviewer", "test-generator"], ["react-typescript", "fastapi", "spring-boot"], ["git", "filesystem", "terminal", "npm", "python"], "development", 5000, 3600, False, HarnessLifecycle.PUBLISHED),
        ("Testing Harness", "testing-harness", HarnessType.TESTING, "Comprehensive test execution with coverage analysis", "development-graph", ["test-fix-loop", "retry-loop"], ["test-generator", "code-reviewer"], ["pytest", "junit", "playwright", "api-testing"], ["python", "npm", "maven", "gradle"], "development", 2000, 1800, False, HarnessLifecycle.PUBLISHED),
        ("Security Harness", "security-harness", HarnessType.SECURITY, "Security scanning and vulnerability assessment with remediation", "security-graph", ["security-remediation-loop"], ["security-analyst"], ["sast", "dependency-analysis", "secret-detection"], ["sast-scanner", "dependency-scanner"], "development", 3000, 1800, False, HarnessLifecycle.PUBLISHED),
        ("Build Harness", "build-harness", HarnessType.BUILD, "Build automation and artifact creation", "development-graph", ["retry-loop"], ["build-engineer"], ["build-automation"], ["build-runner", "npm", "maven", "gradle"], "staging", 2000, 1800, False, HarnessLifecycle.PUBLISHED),
        ("Release Harness", "release-harness", HarnessType.RELEASE, "Release planning with change impact analysis and approval gates", "development-graph", ["validation-loop"], ["release-planner", "release-notes-writer"], ["git", "release-management"], ["git", "jira"], "staging", 1000, 900, True, HarnessLifecycle.PUBLISHED),
        ("Deployment Harness", "deployment-harness", HarnessType.DEPLOYMENT, "Production deployment with verification and rollback capability", "deployment-graph", ["deployment-verification-loop", "rollback-loop"], ["deployment-engineer", "verification-agent"], ["kubernetes", "deployment"], ["kubernetes", "deployment-api"], "production", 5000, 3600, True, HarnessLifecycle.PUBLISHED),
        ("Verification Harness", "verification-harness", HarnessType.VERIFICATION, "Post-deployment verification with health checks and smoke tests", "deployment-graph", ["retry-loop"], ["verification-agent"], ["production-verification"], ["kubernetes", "terminal"], "production", 1000, 600, False, HarnessLifecycle.PUBLISHED),
        ("Operations Harness", "operations-harness", HarnessType.OPERATIONS, "Production observability and operational health monitoring", "deployment-graph", ["retry-loop"], ["incident-analyst", "verification-agent"], ["observability", "production-verification"], ["observability-api", "kubernetes"], "production", 3000, 1800, False, HarnessLifecycle.PUBLISHED),
        ("Remediation Harness", "remediation-harness", HarnessType.REMEDIATION, "Automated incident remediation with fix, test, and verify cycle", "deployment-graph", ["incident-remediation-loop", "rollback-loop"], ["remediation-agent", "root-cause-analyst", "test-generator"], ["remediation", "root-cause-analysis", "pytest"], ["terminal", "python", "kubernetes"], "production", 8000, 5400, True, HarnessLifecycle.VALIDATED),
        ("Incident Remediation Harness", "incident-remediation-harness", HarnessType.INCIDENT, "Production incident analysis and remediation with rollback", "deployment-graph", ["incident-remediation-loop", "rollback-loop"], ["incident-analyst", "root-cause-analyst", "remediation-agent"], ["observability", "incident-analysis", "root-cause-analysis"], ["terminal", "kubernetes", "observability-api"], "production", 10000, 7200, True, HarnessLifecycle.PUBLISHED),
        ("Brownfield Discovery Harness", "brownfield-discovery-harness", HarnessType.BROWNFIELD_DISCOVERY, "Repository discovery and semantic model building for existing codebases", "development-graph", ["retry-loop"], ["solution-architect", "code-reviewer"], ["git", "code-review"], ["git", "filesystem", "terminal"], "development", 3000, 3600, False, HarnessLifecycle.PUBLISHED),
        ("Architecture Harness", "architecture-harness", HarnessType.ARCHITECTURE, "Architecture analysis and design with technology selection", "development-graph", ["validation-loop"], ["solution-architect", "requirement-analyst"], ["react-typescript", "spring-boot", "fastapi"], ["git", "filesystem"], "development", 3000, 1800, False, HarnessLifecycle.DEPRECATED),
        ("Custom CI Harness", "custom-ci-harness", HarnessType.CUSTOM, "Custom continuous integration harness for specialized build pipelines", "development-graph", ["retry-loop"], ["build-engineer", "code-reviewer"], ["build-automation", "code-review"], ["build-runner", "npm"], "staging", 1500, 1200, False, HarnessLifecycle.DRAFT),
    ]

    for name, slug, htype, purpose, graph_name, loop_names, agent_names, skill_names, tool_names, env, cost, time_limit, approval, lifecycle in harnesses_data:
        h = Harness(
            tenant_id=TENANT_ID,
            id=gen_id("harness_"),
            name=slug,
            display_name=name,
            purpose=purpose,
            harness_type=htype,
            graph_id=graphs.get(graph_name),
            loop_ids=[loops.get(ln) for ln in loop_names if ln in loops],
            agent_ids=[agents.get(an) for an in agent_names if an in agents],
            skill_ids=[skills.get(sn) for sn in skill_names if sn in skills],
            tool_ids=[tools.get(tn) for tn in tool_names if tn in tools],
            model_config_ids=[models.get("claude-sonnet-4")] if models.get("claude-sonnet-4") else [],
            environment=env,
            cost_limit_cents=cost,
            time_limit_seconds=time_limit,
            approval_required=approval,
            approval_rules={"required": approval, "approvers": ["engineering_lead", "security_engineer"] if approval else []},
            published=True,
            lifecycle=lifecycle,
            current_version="v1",
            created_at=_ts(4000),
        )

        v1 = HarnessVersion(
            tenant_id=TENANT_ID,
            id=gen_id("hver_"),
            harness_id=h.id,
            version="v1",
            published=True,
            is_default=True,
            is_immutable=True,
            published_at=_ts(4000),
            graph_id=h.graph_id,
            loop_ids=h.loop_ids,
            agent_ids=h.agent_ids,
            skill_ids=h.skill_ids,
            tool_ids=h.tool_ids,
            model_config_ids=h.model_config_ids,
            policy_ids=h.policy_ids,
            environment=h.environment,
            cost_limit_cents=cost,
            time_limit_seconds=time_limit,
            approval_required=approval,
            changelog="Initial version",
            created_at=_ts(4000),
        )
        v2 = HarnessVersion(
            tenant_id=TENANT_ID,
            id=gen_id("hver_"),
            harness_id=h.id,
            version="v2",
            published=True,
            is_default=False,
            is_immutable=True,
            published_at=_ts(2000),
            graph_id=h.graph_id,
            loop_ids=h.loop_ids,
            agent_ids=h.agent_ids,
            skill_ids=h.skill_ids,
            tool_ids=h.tool_ids,
            model_config_ids=h.model_config_ids,
            policy_ids=h.policy_ids,
            environment=h.environment,
            cost_limit_cents=cost,
            time_limit_seconds=time_limit,
            approval_required=approval,
            changelog="Enhanced policy enforcement and evidence collection",
            created_at=_ts(2000),
        )
        h.versions = [v1, v2]
        store.harnesses.add(h)


def _seed_harness_templates() -> None:
    templates_data = [
        ("Production Release Template", "production-release", "Mandatory production release workflow with security, testing, approval, and verification gates", HarnessType.RELEASE, ["security_scan", "tests_pass", "artifact_exists", "approval_required", "deployment_verification", "rollback_capability", "evidence"], ["release_notes", "notifications"], ["cost_limit", "time_limit", "environment"], True, ["mandatory_steps"], TemplateInheritanceLevel.PLATFORM, None),
        ("Greenfield Development Template", "greenfield-dev", "Standard greenfield development from requirement to deployment", HarnessType.DEVELOPMENT, ["requirement_analysis", "architecture", "coding", "testing"], ["security_scan", "code_review"], ["agent_selection", "model_selection", "environment"], True, [], TemplateInheritanceLevel.PLATFORM, None),
        ("Brownfield Discovery Template", "brownfield-discovery", "Repository discovery and semantic model building", HarnessType.BROWNFIELD_DISCOVERY, ["repository_clone", "tech_detection", "semantic_model"], ["wiki_generation", "documentation"], ["depth", "scope"], True, [], TemplateInheritanceLevel.PLATFORM, None),
        ("Incident Response Template", "incident-response", "Production incident response with rollback and remediation", HarnessType.INCIDENT, ["incident_detection", "root_cause", "remediation", "verification"], ["rollback", "notifications"], ["severity_threshold", "auto_remediate"], False, ["mandatory_steps", "approval_required"], TemplateInheritanceLevel.PLATFORM, None),
        ("CI/CD Pipeline Template", "ci-cd-pipeline", "Continuous integration and delivery pipeline with build, test, and deploy gates", HarnessType.BUILD, ["build_pass", "tests_pass", "artifact_exists"], ["security_scan", "code_review"], ["build_tool", "test_framework", "environment"], True, [], TemplateInheritanceLevel.PLATFORM, None),
        ("Security Audit Template", "security-audit", "Comprehensive security audit with SAST, SCA, and secret detection", HarnessType.SECURITY, ["sast_scan", "dependency_scan", "secret_detection", "evidence"], ["remediation", "reporting"], ["scanner_config", "severity_threshold"], True, ["mandatory_steps"], TemplateInheritanceLevel.PLATFORM, None),
    ]
    created_templates: dict[str, str] = {}
    for name, slug, desc, htype, mandatory, optional, configurable, override_allowed, forbidden, level, parent_id in templates_data:
        t = HarnessTemplate(
            tenant_id=TENANT_ID,
            id=gen_id("htmpl_"),
            name=slug,
            display_name=name,
            description=desc,
            harness_type=htype,
            inheritance_level=level,
            parent_template_id=parent_id,
            mandatory_steps=mandatory,
            optional_steps=optional,
            configurable=configurable,
            tenant_override_allowed=override_allowed,
            tenant_override_forbidden=forbidden,
            default_config={"cost_limit_cents": 5000, "time_limit_seconds": 3600},
            current_version="v1",
            published=True,
            last_published_at=_ts(5000),
            created_at=_ts(6000),
        )
        v1 = HarnessTemplateVersion(
            tenant_id=TENANT_ID,
            id=gen_id("htver_"),
            template_id=t.id,
            version="v1",
            published=True,
            is_default=True,
            is_immutable=True,
            mandatory_steps=list(mandatory),
            optional_steps=list(optional),
            configurable=list(configurable),
            tenant_override_allowed=override_allowed,
            tenant_override_forbidden=list(forbidden),
            default_config={"cost_limit_cents": 5000, "time_limit_seconds": 3600},
            changelog="Initial version",
            created_at=_ts(6000),
        )
        v2 = HarnessTemplateVersion(
            tenant_id=TENANT_ID,
            id=gen_id("htver_"),
            template_id=t.id,
            version="v2",
            published=True,
            is_default=False,
            is_immutable=True,
            mandatory_steps=list(mandatory),
            optional_steps=list(optional) + (["evidence"] if "evidence" not in optional and "evidence" not in mandatory else []),
            configurable=list(configurable),
            tenant_override_allowed=override_allowed,
            tenant_override_forbidden=list(forbidden),
            default_config={"cost_limit_cents": 5000, "time_limit_seconds": 3600},
            changelog="Enhanced evidence requirements and optional steps",
            created_at=_ts(3000),
        )
        t.versions = [v1, v2]
        t.current_version = "v2"
        store.harness_templates.add(t)
        created_templates[slug] = t.id

    # Create tenant-level inherited template
    tenant_parent = created_templates.get("production-release")
    if tenant_parent:
        t = HarnessTemplate(
            tenant_id=TENANT_ID,
            id=gen_id("htmpl_"),
            name="tenant-production-release",
            display_name="Tenant Production Release (Customized)",
            description="Tenant-customized production release template inheriting from platform template",
            harness_type=HarnessType.RELEASE,
            inheritance_level=TemplateInheritanceLevel.TENANT,
            parent_template_id=tenant_parent,
            mandatory_steps=["security_scan", "tests_pass", "artifact_exists", "approval_required", "deployment_verification", "rollback_capability", "evidence"],
            optional_steps=["release_notes", "notifications", "slack_alert"],
            configurable=["cost_limit", "time_limit", "environment"],
            tenant_override_allowed=True,
            tenant_override_forbidden=["mandatory_steps"],
            default_config={"cost_limit_cents": 8000, "time_limit_seconds": 5400},
            current_version="v1",
            published=True,
            last_published_at=_ts(2000),
            created_at=_ts(3000),
        )
        tv1 = HarnessTemplateVersion(
            tenant_id=TENANT_ID,
            id=gen_id("htver_"),
            template_id=t.id,
            version="v1",
            published=True,
            is_default=True,
            is_immutable=True,
            mandatory_steps=t.mandatory_steps,
            optional_steps=t.optional_steps,
            configurable=t.configurable,
            tenant_override_allowed=True,
            tenant_override_forbidden=t.tenant_override_forbidden,
            default_config=t.default_config,
            changelog="Tenant customization of platform production release template",
            created_at=_ts(3000),
        )
        t.versions = [tv1]
        store.harness_templates.add(t)


def _seed_pipelines() -> None:
    apps = store.applications.all()
    harnesses = {h.name: h.id for h in store.harnesses.all()}

    pipelines_data = [
        ("E-Commerce Release Pipeline", "ecommerce-release-pipeline", "Full lifecycle pipeline from development to production deployment", 0),
        ("Payment Gateway Release Pipeline", "payment-release-pipeline", "Payment service release with security and compliance gates", 1),
        ("Inventory Service Pipeline", "inventory-pipeline", "Inventory service development and deployment pipeline", 2),
        ("Auth Service Pipeline", "auth-release-pipeline", "Critical auth service release with enhanced security and approval gates", 3),
        ("Analytics Dashboard Pipeline", "analytics-pipeline", "Analytics dashboard greenfield development pipeline", 4),
        ("Notification Hub Pipeline", "notification-pipeline", "Notification hub incremental delivery pipeline", 5),
    ]

    stage_configs = [
        [
            ("Development", PipelineStageType.DEVELOPMENT, "development-harness"),
            ("Testing", PipelineStageType.TESTING, "testing-harness"),
            ("Security", PipelineStageType.SECURITY, "security-harness"),
            ("Build", PipelineStageType.BUILD, "build-harness"),
            ("Release", PipelineStageType.RELEASE, "release-harness"),
            ("Deployment", PipelineStageType.DEPLOYMENT, "deployment-harness"),
            ("Verification", PipelineStageType.VERIFICATION, "verification-harness"),
        ],
        [
            ("Development", PipelineStageType.DEVELOPMENT, "development-harness"),
            ("Testing", PipelineStageType.TESTING, "testing-harness"),
            ("Security", PipelineStageType.SECURITY, "security-harness"),
            ("Build", PipelineStageType.BUILD, "build-harness"),
            ("Release", PipelineStageType.RELEASE, "release-harness"),
            ("Deployment", PipelineStageType.DEPLOYMENT, "deployment-harness"),
            ("Verification", PipelineStageType.VERIFICATION, "verification-harness"),
        ],
        [
            ("Development", PipelineStageType.DEVELOPMENT, "development-harness"),
            ("Testing", PipelineStageType.TESTING, "testing-harness"),
            ("Security", PipelineStageType.SECURITY, "security-harness"),
            ("Build", PipelineStageType.BUILD, "build-harness"),
            ("Deployment", PipelineStageType.DEPLOYMENT, "deployment-harness"),
            ("Verification", PipelineStageType.VERIFICATION, "verification-harness"),
        ],
        [
            ("Development", PipelineStageType.DEVELOPMENT, "development-harness"),
            ("Security", PipelineStageType.SECURITY, "security-harness"),
            ("Testing", PipelineStageType.TESTING, "testing-harness"),
            ("Security", PipelineStageType.SECURITY, "security-harness"),
            ("Build", PipelineStageType.BUILD, "build-harness"),
            ("Release", PipelineStageType.RELEASE, "release-harness"),
            ("Deployment", PipelineStageType.DEPLOYMENT, "deployment-harness"),
            ("Verification", PipelineStageType.VERIFICATION, "verification-harness"),
        ],
        [
            ("Development", PipelineStageType.DEVELOPMENT, "development-harness"),
            ("Testing", PipelineStageType.TESTING, "testing-harness"),
            ("Build", PipelineStageType.BUILD, "build-harness"),
            ("Deployment", PipelineStageType.DEPLOYMENT, "deployment-harness"),
            ("Verification", PipelineStageType.VERIFICATION, "verification-harness"),
        ],
        [
            ("Development", PipelineStageType.DEVELOPMENT, "development-harness"),
            ("Testing", PipelineStageType.TESTING, "testing-harness"),
            ("Security", PipelineStageType.SECURITY, "security-harness"),
            ("Build", PipelineStageType.BUILD, "build-harness"),
            ("Deployment", PipelineStageType.DEPLOYMENT, "deployment-harness"),
            ("Verification", PipelineStageType.VERIFICATION, "verification-harness"),
        ],
    ]

    for i, (name, slug, desc, app_idx) in enumerate(pipelines_data):
        app = apps[app_idx]
        stages = []
        for order, (stage_name, stage_type, harness_name) in enumerate(stage_configs[i]):
            approval = stage_type in (PipelineStageType.RELEASE, PipelineStageType.DEPLOYMENT)
            stages.append(PipelineStage(
                id=gen_id("stage_"),
                name=stage_name,
                stage_type=stage_type,
                harness_id=harnesses.get(harness_name, ""),
                order=order,
                required=True,
                config=StageConfig(
                    environment="production" if stage_type in (PipelineStageType.DEPLOYMENT, PipelineStageType.VERIFICATION) else ("staging" if stage_type in (PipelineStageType.BUILD, PipelineStageType.RELEASE) else "development"),
                    failure_strategy=FailureStrategy.ABORT,
                    approval_required=approval,
                ),
            ))
        p = Pipeline(
            tenant_id=TENANT_ID,
            id=gen_id("pipeline_"),
            name=slug,
            display_name=name,
            description=desc,
            application_id=app.id,
            stages=stages,
            published=True,
            active=True,
            created_at=_ts(3000),
        )
        store.pipelines.add(p)
        app.pipeline_ids.append(p.id)


def _seed_pipeline_templates() -> None:
    harnesses = {h.name: h.id for h in store.harnesses.all()}

    def _stage_def(name, stage_type, harness_name=None, environment=None, approval=False, failure="abort"):
        return {
            "name": name,
            "stage_type": stage_type,
            "harness_id": harnesses.get(harness_name) if harness_name else None,
            "required": True,
            "config": {
                "environment": environment,
                "failure_strategy": failure,
                "approval_required": approval,
            },
        }

    templates_data = [
        (
            "React Development Pipeline", "react-development", "Full lifecycle pipeline for React frontend applications",
            "frontend",
            [
                _stage_def("Development", "development", "development-harness", "development"),
                _stage_def("Testing", "testing", "testing-harness", "development"),
                _stage_def("Security", "security", "security-harness", "development"),
                _stage_def("Build", "build", "build-harness", "staging"),
                _stage_def("Deployment", "deployment", "deployment-harness", "production", approval=True),
                _stage_def("Verification", "verification", "verification-harness", "production"),
            ],
        ),
        (
            "Spring Boot Development Pipeline", "spring-boot-development", "Full lifecycle pipeline for Java Spring Boot applications",
            "backend",
            [
                _stage_def("Development", "development", "development-harness", "development"),
                _stage_def("Testing", "testing", "testing-harness", "development"),
                _stage_def("Security", "security", "security-harness", "development"),
                _stage_def("Build", "build", "build-harness", "staging"),
                _stage_def("Release", "release", "release-harness", "staging", approval=True),
                _stage_def("Deployment", "deployment", "deployment-harness", "production", approval=True),
                _stage_def("Verification", "verification", "verification-harness", "production"),
            ],
        ),
        (
            "Python Development Pipeline", "python-development", "Full lifecycle pipeline for Python FastAPI applications",
            "backend",
            [
                _stage_def("Development", "development", "development-harness", "development"),
                _stage_def("Testing", "testing", "testing-harness", "development"),
                _stage_def("Security", "security", "security-harness", "development"),
                _stage_def("Build", "build", "build-harness", "staging"),
                _stage_def("Deployment", "deployment", "deployment-harness", "production", approval=True),
                _stage_def("Verification", "verification", "verification-harness", "production"),
            ],
        ),
        (
            "Production Release Pipeline", "production-release", "Production release with security, testing, approval, and verification gates",
            "release",
            [
                _stage_def("Security", "security", "security-harness", "development"),
                _stage_def("Testing", "testing", "testing-harness", "development"),
                _stage_def("Build", "build", "build-harness", "staging"),
                {"name": "Release Approval", "stage_type": "approval", "required": True, "config": {"approval_required": True}},
                _stage_def("Release", "release", "release-harness", "staging", approval=True),
                _stage_def("Deployment", "deployment", "deployment-harness", "production", approval=True),
                _stage_def("Verification", "verification", "verification-harness", "production"),
            ],
        ),
        (
            "Security Pipeline", "security-pipeline", "Dedicated security scanning and remediation pipeline",
            "security",
            [
                _stage_def("Security Scan", "security", "security-harness", "development"),
                {"name": "Security Approval", "stage_type": "approval", "required": True, "config": {"approval_required": True}},
                _stage_def("Remediation", "development", "development-harness", "development", failure="retry"),
                _stage_def("Re-Scan", "security", "security-harness", "development"),
                _stage_def("Verification", "verification", "verification-harness", "development"),
            ],
        ),
        (
            "Deployment Pipeline", "deployment-pipeline", "Deployment-focused pipeline with verification and rollback",
            "deployment",
            [
                _stage_def("Build", "build", "build-harness", "staging"),
                {"name": "Deployment Approval", "stage_type": "approval", "required": True, "config": {"approval_required": True}},
                _stage_def("Deployment", "deployment", "deployment-harness", "production", approval=True),
                _stage_def("Verification", "verification", "verification-harness", "production"),
            ],
        ),
        (
            "Full Software Delivery Pipeline", "full-software-delivery", "Complete software delivery lifecycle from requirement to verification",
            "full",
            [
                _stage_def("Development", "development", "development-harness", "development"),
                _stage_def("Testing", "testing", "testing-harness", "development"),
                _stage_def("Security", "security", "security-harness", "development"),
                _stage_def("Build", "build", "build-harness", "staging"),
                _stage_def("Release", "release", "release-harness", "staging", approval=True),
                {"name": "Production Approval", "stage_type": "approval", "required": True, "config": {"approval_required": True}},
                _stage_def("Deployment", "deployment", "deployment-harness", "production", approval=True),
                _stage_def("Verification", "verification", "verification-harness", "production"),
            ],
        ),
    ]

    for name, slug, desc, category, stage_defs in templates_data:
        t = PipelineTemplate(
            tenant_id=TENANT_ID,
            id=gen_id("ptmpl_"),
            name=slug,
            display_name=name,
            description=desc,
            category=category,
            stage_definitions=stage_defs,
            published=True,
            last_published_at=_ts(2500),
            created_at=_ts(3000),
        )
        v1 = PipelineTemplateVersion(
            tenant_id=TENANT_ID,
            id=gen_id("ptver_"),
            template_id=t.id,
            version="v1",
            published=True,
            is_default=True,
            is_immutable=True,
            stage_definitions=stage_defs,
            changelog="Initial version",
            published_at=_ts(2500),
            created_at=_ts(3000),
        )
        t.versions = [v1]
        store.pipeline_templates.add(t)


def _seed_policies() -> None:
    policies_data = [
        ("Production Deployment Approval", "production-deployment-approval", "All production deployments require approval from release manager and security engineer", PolicyType.REQUIRE, PolicyScope.ENVIRONMENT, "production", 100, "hard"),
        ("SAST Mandatory", "sast-mandatory", "SAST scanning is mandatory before any release", PolicyType.REQUIRE, PolicyScope.PIPELINE, "", 90, "hard"),
        ("No Direct Production Tool Access", "no-direct-prod-tools", "Agents may not execute tools directly in production without approval", PolicyType.PROHIBIT, PolicyScope.TOOL, "production", 100, "hard"),
        ("Token Budget Enforcement", "token-budget-enforcement", "Agent token usage must not exceed configured budget", PolicyType.GATE, PolicyScope.AGENT, "", 80, "hard"),
        ("Cost Limit Enforcement", "cost-limit-enforcement", "Harness execution cost must not exceed configured limit", PolicyType.GATE, PolicyScope.HARNESS, "", 80, "hard"),
        ("Test Coverage Minimum", "test-coverage-minimum", "Minimum 80% test coverage required for release", PolicyType.REQUIRE, PolicyScope.APPLICATION, "", 70, "soft"),
        ("Secret Detection Required", "secret-detection-required", "Secret detection scan required before any artifact creation", PolicyType.REQUIRE, PolicyScope.PIPELINE, "", 95, "hard"),
        ("Rollback Capability", "rollback-capability", "All production deployments must have rollback capability", PolicyType.REQUIRE, PolicyScope.ENVIRONMENT, "production", 100, "hard"),
        ("Agent Sandbox Isolation", "agent-sandbox-isolation", "Agents must execute in isolated sandboxes", PolicyType.REQUIRE, PolicyScope.AGENT, "", 90, "hard"),
        ("Tenant Data Isolation", "tenant-data-isolation", "All data access must be tenant-isolated", PolicyType.REQUIRE, PolicyScope.TENANT, "", 100, "hard"),
    ]
    for name, slug, desc, ptype, scope, target, priority, enforcement in policies_data:
        p = Policy(
            tenant_id=TENANT_ID,
            id=gen_id("pol_"),
            name=slug,
            display_name=name,
            description=desc,
            policy_type=ptype,
            scope=scope,
            target_id=target if target else None,
            rules=[{"field": "environment", "operator": "eq", "value": target}] if target else [],
            enforcement=enforcement,
            priority=priority,
            active=True,
            created_at=_ts(6000),
        )
        store.policies.add(p)


def _seed_environments() -> None:
    apps = store.applications.all()
    envs_data = [
        ("Development", "development", EnvironmentType.DEVELOPMENT, False, False),
        ("Staging", "staging", EnvironmentType.STAGING, False, True),
        ("Production", "production", EnvironmentType.PRODUCTION, True, True),
    ]
    for app in apps[:3]:
        for name, slug, etype, protected, requires_approval in envs_data:
            e = Environment(
                tenant_id=TENANT_ID,
                id=gen_id("env_"),
                name=f"{app.name}-{slug}",
                display_name=f"{app.display_name} - {name}",
                env_type=etype,
                application_id=app.id,
                cluster=f"cluster-{slug}",
                region="us-east-1",
                protected=protected,
                requires_approval=requires_approval,
                active=True,
                created_at=_ts(5000),
            )
            store.environments.add(e)


def _seed_artifacts() -> None:
    apps = store.applications.all()
    for i, app in enumerate(apps[:4]):
        a = Artifact(
            tenant_id=TENANT_ID,
            id=gen_id("art_"),
            application_id=app.id,
            name=f"{app.name}:latest",
            version=app.current_version,
            type="container",
            hash=f"sha256:{'a1b2c3' * 10}",
            registry=f"registry.forgeiq.io/{app.name}",
            size_bytes=150_000_000 + i * 10_000_000,
            tags=[app.current_version, "latest"],
            created_at=_ts(2000 - i * 200),
        )
        store.artifacts.add(a)


def _seed_executions() -> None:
    pipelines = store.pipelines.all()
    apps = store.applications.all()

    exec_data = [
        ("COMPLETED", 100.0, 0, 125000, 875, "Execution completed successfully through all pipeline stages"),
        ("COMPLETED", 100.0, 0, 98000, 620, "All stages passed including security and verification"),
        ("RUNNING", 65.0, 0, 45000, 280, "Currently executing deployment stage"),
        ("FAILED", 45.0, 2, 67000, 450, "Build stage failed after 2 retries - compilation error in PaymentService.java"),
        ("COMPLETED", 100.0, 1, 156000, 1020, "Completed with 1 retry in test stage due to flaky test"),
        ("AWAITING_APPROVAL", 80.0, 0, 89000, 560, "Awaiting production deployment approval from release manager"),
        ("COMPLETED", 100.0, 0, 112000, 730, "Greenfield development completed successfully"),
        ("FAILED", 30.0, 3, 34000, 220, "Security scan found critical vulnerability - SAST-2024-0042"),
    ]

    for i, (status, progress, retries, tokens, cost, error_msg) in enumerate(exec_data):
        pipeline = pipelines[i % len(pipelines)]
        app = apps[i % len(apps)]
        first_stage = pipeline.stages[0] if pipeline.stages else None
        harness_id = first_stage.harness_id if first_stage else None

        started = _ts(3000 - i * 300)
        completed = _ts(3000 - i * 300 - 60) if status in ("COMPLETED", "FAILED") else None

        execution = Execution(
            tenant_id=TENANT_ID,
            id=gen_id("exec_"),
            pipeline_id=pipeline.id,
            harness_id=harness_id,
            application_id=app.id,
            status=status,
            started_at=started,
            completed_at=completed,
            trigger="manual" if i % 2 == 0 else "requirement",
            trigger_reason=f"Requirement: {store.requirements.all()[i % len(store.requirements.all())].title}" if i % 2 == 1 else "Manual trigger by user",
            current_stage=first_stage.name if first_stage else "",
            current_node=None,
            progress=progress,
            retry_count=retries,
            tokens_used=tokens,
            cost_cents=cost,
            error_message=error_msg if status == "FAILED" else None,
            result={"summary": error_msg} if status == "COMPLETED" else {},
            created_at=_ts(3000 - i * 300),
        )

        # Generate events for this execution
        event_types = [
            (EventType.EXECUTION_STARTED, "Execution started by user"),
            (EventType.PIPELINE_STARTED, f"Pipeline '{pipeline.display_name}' started"),
        ]
        if status in ("COMPLETED", "RUNNING", "FAILED", "AWAITING_APPROVAL"):
            event_types.append((EventType.HARNESS_STARTED, f"Harness '{first_stage.name}' started"))
            event_types.append((EventType.GRAPH_NODE_STARTED, "Node 'Requirement Analysis' started"))
            event_types.append((EventType.AGENT_STARTED, "Agent 'Requirement Analyst' started"))
            event_types.append((EventType.CONTEXT_PREPARED, "Context prepared with 12 files, 3 APIs, 2 dependencies"))
            event_types.append((EventType.GRAPH_NODE_COMPLETED, "Node 'Requirement Analysis' completed"))
            event_types.append((EventType.GRAPH_NODE_STARTED, "Node 'Code Implementation' started"))
            event_types.append((EventType.AGENT_STARTED, "Agent 'Senior Coding Agent' started"))
            event_types.append((EventType.TOOL_REQUESTED, "Tool 'Git' requested"))
            event_types.append((EventType.PERMISSION_CHECKED, "Permission check passed for git:clone"))
            event_types.append((EventType.POLICY_CHECKED, "Policy 'Agent Sandbox Isolation' passed"))
            event_types.append((EventType.TOOL_EXECUTED, "Tool 'Git' executed: git clone"))
            event_types.append((EventType.TOOL_RESULT, "Tool 'Git' result: success, 0 errors"))
            event_types.append((EventType.EVIDENCE_CREATED, "Evidence created: code_change"))
            event_types.append((EventType.GRAPH_NODE_COMPLETED, "Node 'Code Implementation' completed"))

        if retries > 0:
            event_types.append((EventType.LOOP_TRIGGERED, f"Loop 'test-fix-loop' triggered"))
            event_types.append((EventType.RETRY_STARTED, f"Retry {retries} started"))
            event_types.append((EventType.EVALUATION_STARTED, "Evaluating test results"))
            event_types.append((EventType.EVALUATION_COMPLETED, "Evaluation: tests passed after fix"))

        if status == "AWAITING_APPROVAL":
            event_types.append((EventType.APPROVAL_REQUESTED, "Production deployment approval requested"))

        if status == "COMPLETED":
            event_types.append((EventType.HARNESS_COMPLETED, "Harness completed successfully"))
            event_types.append((EventType.PIPELINE_COMPLETED, "Pipeline completed successfully"))
            event_types.append((EventType.EXECUTION_COMPLETED, "Execution completed"))

        if status == "FAILED":
            event_types.append((EventType.EXECUTION_FAILED, f"Execution failed: {error_msg}"))

        for etype, msg in event_types:
            evt = ExecutionEvent(
                id=gen_id("evt_"),
                execution_id=execution.id,
                event_type=etype,
                message=msg,
                timestamp=_ts(3000 - i * 300),
            )
            execution.events.append(evt)
            store.events.append(evt)

        execution.evidence_ids = [gen_id("ev_") for _ in range(3)]
        store.executions.add(execution)


def _seed_evidence() -> None:
    executions = store.executions.all()
    agents = store.agents.all()
    models = store.models.all()

    for i, execution in enumerate(executions[:6]):
        agent = agents[i % len(agents)]
        model = models[i % len(models)]

        evidence_types = [EvidenceType.CODE_CHANGE, EvidenceType.TEST, EvidenceType.SECURITY]
        for j, etype in enumerate(evidence_types):
            e = Evidence(
                tenant_id=TENANT_ID,
                id=gen_id("ev_"),
                execution_id=execution.id,
                evidence_type=etype,
                agent_id=agent.id,
                agent_version=agent.current_version,
                model_used=model.model,
                harness_id=execution.harness_id,
                inputs={"request": f"Process {etype.value} for execution {execution.id[:8]}"},
                outputs={
                    "status": "success",
                    "files_changed": 5 + j,
                    "lines_added": 120 + j * 30,
                    "lines_removed": 15 + j * 5,
                },
                code_changes=[
                    {"file": f"src/main/Service{i}.java", "additions": 45, "deletions": 3, "type": "modified"},
                    {"file": f"src/test/ServiceTest{i}.java", "additions": 75, "deletions": 0, "type": "created"},
                ] if etype == EvidenceType.CODE_CHANGE else [],
                test_results={"total": 42, "passed": 40, "failed": 0, "skipped": 2} if etype == EvidenceType.TEST else {},
                security_results={"critical": 0, "high": 0, "medium": 2, "low": 5} if etype == EvidenceType.SECURITY else {},
                policies_applied=["agent-sandbox-isolation", "token-budget-enforcement"],
                timestamp=_ts(2000 - i * 200),
                hash=f"sha256:{'b3c4d5' * 10}",
                summary=f"{etype.value} evidence for execution {execution.id[:8]}",
            )
            store.evidence.add(e)


def _seed_engineering_state() -> None:
    apps = store.applications.all()
    for i, app in enumerate(apps):
        es = EngineeringState(
            tenant_id=TENANT_ID,
            id=gen_id("es_"),
            application_id=app.id,
            repository=app.repository.url if app.repository else f"git@github.com:forgeiq/{app.name}.git",
            branch="main",
            commit=f"abc123{i}def456",
            version=app.current_version,
            architecture={
                "pattern": "microservices" if i % 2 == 0 else "modular-monolith",
                "layers": ["api", "service", "repository", "domain"],
                "services": 3 + i,
            },
            technologies=app.technologies,
            dependencies=[
                {"name": "react", "version": "19.0.0", "type": "frontend"} if "React" in app.technologies else {"name": "spring-boot", "version": "3.3.0", "type": "backend"},
                {"name": "postgresql", "version": "16.2", "type": "database"},
                {"name": "redis", "version": "7.2", "type": "cache"},
            ],
            apis=[
                {"path": "/api/v1/users", "method": "GET", "authenticated": True},
                {"path": "/api/v1/users", "method": "POST", "authenticated": True},
                {"path": "/api/v1/orders", "method": "GET", "authenticated": True},
                {"path": "/api/v1/health", "method": "GET", "authenticated": False},
            ],
            tests={"total": 245 + i * 30, "passed": 240 + i * 28, "failed": 2, "skipped": 3, "coverage_pct": 78 + i * 2},
            security={"sast_findings": 3 + i, "dependency_vulnerabilities": 1 + i, "last_scan": _ts(500)},
            build={"status": "passing", "last_build": _ts(200), "build_time_seconds": 180 + i * 20},
            release={"last_version": app.current_version, "release_date": _ts(1000)},
            deployment={"environment": "production" if i < 3 else "staging", "last_deploy": _ts(300), "strategy": "rolling"},
            known_issues=[{"id": f"ISSUE-{i+1}", "severity": "medium", "description": "Memory leak in connection pool under high load", "status": "open"}] if i % 2 == 0 else [],
            open_changes=[{"branch": f"feature/req-{i+1}", "files": 8 + i, "status": "review"}] if i < 4 else [],
            health_score=0.92 - i * 0.05,
            coverage_pct=78 + i * 2,
            security_findings=3 + i,
            open_vulnerabilities=1 if i < 3 else 0,
            last_updated=_ts(500),
        )
        es.decisions = [
            EngineeringDecision(
                tenant_id=TENANT_ID,
                id=gen_id("dec_"),
                application_id=app.id,
                decision=f"Use event-driven architecture for {app.display_name}",
                rationale="Enables better scalability and decoupling between services",
                decided_by="Marcus Rivera",
                impact="HIGH",
                tags=["architecture"],
                created_at=_ts(2000),
            ),
            EngineeringDecision(
                tenant_id=TENANT_ID,
                id=gen_id("dec_"),
                application_id=app.id,
                decision=f"Adopt Redis for caching layer",
                rationale="Reduces database load by 40% based on load testing",
                decided_by="Sarah Chen",
                impact="MEDIUM",
                tags=["infrastructure", "performance"],
                created_at=_ts(1500),
            ),
        ]
        store.engineering_states.add(es)
        app.engineering_state_id = es.id


def _seed_state_history() -> None:
    apps = store.applications.all()
    change_types = [
        ("commit_changed", "Commit updated from abc123 to def456", "version_control", "info", "abc123def456", "def456abc789"),
        ("dependency_changed", "Dependency 'react' upgraded from 18.2.0 to 19.0.0", "dependencies", "info", "18.2.0", "19.0.0"),
        ("api_added", "New API endpoint POST /api/v1/payments added", "api", "info", None, "POST /api/v1/payments"),
        ("test_coverage_changed", "Test coverage improved from 72% to 78%", "testing", "info", "72%", "78%"),
        ("security_finding_added", "SAST scan found new medium-severity finding in PaymentService", "security", "warning", None, "medium"),
        ("security_finding_resolved", "Security finding XSS-001 resolved in user input handler", "security", "info", "open", "resolved"),
        ("deployment_completed", "Deployment to production completed successfully", "deployment", "info", "staging", "production"),
        ("architecture_updated", "Architecture pattern changed from monolith to microservices", "architecture", "info", "monolith", "microservices"),
        ("build_status_changed", "Build status changed from failing to passing", "build", "info", "failing", "passing"),
        ("version_changed", "Application version bumped from 0.9.0 to 1.0.0", "version", "info", "0.9.0", "1.0.0"),
        ("known_issue_added", "New known issue: Memory leak in connection pool under high load", "issues", "warning", None, "ISSUE-1"),
        ("known_issue_resolved", "Known issue ISSUE-2 resolved: API timeout on cold start", "issues", "info", "open", "resolved"),
        ("open_change_added", "New pull request feature/payment-retry opened", "changes", "info", None, "feature/payment-retry"),
        ("open_change_merged", "Pull request feature/auth-improvements merged to main", "changes", "info", "open", "merged"),
        ("decision_recorded", "Architecture decision: Adopt event-driven architecture", "governance", "info", None, "event-driven"),
        ("evidence_added", "Build evidence linked from execution", "evidence", "info", None, "evd_abc123"),
        ("technology_added", "New technology adopted: Redis for caching", "technology", "info", None, "Redis"),
        ("health_score_changed", "Health score improved from 0.78 to 0.92", "health", "info", "0.78", "0.92"),
    ]

    for i, app in enumerate(apps):
        es = None
        for s in store.engineering_states.all():
            if s.application_id == app.id:
                es = s
                break
        if not es:
            continue

        num_changes = 8 + (i % 6)
        for j in range(num_changes):
            ct = change_types[(j + i) % len(change_types)]
            change_type, desc, category, severity, before, after = ct
            record = StateChangeRecord(
                tenant_id=TENANT_ID,
                id=gen_id("sch_"),
                application_id=app.id,
                state_id=es.id,
                change_type=change_type,
                description=desc,
                before_value=before,
                after_value=after,
                category=category,
                severity=severity,
                metadata={"app_index": i, "change_index": j},
                created_at=_ts(3000 - j * 150 - i * 50),
            )
            store.state_changes.add(record)
            es.change_history_ids.append(record.id)


def _seed_deployments() -> None:
    apps = store.applications.all()
    envs = store.environments.all()
    artifacts = store.artifacts.all()

    for i in range(6):
        app = apps[i % len(apps)]
        env = [e for e in envs if e.application_id == app.id]
        env = env[-1] if env else envs[0]
        artifact = artifacts[i % len(artifacts)] if artifacts else None

        d = Deployment(
            tenant_id=TENANT_ID,
            id=gen_id("dep_"),
            application_id=app.id,
            environment_id=env.id,
            artifact_id=artifact.id if artifact else None,
            version=app.current_version,
            status="completed" if i < 4 else ("running" if i == 4 else "pending"),
            strategy="rolling" if i % 2 == 0 else "blue-green",
            started_at=_ts(1000 - i * 100),
            completed_at=_ts(1000 - i * 100 - 60) if i < 4 else None,
            verified=i < 3,
            verification_results={"health_checks": "passed", "smoke_tests": "passed"} if i < 3 else {},
            rollback_supported=True,
            health_checks=[
                {"name": "liveness", "status": "passed"},
                {"name": "readiness", "status": "passed"},
                {"name": "smoke-test", "status": "passed" if i < 3 else "pending"},
            ],
            created_at=_ts(1000 - i * 100),
        )
        store.deployments.add(d)


def _seed_semantic_entities() -> None:
    apps = store.applications.all()
    for app in apps[:2]:
        entities = [
            (SemanticEntityType.MODULE, "src/main/java", "src/main/java", "Java source module"),
            (SemanticEntityType.SERVICE, "PaymentService", "src/main/java/com/forgeiq/PaymentService.java", "Payment processing service"),
            (SemanticEntityType.CONTROLLER, "PaymentController", "src/main/java/com/forgeiq/PaymentController.java", "REST controller for payment endpoints"),
            (SemanticEntityType.CLASS, "Order", "src/main/java/com/forgeiq/model/Order.java", "Order domain entity"),
            (SemanticEntityType.FUNCTION, "processPayment", "src/main/java/com/forgeiq/PaymentService.java", "Process payment transaction"),
            (SemanticEntityType.API, "POST /api/v1/payments", "", "Create payment endpoint"),
            (SemanticEntityType.TEST, "PaymentServiceTest", "src/test/java/com/forgeiq/PaymentServiceTest.java", "Payment service tests"),
            (SemanticEntityType.BUILD_SYSTEM, "pom.xml", "pom.xml", "Maven build configuration"),
        ]
        for etype, name, path, desc in entities:
            se = SemanticEntity(
                tenant_id=TENANT_ID,
                id=gen_id("se_"),
                application_id=app.id,
                entity_type=etype,
                name=name,
                qualified_name=f"com.forgeiq.{name}",
                file_path=path,
                properties={"description": desc},
                created_at=_ts(3000),
            )
            store.semantic_entities.add(se)
