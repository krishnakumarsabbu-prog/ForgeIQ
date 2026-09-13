from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .storage.in_memory import store
from .storage.seed import seed_all
from .api.routes import (
    tenants, applications, agents, skills, tools, models,
    harnesses, graphs, loops, pipelines, executions, evidence,
    engineering_state, policies, requirements, delivery, semantic,
)

app = FastAPI(
    title="ForgeIQ AI Engineering Factory",
    description="Enterprise AI Engineering Factory - Harness Engineering Control Plane",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
api_prefix = "/api"
app.include_router(tenants.router, prefix=api_prefix)
app.include_router(applications.router, prefix=api_prefix)
app.include_router(requirements.router, prefix=api_prefix)
app.include_router(agents.router, prefix=api_prefix)
app.include_router(skills.router, prefix=api_prefix)
app.include_router(tools.router, prefix=api_prefix)
app.include_router(models.router, prefix=api_prefix)
app.include_router(harnesses.router, prefix=api_prefix)
app.include_router(graphs.router, prefix=api_prefix)
app.include_router(loops.router, prefix=api_prefix)
app.include_router(pipelines.router, prefix=api_prefix)
app.include_router(executions.router, prefix=api_prefix)
app.include_router(evidence.router, prefix=api_prefix)
app.include_router(engineering_state.router, prefix=api_prefix)
app.include_router(policies.router, prefix=api_prefix)
app.include_router(delivery.router, prefix=api_prefix)
app.include_router(semantic.router, prefix=api_prefix)


@app.on_event("startup")
def startup() -> None:
    if not store.tenants.all():
        seed_all()


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "ForgeIQ AI Engineering Factory",
        "version": "1.0.0",
        "tenants": len(store.tenants.all()),
        "applications": len(store.applications.all()),
        "agents": len(store.agents.all()),
        "harnesses": len(store.harnesses.all()),
        "pipelines": len(store.pipelines.all()),
        "executions": len(store.executions.all()),
        "evidence": len(store.evidence.all()),
    }


@app.get("/api/dashboard")
def dashboard():
    tenants = store.tenants.all()
    apps = store.applications.all()
    agents = store.agents.all()
    harnesses = store.harnesses.all()
    pipelines = store.pipelines.all()
    executions = store.executions.all()
    evidence = store.evidence.all()
    policies = store.policies.all()
    skills = store.skills.all()
    tools = store.tools.all()
    models = store.models.all()
    engineering_states = store.engineering_states.all()

    status_counts = {"COMPLETED": 0, "RUNNING": 0, "FAILED": 0, "AWAITING_APPROVAL": 0, "PENDING": 0}
    for e in executions:
        status_counts[e.status] = status_counts.get(e.status, 0) + 1

    total_tokens = sum(e.tokens_used for e in executions)
    total_cost = sum(e.cost_cents for e in executions)

    avg_health = sum(es.health_score for es in engineering_states) / len(engineering_states) if engineering_states else 0
    avg_coverage = sum(es.coverage_pct for es in engineering_states) / len(engineering_states) if engineering_states else 0
    total_findings = sum(es.security_findings for es in engineering_states)
    total_vulns = sum(es.open_vulnerabilities for es in engineering_states)

    return {
        "counts": {
            "tenants": len(tenants),
            "applications": len(apps),
            "agents": len(agents),
            "harnesses": len(harnesses),
            "pipelines": len(pipelines),
            "executions": len(executions),
            "evidence": len(evidence),
            "policies": len(policies),
            "skills": len(skills),
            "tools": len(tools),
            "models": len(models),
            "engineering_states": len(engineering_states),
        },
        "execution_status": status_counts,
        "economics": {
            "total_tokens": total_tokens,
            "total_cost_cents": total_cost,
            "total_cost_dollars": total_cost / 100,
        },
        "quality": {
            "avg_health_score": round(avg_health, 3),
            "avg_coverage_pct": round(avg_coverage, 1),
            "total_security_findings": total_findings,
            "total_open_vulnerabilities": total_vulns,
        },
        "recent_executions": [
            {
                "id": e.id,
                "status": e.status,
                "progress": e.progress,
                "application": store.applications.get(e.application_id).display_name if e.application_id and store.applications.get(e.application_id) else "N/A",
                "pipeline": store.pipelines.get(e.pipeline_id).display_name if e.pipeline_id and store.pipelines.get(e.pipeline_id) else "N/A",
                "started_at": e.started_at,
                "completed_at": e.completed_at,
                "tokens_used": e.tokens_used,
                "cost_cents": e.cost_cents,
                "retry_count": e.retry_count,
                "error_message": e.error_message,
            }
            for e in sorted(executions, key=lambda x: x.created_at, reverse=True)[:8]
        ],
        "applications_overview": [
            {
                "id": a.id,
                "name": a.display_name,
                "type": a.type.value,
                "risk_level": a.risk_level,
                "version": a.current_version,
                "technologies": a.technologies,
                "team": a.team,
                "pipelines": len(a.pipeline_ids),
                "requirements": len(a.requirement_ids),
            }
            for a in apps
        ],
    }
