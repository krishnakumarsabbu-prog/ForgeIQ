from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .storage.in_memory import store
from .storage.seed import seed_all
from .api.routes import (
    tenants, applications, agents, skills, tools, models,
    harnesses, graphs, loops, pipelines, executions, evidence,
    engineering_state, policies, requirements, delivery, semantic, brownfield,
    peer_engineering,
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
app.include_router(brownfield.router, prefix=api_prefix)
app.include_router(peer_engineering.router, prefix=api_prefix)


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


def _duration_seconds(started: str | None, completed: str | None) -> int:
    if not started:
        return 0
    from datetime import datetime
    try:
        s = datetime.fromisoformat(started)
        c = datetime.fromisoformat(completed) if completed else datetime.now()
        return int((c - s).total_seconds())
    except Exception:
        return 0


def _agent_name(agent_id: str | None) -> str:
    if not agent_id:
        return "N/A"
    a = store.agents.get(agent_id)
    return a.display_name if a else "N/A"


def _harness_name(hid: str | None) -> str:
    if not hid:
        return "N/A"
    h = store.harnesses.get(hid)
    return h.display_name if h else "N/A"


@app.get("/api/dashboard")
def dashboard():
    from datetime import datetime, timezone

    tenants = store.tenants.all()
    apps = store.applications.all()
    agents_list = store.agents.all()
    harnesses = store.harnesses.all()
    pipelines = store.pipelines.all()
    executions = store.executions.all()
    evidence = store.evidence.all()
    policies = store.policies.all()
    skills = store.skills.all()
    tools = store.tools.all()
    models = store.models.all()
    engineering_states = store.engineering_states.all()
    deployments = store.deployments.all()
    all_events = store.events

    status_counts: dict[str, int] = {"COMPLETED": 0, "RUNNING": 0, "FAILED": 0, "AWAITING_APPROVAL": 0, "PENDING": 0, "CANCELLED": 0}
    for e in executions:
        status_counts[e.status] = status_counts.get(e.status, 0) + 1

    total_tokens = sum(e.tokens_used for e in executions)
    total_cost = sum(e.cost_cents for e in executions)

    avg_health = sum(es.health_score for es in engineering_states) / len(engineering_states) if engineering_states else 0
    avg_coverage = sum(es.coverage_pct for es in engineering_states) / len(engineering_states) if engineering_states else 0
    total_findings = sum(es.security_findings for es in engineering_states)
    total_vulns = sum(es.open_vulnerabilities for es in engineering_states)

    # Active executions (RUNNING + AWAITING_APPROVAL)
    active_execs = sorted(
        [e for e in executions if e.status in ("RUNNING", "AWAITING_APPROVAL", "FAILED")],
        key=lambda x: x.created_at, reverse=True
    )[:12]

    # Engineering activity feed from events
    activity_items: list[dict] = []
    for evt in sorted(all_events, key=lambda x: x.timestamp, reverse=True)[:20]:
        app_name = "N/A"
        exec_obj = store.executions.get(evt.execution_id)
        if exec_obj and exec_obj.application_id:
            a = store.applications.get(exec_obj.application_id)
            if a:
                app_name = a.display_name
        activity_items.append({
            "id": evt.id,
            "event_type": evt.event_type.value,
            "message": evt.message,
            "timestamp": evt.timestamp,
            "application": app_name,
            "execution_id": evt.execution_id,
        })

    # Pipeline health
    pipeline_health: list[dict] = []
    for p in pipelines:
        p_execs = [e for e in executions if e.pipeline_id == p.id]
        runs = len(p_execs)
        succeeded = len([e for e in p_execs if e.status == "COMPLETED"])
        failed = len([e for e in p_execs if e.status == "FAILED"])
        durations = [_duration_seconds(e.started_at, e.completed_at) for e in p_execs if e.status == "COMPLETED" and e.started_at]
        avg_dur = sum(durations) / len(durations) if durations else 0
        last_run = max((e.created_at for e in p_execs), default="")
        app_name = "N/A"
        if p.application_id:
            a = store.applications.get(p.application_id)
            if a:
                app_name = a.display_name
        pipeline_health.append({
            "id": p.id,
            "name": p.display_name,
            "application": app_name,
            "runs": runs,
            "success": succeeded,
            "failures": failed,
            "avg_duration_seconds": round(avg_dur),
            "last_run": last_run,
        })

    # Economics breakdown
    cost_by_agent: dict[str, int] = {}
    for ev in evidence:
        if ev.agent_id:
            a = store.agents.get(ev.agent_id)
            name = a.display_name if a else ev.agent_id
            cost_by_agent[name] = cost_by_agent.get(name, 0) + 0
    # Distribute execution costs across agents involved
    for e in executions:
        exec_evidence = [ev for ev in evidence if ev.execution_id == e.id]
        if exec_evidence:
            per_agent = e.cost_cents / max(len(exec_evidence), 1)
            for ev in exec_evidence:
                a = store.agents.get(ev.agent_id) if ev.agent_id else None
                name = a.display_name if a else "Unknown"
                cost_by_agent[name] = cost_by_agent.get(name, 0) + int(per_agent)
        else:
            cost_by_agent["Unassigned"] = cost_by_agent.get("Unassigned", 0) + e.cost_cents

    cost_by_app: dict[str, int] = {}
    for e in executions:
        a = store.applications.get(e.application_id) if e.application_id else None
        name = a.display_name if a else "N/A"
        cost_by_app[name] = cost_by_app.get(name, 0) + e.cost_cents

    retry_cost = sum(e.cost_cents * e.retry_count / max(e.retry_count, 1) for e in executions if e.retry_count > 0)
    exec_time_total = sum(_duration_seconds(e.started_at, e.completed_at) for e in executions)

    # Security / Quality
    failed_tests = sum(
        es.tests.get("failed", 0) if isinstance(es.tests, dict) else 0
        for es in engineering_states
    )
    build_failures = len([e for e in executions if e.status == "FAILED" and "build" in (e.error_message or "").lower()])
    high_risk_changes = len([a for a in apps if a.risk_level in ("HIGH", "CRITICAL")])
    pending_approvals = len([e for e in executions if e.status == "AWAITING_APPROVAL"])

    # Recent applications
    recent_apps: list[dict] = []
    for a in sorted(apps, key=lambda x: x.created_at, reverse=True):
        es = store.engineering_states.get(a.engineering_state_id) if a.engineering_state_id else None
        app_execs = [e for e in executions if e.application_id == a.id]
        last_exec = max((e.created_at for e in app_execs), default=None)
        last_exec_status = "N/A"
        if app_execs:
            latest = sorted(app_execs, key=lambda x: x.created_at, reverse=True)[0]
            last_exec_status = latest.status
        env = "N/A"
        if es and isinstance(es.deployment, dict):
            env = es.deployment.get("environment", "N/A")
        commit = es.commit[:12] if es else "N/A"
        recent_apps.append({
            "id": a.id,
            "name": a.display_name,
            "type": a.type.value,
            "technology": a.technologies[0] if a.technologies else "N/A",
            "environment": env,
            "last_commit": commit,
            "engineering_state": f"{es.health_score:.0f}" if es else "N/A",
            "last_execution": last_exec_status,
            "status": a.status.value if hasattr(a.status, 'value') else str(a.status),
        })

    return {
        "counts": {
            "tenants": len(tenants),
            "applications": len(apps),
            "agents": len(agents_list),
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
        "active_executions": [
            {
                "id": e.id,
                "status": e.status,
                "progress": e.progress,
                "application": store.applications.get(e.application_id).display_name if e.application_id and store.applications.get(e.application_id) else "N/A",
                "application_id": e.application_id,
                "pipeline": store.pipelines.get(e.pipeline_id).display_name if e.pipeline_id and store.pipelines.get(e.pipeline_id) else "N/A",
                "pipeline_id": e.pipeline_id,
                "harness": _harness_name(e.harness_id),
                "harness_id": e.harness_id,
                "current_stage": e.current_stage or "N/A",
                "agent": _agent_name(e.harness_id) if False else _agent_name(_get_current_agent_id(e)),
                "duration_seconds": _duration_seconds(e.started_at, e.completed_at),
                "retries": e.retry_count,
                "cost_cents": e.cost_cents,
                "started_at": e.started_at,
                "tokens": e.tokens_used,
            }
            for e in active_execs
        ],
        "activity_feed": activity_items,
        "pipeline_health": pipeline_health,
        "economics_breakdown": {
            "ai_spend_cents": total_cost,
            "total_tokens": total_tokens,
            "execution_time_seconds": exec_time_total,
            "retry_cost_cents": int(retry_cost),
            "cost_by_agent": [{"name": k, "cost_cents": v} for k, v in sorted(cost_by_agent.items(), key=lambda x: -x[1])[:8]],
            "cost_by_application": [{"name": k, "cost_cents": v} for k, v in sorted(cost_by_app.items(), key=lambda x: -x[1])[:8]],
        },
        "security_quality": {
            "open_vulnerabilities": total_vulns,
            "failed_tests": failed_tests,
            "build_failures": build_failures,
            "high_risk_changes": high_risk_changes,
            "pending_approvals": pending_approvals,
            "security_findings": total_findings,
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
        "recent_applications": recent_apps,
        "success_rate": round(
            status_counts.get("COMPLETED", 0) / max(len(executions), 1) * 100, 1
        ),
        "throughput": len(executions),
    }


def _get_current_agent_id(exec) -> str | None:
    for evt in reversed(exec.events):
        if evt.agent_id:
            return evt.agent_id
    return None
