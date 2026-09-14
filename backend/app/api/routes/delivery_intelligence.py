from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...storage.in_memory import store
from ...domain.models.base import gen_id, utc_now
from ...domain.models.delivery_state import (
    DeliveryProduct, Epic, Story, DeliveryTeam, Sprint,
    DeliveryDependency, DeliveryRisk, DeliveryRecommendation,
    DeliveryAction, DeliveryForecast, DeliveryState, ActionStatus,
)
from ...services.story_intelligence_harness import StoryIntelligenceHarness
from ...services.sprint_planning_harness import SprintPlanningHarness
from ...services.dependency_intelligence_harness import DependencyIntelligenceHarness
from ...services.sprint_health_harness import SprintHealthHarness
from ...services.forecasting_harness import ForecastingHarness
from ...services.delivery_copilot_service import DeliveryCopilotService
from ...services.cross_domain_bridge import CrossDomainBridge
from ...services.story_weaver_pipeline import DeliveryStoryHarness
from ...services.delivery_scheduler_harness import DailyScrumSchedulerHarness



router = APIRouter(prefix="/delivery-intelligence", tags=["delivery-intelligence"])


# ─── Request Schemas ─────────────────────────────────────────────────────────

class CapacityRequest(BaseModel):
    team_id: str
    working_days: int = 10
    pto_hours: float = 0.0
    focus_factor: float = 0.80


class SimulateScopeRequest(BaseModel):
    sprint_id: str
    selected_story_ids: list[str]
    simulated_pto_hours: Optional[float] = None


class TeamAllocationRequest(BaseModel):
    story_id: str


class SimulateSlipRequest(BaseModel):
    dependency_id: str
    slip_days: int = 2


class CopilotQueryRequest(BaseModel):
    prompt: str


class ActionApprovalRequest(BaseModel):
    approver: str = "Marcus Rivera (Engineering Lead)"
    notes: Optional[str] = "Approved after reviewing impact and automated test coverage."


# ─── 1. Command Center Cockpit ──────────────────────────────────────────────

@router.get("/command-center")
def get_command_center(tenant_id: str = "tenant_forgeiq"):
    sprints = [s for s in store.sprints.all(tenant_id) if s.status == "ACTIVE"]
    active_sprint = sprints[0] if sprints else None
    stories = store.stories.all(tenant_id)
    risks = store.delivery_risks.all(tenant_id)
    deps = store.delivery_dependencies.all(tenant_id)
    actions = store.delivery_actions.all(tenant_id)

    blocked_stories = [s for s in stories if s.status == "BLOCKED"]
    critical_risks = [r for r in risks if r.severity in ["CRITICAL", "HIGH"]]
    critical_deps = [d for d in deps if d.critical_path]

    # Health Harness evaluation
    health_engine = SprintHealthHarness(tenant_id)
    health_data = health_engine.evaluate_sprint_health(active_sprint.id) if active_sprint else {}

    # Forecast Harness
    forecast_engine = ForecastingHarness(tenant_id)
    forecast_data = forecast_engine.generate_release_forecast()

    return {
        "tenant_id": tenant_id,
        "active_sprint": active_sprint,
        "metrics_strip": {
            "sprint_goal_confidence": active_sprint.goal_achievement_prob if active_sprint else 88.0,
            "sprint_health_score": active_sprint.health_score if active_sprint else 85.0,
            "release_confidence": forecast_data.get("target_date_confidence_pct", 82.0),
            "critical_risks_count": len(critical_risks),
            "blocked_stories_count": len(blocked_stories),
            "critical_dependencies_count": len(critical_deps),
            "pending_approvals_count": sum(1 for a in actions if a.status == ActionStatus.PENDING_APPROVAL),
        },
        "what_needs_attention": [
            {
                "id": "att_1",
                "severity": "CRITICAL",
                "category": "BLOCKED_STORY",
                "title": "PAY-104: Payment Retry Mechanism Failing Integration Tests",
                "impact": "Blocks Checkout Service integration and Mobile Banking Release 2.4",
                "suggested_action": "Trigger Cross-Domain Remediation Harness to repair retry backoff logic",
                "story_id": blocked_stories[0].id if blocked_stories else None,
                "story_key": "PAY-104",
                "action_type": "TRIGGER_REMEDIATION_HARNESS",
            },
            {
                "id": "att_2",
                "severity": "HIGH",
                "category": "REVIEW_BOTTLENECK",
                "title": "PR #148: Biometric Auth Review Wait Time Exceeds SLA (38.5h)",
                "impact": "Delays Mobile Banking sprint burndown velocity",
                "suggested_action": "Nudge secondary reviewer Priya Nair via Slack",
                "action_type": "SEND_REVIEW_NUDGE",
            },
            {
                "id": "att_3",
                "severity": "MEDIUM",
                "category": "DOR_DEFECT",
                "title": "2 Backlog Stories Lack Clear Acceptance Criteria",
                "impact": "Increases sprint planning estimation uncertainty by 35%",
                "suggested_action": "Notify Product Owner to complete Given/When/Then scenarios",
                "action_type": "NOTIFY_PO",
            },
        ],
        "sprint_health": health_data,
        "release_forecast_summary": {
            "release_name": forecast_data.get("release_name"),
            "target_date": forecast_data.get("target_date"),
            "expected_completion": forecast_data.get("scenarios", {}).get("expected", {}).get("completion_date"),
            "confidence_pct": forecast_data.get("target_date_confidence_pct"),
        },
    }


# ─── 2. Sprint Health ───────────────────────────────────────────────────────

@router.get("/sprint-health")
def get_sprint_health(sprint_id: Optional[str] = None, tenant_id: str = "tenant_forgeiq"):
    harness = SprintHealthHarness(tenant_id)
    if not sprint_id:
        active = [s for s in store.sprints.all(tenant_id) if s.status == "ACTIVE"]
        if not active:
            raise HTTPException(404, "No active sprint found")
        sprint_id = active[0].id

    return harness.evaluate_sprint_health(sprint_id)


# ─── 3. Sprints ─────────────────────────────────────────────────────────────

@router.get("/sprints")
def list_sprints(tenant_id: str = "tenant_forgeiq"):
    return store.sprints.all(tenant_id)


@router.get("/sprints/{sprint_id}")
def get_sprint(sprint_id: str):
    s = store.sprints.get(sprint_id)
    if not s:
        raise HTTPException(404, "Sprint not found")
    stories = [store.stories.get(sid) for sid in s.story_ids if store.stories.get(sid)]
    return {"sprint": s, "stories": stories}


# ─── 4. Sprint Planner & What-If Simulation ─────────────────────────────────

@router.post("/sprint-planner/capacity")
def calculate_capacity(body: CapacityRequest, tenant_id: str = "tenant_forgeiq"):
    harness = SprintPlanningHarness(tenant_id)
    return harness.calculate_capacity(body.team_id, body.working_days, body.pto_hours, body.focus_factor)


@router.post("/sprint-planner/simulate")
def simulate_scope(body: SimulateScopeRequest, tenant_id: str = "tenant_forgeiq"):
    harness = SprintPlanningHarness(tenant_id)
    return harness.simulate_sprint_scope(body.sprint_id, body.selected_story_ids, body.simulated_pto_hours)


@router.get("/sprint-planner/historical-velocity/{team_id}")
def get_historical_velocity(team_id: str, tenant_id: str = "tenant_forgeiq"):
    harness = SprintPlanningHarness(tenant_id)
    return harness.calculate_historical_velocity(team_id)


# ─── 5. Story Intelligence ──────────────────────────────────────────────────

@router.get("/stories")
def list_stories(tenant_id: str = "tenant_forgeiq"):
    harness = StoryIntelligenceHarness(tenant_id)
    return harness.analyze_all_stories()


@router.get("/stories/{story_id}/readiness")
def get_story_readiness(story_id: str, tenant_id: str = "tenant_forgeiq"):
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(404, "Story not found")
    harness = StoryIntelligenceHarness(tenant_id)
    return harness.evaluate_definition_of_ready(story)


# ─── 6. Team Allocation ─────────────────────────────────────────────────────

@router.get("/team-allocation/matrix")
def get_team_matrix(tenant_id: str = "tenant_forgeiq"):
    teams = store.delivery_teams.all(tenant_id)
    return {
        "teams": teams,
        "total_teams": len(teams),
        "total_capacity_hours": sum(t.usable_capacity_hours for t in teams),
    }


@router.post("/team-allocation/recommend")
def recommend_team_allocation(body: TeamAllocationRequest, tenant_id: str = "tenant_forgeiq"):
    harness = SprintPlanningHarness(tenant_id)
    return harness.recommend_team_allocation(body.story_id)


# ─── 7. Velocity & Flow Intelligence ────────────────────────────────────────

@router.get("/velocity-intelligence")
def get_velocity_intelligence(tenant_id: str = "tenant_forgeiq"):
    sprints = store.sprints.all(tenant_id)
    teams = store.delivery_teams.all(tenant_id)
    team_id = teams[0].id if teams else "team_payments"

    harness = SprintPlanningHarness(tenant_id)
    vel_data = harness.calculate_historical_velocity(team_id)

    return {
        "team_name": teams[0].name if teams else "Payments Core",
        "velocity_stats": vel_data,
        "flow_metrics": {
            "cycle_time_days": 3.4,
            "lead_time_days": 8.2,
            "throughput_stories_per_week": 6.8,
            "blocked_time_hours_avg": 14.5,
            "wip_saturation_pct": 72.0,
        },
        "root_cause_attribution": [
            {"driver": "PTO & Holiday Leave", "impact_points": -5.5, "pct_attribution": 48},
            {"driver": "Production Incident Remediation", "impact_points": -3.2, "pct_attribution": 28},
            {"driver": "Downstream PR Review Wait Time", "impact_points": -2.8, "pct_attribution": 24},
        ],
        "narrative": "Velocity variation over the past 3 iterations is primarily driven by scheduled PTO and unexpected production hotfixes. Underlying engineering throughput remains robust at 38 points/sprint."
    }


# ─── 8. Dependency Intelligence ─────────────────────────────────────────────

@router.get("/dependency-graph")
def get_dependency_graph(tenant_id: str = "tenant_forgeiq"):
    harness = DependencyIntelligenceHarness(tenant_id)
    return harness.get_dependency_graph()


@router.post("/dependency-graph/simulate-slip")
def simulate_slip(body: SimulateSlipRequest, tenant_id: str = "tenant_forgeiq"):
    harness = DependencyIntelligenceHarness(tenant_id)
    return harness.simulate_upstream_slip(body.dependency_id, body.slip_days)


# ─── 9. Risk Center ─────────────────────────────────────────────────────────

@router.get("/risks")
def list_risks(tenant_id: str = "tenant_forgeiq"):
    return store.delivery_risks.all(tenant_id)


# ─── 10. Release Runway & Forecasting ───────────────────────────────────────

@router.get("/forecast")
def get_forecast(epic_id: Optional[str] = None, target_date: Optional[str] = None, tenant_id: str = "tenant_forgeiq"):
    harness = ForecastingHarness(tenant_id)
    return harness.generate_release_forecast(epic_id, target_date)


# ─── 11. Daily Scrum Standup ────────────────────────────────────────────────

@router.get("/daily-scrum/summary")
def get_daily_scrum_summary(tenant_id: str = "tenant_forgeiq"):
    copilot = DeliveryCopilotService(tenant_id)
    res = copilot.query("generate daily standup summary")
    return {
        "summary": res["answer"],
        "confidence": res.get("confidence", 0.95),
        "evidence": res.get("evidence", []),
        "timestamp": utc_now().isoformat(),
    }


# ─── 12. AI Copilot ─────────────────────────────────────────────────────────

@router.post("/copilot/query")
def query_copilot(body: CopilotQueryRequest, tenant_id: str = "tenant_forgeiq"):
    copilot = DeliveryCopilotService(tenant_id)
    return copilot.query(body.prompt)


# ─── 13. Actions & Approvals ────────────────────────────────────────────────

@router.get("/actions")
def list_actions(tenant_id: str = "tenant_forgeiq"):
    return store.delivery_actions.all(tenant_id)


@router.post("/actions/{action_id}/approve")
def approve_action(action_id: str, body: ActionApprovalRequest):
    action = store.delivery_actions.get(action_id)
    if not action:
        raise HTTPException(404, "Action not found")

    action.status = ActionStatus.APPROVED
    action.approved_by = body.approver
    action.execution_result = {
        "executed_at": utc_now().isoformat(),
        "status": "COMPLETED",
        "notes": body.notes,
    }
    return action


# ─── 14. Cross-Domain Bridge (Delivery State <-> Engineering State) ─────────

@router.get("/cross-domain/inspect/{story_id}")
def inspect_cross_domain_blocker(story_id: str, tenant_id: str = "tenant_forgeiq"):
    bridge = CrossDomainBridge(tenant_id)
    return bridge.inspect_delivery_blocker(story_id)


@router.post("/cross-domain/remediate/{story_id}")
def remediate_delivery_blocker(story_id: str, tenant_id: str = "tenant_forgeiq"):
    bridge = CrossDomainBridge(tenant_id)
    return bridge.trigger_engineering_remediation(story_id)


# ─── 15. Delivery State ─────────────────────────────────────────────────────

@router.get("/state")
def get_delivery_state(tenant_id: str = "tenant_forgeiq"):
    states = store.delivery_states.all(tenant_id)
    if states:
        return states[0]

    # Create initial state snapshot
    sprints = [s for s in store.sprints.all(tenant_id) if s.status == "ACTIVE"]
    teams = store.delivery_teams.all(tenant_id)
    risks = store.delivery_risks.all(tenant_id)
    deps = store.delivery_dependencies.all(tenant_id)

    st = DeliveryState(
        tenant_id=tenant_id,
        id=gen_id("del_st_"),
        active_sprint_id=sprints[0].id if sprints else None,
        team_id=teams[0].id if teams else None,
        health_index=sprints[0].health_score if sprints else 85.0,
        goal_confidence=sprints[0].goal_achievement_prob if sprints else 88.0,
        velocity_trend="STABLE",
        cycle_time_days=3.4,
        lead_time_days=8.2,
        blocked_time_hours=14.5,
        wip_items=len([s for s in store.stories.all(tenant_id) if s.status in ["IN_PROGRESS", "IN_REVIEW"]]),
        total_active_risks=len(risks),
        critical_risks=len([r for r in risks if r.severity in ["CRITICAL", "HIGH"]]),
        open_dependencies=len(deps),
    )
    store.delivery_states.add(st)
    return st


# ─── 16. Story Weaver & Multi-Agent Delivery Harness ────────────────────────

class ExecuteStoryHarnessRequest(BaseModel):
    requirement_title: str = "Instant SEPA Payment Settlement with Auto-Reversal & Ledger Lock"
    requirement_text: str = (
        "Implement high-throughput SEPA instant payment processing with guaranteed idempotency, "
        "distributed lock management, Kafka audit event emission, and merchant webhook notifications."
    )
    target_epic: Optional[str] = None


class SchedulerTriggerRequest(BaseModel):
    run_type: str = "MANUAL_TRIGGER"


@router.post("/harness/pipeline/run")
def run_delivery_story_harness(body: ExecuteStoryHarnessRequest, tenant_id: str = "tenant_forgeiq"):
    harness = DeliveryStoryHarness(tenant_id)
    run = harness.execute_pipeline(
        requirement_title=body.requirement_title,
        requirement_text=body.requirement_text,
        target_epic=body.target_epic,
    )
    return run


@router.get("/harness/pipeline/runs")
def get_harness_pipeline_runs(tenant_id: str = "tenant_forgeiq"):
    harness = DeliveryStoryHarness(tenant_id)
    return harness.get_runs()


@router.get("/harness/pipeline/runs/{run_id}")
def get_harness_pipeline_run(run_id: str, tenant_id: str = "tenant_forgeiq"):
    harness = DeliveryStoryHarness(tenant_id)
    run = harness.get_run(run_id)
    if not run:
        raise HTTPException(404, "Pipeline run not found")
    return run


# ─── 17. Daily Scrum Scheduler Harness ─────────────────────────────────────

@router.post("/harness/scheduler/crawl-and-notify")
def trigger_daily_scheduler_crawl(body: Optional[SchedulerTriggerRequest] = None, tenant_id: str = "tenant_forgeiq"):
    scheduler = DailyScrumSchedulerHarness(tenant_id)
    run_type = body.run_type if body else "MANUAL_TRIGGER"
    run = scheduler.execute_daily_crawl_and_notify(run_type=run_type)
    return run


@router.get("/harness/scheduler/status")
def get_scheduler_status(tenant_id: str = "tenant_forgeiq"):
    scheduler = DailyScrumSchedulerHarness(tenant_id)
    return scheduler.get_status()


# ─── 18. Delivery Harness Agent Roster & Telemetry ─────────────────────────

@router.get("/harness/agents")
def get_delivery_agents():
    return [
        {
            "id": "agent_story_weaver",
            "name": "StoryWeaver Agent",
            "type": "CUSTOM_AGENT",
            "role": "Autonomous Requirements Decomposition & Gherkin AC Synthesizer",
            "status": "ONLINE",
            "latency_p95_ms": 480,
            "success_rate_pct": 99.4,
            "capabilities": ["PRD Deconstruction", "Persona Mapping", "Gherkin AC Extraction", "DoR Pre-validation"],
            "model": "gemini-2.5-pro"
        },
        {
            "id": "agent_jira_sync",
            "name": "Jira Integration Agent",
            "type": "TRACKER_AGENT",
            "role": "Jira Issue Lifecycle, Point Estimation & Sprint Mapping",
            "status": "ONLINE",
            "latency_p95_ms": 620,
            "success_rate_pct": 100.0,
            "capabilities": ["Issue Creation", "Story Point Estimation", "Epic Linking", "Component Tagging"],
            "model": "forgeiq-jira-bridge-v1"
        },
        {
            "id": "agent_code_analyzer",
            "name": "Code Analyzer Agent",
            "type": "ENGINEERING_AGENT",
            "role": "Repository AST Impact, Cyclomatic Complexity & Point Calibration",
            "status": "ONLINE",
            "latency_p95_ms": 850,
            "success_rate_pct": 98.8,
            "capabilities": ["AST Parsing", "Service Dependency Graphing", "Complexity Scoring", "Code-Calibrated Story Points"],
            "model": "gemini-2.5-flash-code"
        },
        {
            "id": "agent_daily_scheduler",
            "name": "Daily Scrum Scheduler Agent",
            "type": "CONTINUOUS_HARNESS_AGENT",
            "role": "Daily Jira Crawl, Telemetry Aggregation & Multi-Channel Broadcast",
            "status": "ONLINE",
            "latency_p95_ms": 530,
            "success_rate_pct": 99.9,
            "capabilities": ["Daily Jira Scraping", "PR Wait-Time Detection", "Standup Digest Synthesis", "Slack/Teams Broadcast"],
            "model": "forgeiq-telemetry-engine-v2"
        }
    ]

