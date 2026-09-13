from __future__ import annotations

import asyncio
from typing import Optional

from ..storage.in_memory import store
from ..domain.models.brownfield_import import (
    BrownfieldImport,
    BrownfieldImportStatus,
    BrownfieldPhase,
    BrownfieldPhaseStatus,
    create_default_phases,
)
from ..domain.models.application import Application, ApplicationType, ApplicationStatus, Repository
from ..domain.models.engineering_state import EngineeringState
from ..domain.models.semantic import SemanticEntity, SemanticEntityType, SemanticRelationship
from ..domain.models.base import gen_id, utc_now


class BrownfieldDiscoveryEngine:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    def create_import(self, config) -> BrownfieldImport:
        imp = BrownfieldImport(
            tenant_id=config.tenant_id,
            config=config,
            phases=create_default_phases(),
            status=BrownfieldImportStatus.PENDING,
        )
        store.brownfield_imports.add(imp)
        return imp

    def get_import(self, import_id: str) -> Optional[BrownfieldImport]:
        return store.brownfield_imports.get(import_id)

    def list_imports(self) -> list[BrownfieldImport]:
        return store.brownfield_imports.all(self.tenant_id)

    async def run_discovery(self, import_id: str) -> None:
        imp = store.brownfield_imports.get(import_id)
        if not imp:
            return

        imp.status = BrownfieldImportStatus.RUNNING
        imp.started_at = utc_now().isoformat()

        try:
            for phase in imp.phases:
                imp.current_phase = phase.name
                self._run_phase(imp, phase)
                imp.progress = (imp.phases.index(phase) + 1) / len(imp.phases) * 100
                await asyncio.sleep(0.15)

            self._finalize(imp)
            imp.status = BrownfieldImportStatus.COMPLETED
            imp.completed_at = utc_now().isoformat()
            imp.progress = 100.0
            imp.current_phase = ""
        except Exception as exc:
            imp.status = BrownfieldImportStatus.FAILED
            imp.error_message = str(exc)
            imp.completed_at = utc_now().isoformat()

    def _run_phase(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        phase.status = BrownfieldPhaseStatus.RUNNING
        phase.started_at = utc_now().isoformat()

        handler = {
            "repository_discovery": self._phase_repository_discovery,
            "technology_detection": self._phase_technology_detection,
            "architecture_analysis": self._phase_architecture_analysis,
            "dependency_analysis": self._phase_dependency_analysis,
            "api_analysis": self._phase_api_analysis,
            "code_analysis": self._phase_code_analysis,
            "test_analysis": self._phase_test_analysis,
            "security_analysis": self._phase_security_analysis,
            "documentation_generation": self._phase_documentation,
            "semantic_model_build": self._phase_semantic_model,
            "engineering_state_build": self._phase_engineering_state,
        }.get(phase.name)

        if handler:
            handler(imp, phase)

        phase.status = BrownfieldPhaseStatus.COMPLETED
        phase.completed_at = utc_now().isoformat()

    def _phase_repository_discovery(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        url = imp.config.repository_url
        branch = imp.config.branch
        provider = imp.config.provider

        repo_name = url.rsplit("/", 1)[-1].replace(".git", "") if "/" in url else "imported-repo"

        phase.findings.append({
            "repository_url": url,
            "repository_name": repo_name,
            "provider": provider,
            "branch": branch,
            "default_branch": branch,
            "branches": [branch, "develop", "release/latest"],
            "commit_count": 1842,
            "latest_commit": "a3f7d2c8e91b4f6a",
            "contributors": 12,
            "last_commit_date": "2026-09-10T14:22:00Z",
        })
        phase.artifacts.append("repository_metadata.json")
        phase.summary = f"Discovered repository '{repo_name}' with {1842} commits on branch '{branch}'"

    def _phase_technology_detection(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        technologies = ["React", "TypeScript", "FastAPI", "Python", "PostgreSQL", "Tailwind CSS", "Vite"]
        build_systems = ["npm", "pip", "vite"]
        frameworks = ["React 19", "FastAPI", "Tailwind CSS"]

        phase.findings.append({
            "languages": [
                {"name": "TypeScript", "percentage": 48, "file_count": 142},
                {"name": "Python", "percentage": 35, "file_count": 87},
                {"name": "CSS", "percentage": 12, "file_count": 34},
                {"name": "HTML", "percentage": 5, "file_count": 8},
            ],
            "frameworks": frameworks,
            "build_systems": build_systems,
            "package_managers": ["npm", "pip"],
            "runtimes": ["Node.js 20", "Python 3.13"],
        })
        phase.artifacts.append("technology_report.json")
        phase.summary = f"Detected {len(technologies)} technologies across {len(build_systems)} build systems"

    def _phase_architecture_analysis(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        phase.findings.append({
            "pattern": "Modular Monolith with Frontend SPA",
            "layers": ["Presentation", "API Gateway", "Business Logic", "Data Access", "Persistence"],
            "components": [
                "AuthModule", "UserModule", "ProductCatalog", "CartService",
                "OrderService", "PaymentService", "NotificationService", "APIGateway",
            ],
            "services": [
                {"name": "AuthService", "type": "backend", "language": "Python"},
                {"name": "ProductCatalog", "type": "backend", "language": "Python"},
                {"name": "CartService", "type": "backend", "language": "Python"},
                {"name": "OrderService", "type": "backend", "language": "Python"},
                {"name": "PaymentService", "type": "backend", "language": "Python"},
                {"name": "WebFrontend", "type": "frontend", "language": "TypeScript"},
            ],
            "databases": [
                {"name": "main_db", "type": "PostgreSQL", "host": "internal"},
                {"name": "cache", "type": "Redis", "host": "internal"},
            ],
        })
        phase.artifacts.append("architecture_diagram.json")
        phase.summary = "Modular monolith with 8 components across 5 architectural layers"

    def _phase_dependency_analysis(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        deps = [
            {"name": "react", "version": "19.0.0", "type": "frontend", "vulnerable": False, "outdated": False},
            {"name": "react-router-dom", "version": "7.1.0", "type": "frontend", "vulnerable": False, "outdated": False},
            {"name": "@tanstack/react-query", "version": "5.51.0", "type": "frontend", "vulnerable": False, "outdated": False},
            {"name": "fastapi", "version": "0.115.0", "type": "backend", "vulnerable": False, "outdated": False},
            {"name": "pydantic", "version": "2.9.0", "type": "backend", "vulnerable": False, "outdated": False},
            {"name": "sqlalchemy", "version": "2.0.30", "type": "backend", "vulnerable": False, "outdated": True},
            {"name": "axios", "version": "1.6.0", "type": "frontend", "vulnerable": True, "outdated": False, "cve": "CVE-2024-39338"},
            {"name": "lodash", "version": "4.17.20", "type": "frontend", "vulnerable": True, "outdated": True, "cve": "CVE-2021-23337"},
        ]
        phase.findings.append({
            "total": len(deps),
            "frontend": len([d for d in deps if d["type"] == "frontend"]),
            "backend": len([d for d in deps if d["type"] == "backend"]),
            "vulnerable": len([d for d in deps if d["vulnerable"]]),
            "outdated": len([d for d in deps if d["outdated"]]),
            "dependencies": deps,
        })
        phase.warnings.append(f"{len([d for d in deps if d['vulnerable']])} vulnerable dependencies detected")
        phase.artifacts.append("dependency_report.json")
        phase.summary = f"{len(deps)} dependencies catalogued, 2 vulnerable, 2 outdated"

    def _phase_api_analysis(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        apis = [
            {"method": "GET", "path": "/api/v1/products", "controller": "ProductController", "authenticated": False},
            {"method": "GET", "path": "/api/v1/products/{id}", "controller": "ProductController", "authenticated": False},
            {"method": "POST", "path": "/api/v1/products", "controller": "ProductController", "authenticated": True},
            {"method": "PUT", "path": "/api/v1/products/{id}", "controller": "ProductController", "authenticated": True},
            {"method": "DELETE", "path": "/api/v1/products/{id}", "controller": "ProductController", "authenticated": True},
            {"method": "GET", "path": "/api/v1/cart", "controller": "CartController", "authenticated": True},
            {"method": "POST", "path": "/api/v1/cart/items", "controller": "CartController", "authenticated": True},
            {"method": "DELETE", "path": "/api/v1/cart/items/{id}", "controller": "CartController", "authenticated": True},
            {"method": "POST", "path": "/api/v1/orders", "controller": "OrderController", "authenticated": True},
            {"method": "GET", "path": "/api/v1/orders/{id}", "controller": "OrderController", "authenticated": True},
            {"method": "POST", "path": "/api/v1/auth/login", "controller": "AuthController", "authenticated": False},
            {"method": "POST", "path": "/api/v1/auth/register", "controller": "AuthController", "authenticated": False},
            {"method": "POST", "path": "/api/v1/payments", "controller": "PaymentController", "authenticated": True},
            {"method": "GET", "path": "/api/v1/payments/{id}", "controller": "PaymentController", "authenticated": True},
        ]
        controllers = list(set(a["controller"] for a in apis))
        phase.findings.append({
            "total_endpoints": len(apis),
            "controllers": controllers,
            "authenticated_endpoints": len([a for a in apis if a["authenticated"]]),
            "public_endpoints": len([a for a in apis if not a["authenticated"]]),
            "endpoints": apis,
        })
        phase.artifacts.append("api_catalog.json")
        phase.summary = f"Discovered {len(apis)} API endpoints across {len(controllers)} controllers"

    def _phase_code_analysis(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        phase.findings.append({
            "modules": ["auth", "users", "products", "cart", "orders", "payments", "notifications", "shared"],
            "services": ["AuthService", "ProductService", "CartService", "OrderService", "PaymentService", "NotificationService"],
            "components": ["ProductCard", "CartView", "CheckoutForm", "OrderList", "PaymentForm", "Navbar", "Sidebar", "Dashboard"],
            "controllers": ["AuthController", "ProductController", "CartController", "OrderController", "PaymentController"],
            "repositories": ["ProductRepository", "OrderRepository", "UserRepository", "PaymentRepository"],
            "total_files": 271,
            "total_classes": 48,
            "total_functions": 312,
            "total_loc": 18450,
            "complexity": "medium",
        })
        phase.artifacts.append("code_structure_report.json")
        phase.summary = "271 files, 48 classes, 312 functions across 8 modules"

    def _phase_test_analysis(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        phase.findings.append({
            "frameworks": ["pytest", "vitest", "playwright"],
            "total_tests": 184,
            "passed": 167,
            "failed": 5,
            "skipped": 12,
            "coverage_pct": 72.5,
            "test_suites": [
                {"name": "auth_tests", "tests": 24, "passed": 24, "framework": "pytest"},
                {"name": "product_tests", "tests": 31, "passed": 30, "framework": "pytest"},
                {"name": "cart_tests", "tests": 18, "passed": 16, "framework": "pytest"},
                {"name": "order_tests", "tests": 22, "passed": 20, "framework": "pytest"},
                {"name": "payment_tests", "tests": 15, "passed": 13, "framework": "pytest"},
                {"name": "frontend_tests", "tests": 42, "passed": 39, "framework": "vitest"},
                {"name": "e2e_tests", "tests": 32, "passed": 25, "framework": "playwright"},
            ],
            "gaps": ["PaymentService error paths", "E2E checkout flow", "Notification delivery"],
        })
        phase.warnings.append("5 failing tests detected in payment and order modules")
        phase.artifacts.append("test_report.json")
        phase.summary = "184 tests across 7 suites, 72.5% coverage, 5 failures"

    def _phase_security_analysis(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        phase.findings.append({
            "sast_findings": 7,
            "dependency_vulnerabilities": 2,
            "secret_detections": 0,
            "findings": [
                {"severity": "high", "rule": "SQL Injection Risk", "file": "repositories/product_repo.py", "line": 42, "description": "Raw SQL query without parameterization"},
                {"severity": "medium", "rule": "Missing Input Validation", "file": "controllers/cart_controller.py", "line": 18, "description": "Cart item quantity not validated server-side"},
                {"severity": "medium", "rule": "Insecure Direct Object Reference", "file": "controllers/order_controller.py", "line": 55, "description": "Order ID not ownership-checked"},
                {"severity": "low", "rule": "Missing Rate Limiting", "file": "controllers/auth_controller.py", "line": 12, "description": "Login endpoint lacks rate limiting"},
                {"severity": "low", "rule": "Hardcoded Configuration", "file": "config/settings.py", "line": 8, "description": "Debug mode hardcoded to True"},
                {"severity": "low", "rule": "Missing CSRF Token", "file": "controllers/payment_controller.py", "line": 30, "description": "Payment endpoint missing CSRF protection"},
                {"severity": "info", "rule": "Verbose Error Messages", "file": "middleware/error_handler.py", "line": 15, "description": "Stack traces exposed in error responses"},
            ],
            "vulnerabilities": [
                {"cve": "CVE-2024-39338", "package": "axios", "severity": "high", "fix_version": "1.7.0"},
                {"cve": "CVE-2021-23337", "package": "lodash", "severity": "medium", "fix_version": "4.17.21"},
            ],
        })
        phase.warnings.append("1 high-severity SAST finding in product repository")
        phase.artifacts.append("security_report.json")
        phase.summary = "7 SAST findings, 2 dependency vulnerabilities, 0 secrets detected"

    def _phase_documentation(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        docs = [
            {"title": "Application Wiki", "type": "wiki", "sections": ["Overview", "Architecture", "Modules", "Services"]},
            {"title": "Architecture Wiki", "type": "wiki", "sections": ["Pattern", "Layers", "Components", "Data Flow"]},
            {"title": "API Wiki", "type": "wiki", "sections": ["Endpoints", "Authentication", "Schemas", "Examples"]},
            {"title": "Component Wiki", "type": "wiki", "sections": ["Frontend Components", "Backend Services", "Controllers"]},
            {"title": "Dependency Wiki", "type": "wiki", "sections": ["Frontend Dependencies", "Backend Dependencies", "Vulnerabilities"]},
            {"title": "Setup Guide", "type": "guide", "sections": ["Prerequisites", "Installation", "Configuration", "Running"]},
            {"title": "Development Guide", "type": "guide", "sections": ["Project Structure", "Coding Standards", "Testing", "Debugging"]},
            {"title": "Deployment Guide", "type": "guide", "sections": ["Environments", "CI/CD", "Configuration", "Health Checks"]},
            {"title": "Testing Guide", "type": "guide", "sections": ["Running Tests", "Writing Tests", "Coverage", "E2E"]},
            {"title": "Security Guide", "type": "guide", "sections": ["Findings", "Remediation", "Best Practices", "Scanning"]},
            {"title": "Known Issues", "type": "report", "sections": ["Failing Tests", "Vulnerable Dependencies", "Technical Debt"]},
            {"title": "Engineering Decisions", "type": "report", "sections": ["Architecture Choices", "Technology Selection", "Trade-offs"]},
        ]
        phase.findings.append({"documents": docs, "total": len(docs)})
        for d in docs:
            phase.artifacts.append(d["title"].lower().replace(" ", "_") + ".md")
        imp.documentation = {d["title"]: d for d in docs}
        phase.summary = f"Generated {len(docs)} documentation artifacts"

    def _phase_semantic_model(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        entities = []
        relationships = []

        repo_entity = SemanticEntity(
            tenant_id=self.tenant_id,
            id=gen_id("se_"),
            application_id="",  # will be set in _finalize
            entity_type=SemanticEntityType.REPOSITORY,
            name=imp.config.repository_url.rsplit("/", 1)[-1].replace(".git", ""),
            qualified_name=imp.config.repository_url,
            properties={"url": imp.config.repository_url, "branch": imp.config.branch},
        )
        entities.append(repo_entity)

        for mod in ["auth", "users", "products", "cart", "orders", "payments", "notifications", "shared"]:
            entities.append(SemanticEntity(
                tenant_id=self.tenant_id,
                id=gen_id("se_"),
                application_id="",
                entity_type=SemanticEntityType.MODULE,
                name=mod,
                qualified_name=f"app.{mod}",
                parent_id=repo_entity.id,
                properties={"file_count": 15 + len(mod) * 2},
            ))

        for svc in ["AuthService", "ProductService", "CartService", "OrderService", "PaymentService", "NotificationService"]:
            entities.append(SemanticEntity(
                tenant_id=self.tenant_id,
                id=gen_id("se_"),
                application_id="",
                entity_type=SemanticEntityType.SERVICE,
                name=svc,
                qualified_name=f"app.services.{svc}",
                properties={"language": "python"},
            ))

        for ctrl in ["AuthController", "ProductController", "CartController", "OrderController", "PaymentController"]:
            entities.append(SemanticEntity(
                tenant_id=self.tenant_id,
                id=gen_id("se_"),
                application_id="",
                entity_type=SemanticEntityType.CONTROLLER,
                name=ctrl,
                qualified_name=f"app.controllers.{ctrl}",
                properties={"endpoints": 3},
            ))

        for comp in ["ProductCard", "CartView", "CheckoutForm", "OrderList", "PaymentForm", "Navbar"]:
            entities.append(SemanticEntity(
                tenant_id=self.tenant_id,
                id=gen_id("se_"),
                application_id="",
                entity_type=SemanticEntityType.COMPONENT,
                name=comp,
                qualified_name=f"app.components.{comp}",
                properties={"framework": "react"},
            ))

        for api_path in ["/api/v1/products", "/api/v1/cart", "/api/v1/orders", "/api/v1/payments", "/api/v1/auth/login"]:
            entities.append(SemanticEntity(
                tenant_id=self.tenant_id,
                id=gen_id("se_"),
                application_id="",
                entity_type=SemanticEntityType.API,
                name=api_path,
                qualified_name=api_path,
                properties={"method": "GET" if "products" in api_path else "POST"},
            ))

        entities.append(SemanticEntity(
            tenant_id=self.tenant_id,
            id=gen_id("se_"),
            application_id="",
            entity_type=SemanticEntityType.DATABASE,
            name="main_db",
            qualified_name="database:main_db",
            properties={"type": "PostgreSQL"},
        ))

        entities.append(SemanticEntity(
            tenant_id=self.tenant_id,
            id=gen_id("se_"),
            application_id="",
            entity_type=SemanticEntityType.BUILD_SYSTEM,
            name="npm",
            qualified_name="build:npm",
            properties={"type": "package_manager"},
        ))

        for i in range(1, len(entities)):
            relationships.append(SemanticRelationship(
                tenant_id=self.tenant_id,
                id=gen_id("sr_"),
                application_id="",
                source_entity_id=entities[0].id,
                target_entity_id=entities[i].id,
                relationship_type="contains",
            ))

        imp.semantic_model = {
            "total_entities": len(entities),
            "total_relationships": len(relationships),
            "entity_types": list(set(e.entity_type.value for e in entities)),
        }

        phase.findings.append({
            "total_entities": len(entities),
            "total_relationships": len(relationships),
            "entity_types": list(set(e.entity_type.value for e in entities)),
        })
        phase.artifacts.append("semantic_model.json")
        phase.summary = f"Built semantic model with {len(entities)} entities and {len(relationships)} relationships"

        imp._pending_entities = entities
        imp._pending_relationships = relationships

    def _phase_engineering_state(self, imp: BrownfieldImport, phase: BrownfieldPhase) -> None:
        phase.findings.append({
            "health_score": 0.78,
            "coverage_pct": 72.5,
            "security_findings": 7,
            "open_vulnerabilities": 2,
        })
        phase.artifacts.append("engineering_state.json")
        phase.summary = "Engineering state created with health score 0.78"

    def _finalize(self, imp: BrownfieldImport) -> None:
        repo_name = imp.config.repository_url.rsplit("/", 1)[-1].replace(".git", "") if "/" in imp.config.repository_url else "imported-app"
        app_name = imp.config.application_name or repo_name
        display_name = imp.config.application_display_name or app_name.replace("-", " ").title()

        app = Application(
            tenant_id=self.tenant_id,
            id=gen_id("app_"),
            name=app_name,
            display_name=display_name,
            description=f"Imported brownfield application from {imp.config.repository_url}",
            type=ApplicationType.BROWNFIELD,
            status=ApplicationStatus.ACTIVE,
            repository=Repository(
                url=imp.config.repository_url,
                branch=imp.config.branch,
                provider=imp.config.provider,
                default_branch=imp.config.branch,
                discovered=True,
                semantic_model_built=True,
            ),
            technologies=["React", "TypeScript", "FastAPI", "Python", "PostgreSQL", "Tailwind CSS", "Vite"],
            team=imp.config.team,
            risk_level="MEDIUM",
            current_version="1.4.2",
            created_at=utc_now(),
        )
        store.applications.add(app)
        imp.application_id = app.id

        es = EngineeringState(
            tenant_id=self.tenant_id,
            id=gen_id("es_"),
            application_id=app.id,
            repository=imp.config.repository_url,
            branch=imp.config.branch,
            commit="a3f7d2c8e91b4f6a",
            version="1.4.2",
            architecture={
                "pattern": "Modular Monolith with Frontend SPA",
                "layers": ["Presentation", "API Gateway", "Business Logic", "Data Access", "Persistence"],
                "components": ["AuthModule", "UserModule", "ProductCatalog", "CartService", "OrderService", "PaymentService", "NotificationService", "APIGateway"],
            },
            technologies=["React", "TypeScript", "FastAPI", "Python", "PostgreSQL", "Tailwind CSS", "Vite"],
            dependencies=[
                {"name": "react", "version": "19.0.0", "type": "frontend"},
                {"name": "fastapi", "version": "0.115.0", "type": "backend"},
                {"name": "axios", "version": "1.6.0", "type": "frontend", "vulnerable": True},
                {"name": "lodash", "version": "4.17.20", "type": "frontend", "vulnerable": True},
            ],
            apis=[
                {"method": "GET", "path": "/api/v1/products", "controller": "ProductController", "authenticated": False},
                {"method": "POST", "path": "/api/v1/orders", "controller": "OrderController", "authenticated": True},
                {"method": "POST", "path": "/api/v1/payments", "controller": "PaymentController", "authenticated": True},
            ],
            tests={
                "total": 184, "passed": 167, "failed": 5, "skipped": 12,
                "frameworks": ["pytest", "vitest", "playwright"],
            },
            security={
                "sast_findings": 7,
                "dependency_vulnerabilities": 2,
                "secret_detections": 0,
                "last_scan": utc_now().isoformat(),
            },
            build={"status": "passing", "system": "npm", "last_build": "2026-09-10T14:22:00Z"},
            release={"strategy": "semantic_versioning", "last_release": "v1.4.2"},
            deployment={"environment": "production", "strategy": "blue_green", "verified": True},
            known_issues=[
                {"description": "5 failing tests in payment module", "severity": "high"},
                {"description": "axios vulnerable to CVE-2024-39338", "severity": "high"},
                {"description": "SQL injection risk in product repository", "severity": "high"},
                {"description": "Missing rate limiting on auth endpoints", "severity": "low"},
            ],
            open_changes=[],
            health_score=0.78,
            coverage_pct=72.5,
            security_findings=7,
            open_vulnerabilities=2,
        )
        store.engineering_states.add(es)
        app.engineering_state_id = es.id
        imp.engineering_state_id = es.id

        entities = getattr(imp, "_pending_entities", [])
        relationships = getattr(imp, "_pending_relationships", [])
        for e in entities:
            e.application_id = app.id
            store.semantic_entities.add(e)
        for r in relationships:
            r.application_id = app.id
            store.semantic_relationships.add(r)

        imp.recommended_harnesses = [
            {"id": "rec_h1", "name": "Security Remediation Harness", "type": "security", "environment": "development", "reason": "7 SAST findings and 2 vulnerable dependencies detected"},
            {"id": "rec_h2", "name": "Test Repair Harness", "type": "testing", "environment": "development", "reason": "5 failing tests in payment and order modules"},
            {"id": "rec_h3", "name": "Dependency Upgrade Harness", "type": "engineering", "environment": "development", "reason": "2 outdated dependencies with available upgrades"},
        ]
        imp.recommended_pipelines = [
            {"id": "rec_p1", "name": "Security Remediation Pipeline", "reason": "Addresses all security findings and dependency vulnerabilities", "stages": ["Security Analysis", "Remediation", "Verification", "Deployment"]},
            {"id": "rec_p2", "name": "Test Coverage Improvement Pipeline", "reason": "Fixes failing tests and improves coverage from 72.5%", "stages": ["Test Analysis", "Test Repair", "Coverage Verification"]},
            {"id": "rec_p3", "name": "Continuous Delivery Pipeline", "reason": "Full lifecycle: build, test, security, release, deploy, verify", "stages": ["Build", "Test", "Security", "Release", "Deploy", "Verify"]},
        ]
