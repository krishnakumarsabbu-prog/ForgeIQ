from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field

from .base import TenantOwned, gen_id, utc_now


class AutomationLevel(str, Enum):
    L0_OBSERVE = "L0_OBSERVE"
    L1_RECOMMEND = "L1_RECOMMEND"
    L2_PREPARE = "L2_PREPARE"
    L3_APPROVE_AND_EXECUTE = "L3_APPROVE_AND_EXECUTE"
    L4_POLICY_AUTOMATION = "L4_POLICY_AUTOMATION"
    L5_CLOSED_LOOP = "L5_CLOSED_LOOP"


class StoryStatus(str, Enum):
    BACKLOG = "BACKLOG"
    READY = "READY"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    TESTING = "TESTING"
    BLOCKED = "BLOCKED"
    DONE = "DONE"


class SprintStatus(str, Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CLOSED = "CLOSED"


class DependencyType(str, Enum):
    BLOCKS = "BLOCKS"
    DEPENDS_ON = "DEPENDS_ON"
    API_CONTRACT = "API_CONTRACT"
    SHARED_COMPONENT = "SHARED_COMPONENT"
    EXTERNAL_VENDOR = "EXTERNAL_VENDOR"


class RiskCategory(str, Enum):
    CAPACITY = "CAPACITY"
    DEPENDENCY = "DEPENDENCY"
    TECHNICAL_DEBT = "TECHNICAL_DEBT"
    VELOCITY_DECLINE = "VELOCITY_DECLINE"
    REVIEW_BOTTLENECK = "REVIEW_BOTTLENECK"
    SCOPE_CREEP = "SCOPE_CREEP"
    BUILD_INSTABILITY = "BUILD_INSTABILITY"


class ActionStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"


# ─── Core Delivery Domain Entities ──────────────────────────────────────────

class DeliveryProduct(TenantOwned):
    name: str
    key: str
    description: str = ""
    lead_scrum_master: str = ""
    product_owner: str = ""
    team_ids: list[str] = Field(default_factory=list)


class Epic(TenantOwned):
    product_id: str
    key: str
    title: str
    description: str = ""
    target_date: Optional[str] = None
    total_points: float = 0.0
    completed_points: float = 0.0
    status: str = "IN_PROGRESS"
    progress_pct: float = 0.0


class AcceptanceCriterion(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("ac_"))
    text: str
    verified: bool = False


class Story(TenantOwned):
    key: str
    title: str
    description: str = ""
    epic_id: Optional[str] = None
    product_id: Optional[str] = None
    team_id: Optional[str] = None
    status: StoryStatus = StoryStatus.BACKLOG
    points: float = 0.0
    priority: str = "P1"  # P0, P1, P2, P3
    definition_of_ready_score: float = 0.0  # 0 to 100%
    dor_criteria_met: list[str] = Field(default_factory=list)
    dor_criteria_missing: list[str] = Field(default_factory=list)
    acceptance_criteria: list[AcceptanceCriterion] = Field(default_factory=list)
    missing_metadata: list[str] = Field(default_factory=list)
    risk_score: float = 0.0  # 0 to 100%
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH, CRITICAL
    risk_explanation: str = ""
    stale_days: int = 0
    carry_over_count: int = 0
    split_recommended: bool = False
    split_suggestions: list[str] = Field(default_factory=list)
    # Cross-world engineering linkage
    application_id: Optional[str] = None
    service_name: Optional[str] = None
    repository_url: Optional[str] = None
    component_tag: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    labels: list[str] = Field(default_factory=list)
    linked_dependencies: list[str] = Field(default_factory=list)


class DeliveryTeam(TenantOwned):
    name: str
    key: str
    description: str = ""
    lead_name: str = ""
    scrum_master: str = ""
    members_count: int = 6
    capacity_hours_per_sprint: float = 480.0
    usable_capacity_hours: float = 420.0
    skills: list[str] = Field(default_factory=list)
    capability_matrix: dict[str, float] = Field(default_factory=dict)  # skill -> score 0.0 - 1.0
    average_velocity: float = 38.0
    current_wip: int = 5
    active_sprint_id: Optional[str] = None


class SprintGoal(BaseModel):
    statement: str
    confidence_score: float = 0.85
    status: str = "ON_TRACK"  # ON_TRACK, AT_RISK, OFF_TRACK
    key_deliverables: list[str] = Field(default_factory=list)


class Sprint(TenantOwned):
    name: str
    number: int
    team_id: str
    team_name: str
    status: SprintStatus = SprintStatus.ACTIVE
    start_date: str
    end_date: str
    working_days: int = 10
    committed_points: float = 0.0
    completed_points: float = 0.0
    carried_over_points: float = 0.0
    scope_change_points: float = 0.0
    capacity_hours: float = 480.0
    usable_capacity_hours: float = 420.0
    pto_hours_deducted: float = 60.0
    goal: SprintGoal = Field(default_factory=lambda: SprintGoal(statement="Deliver core release milestones"))
    health_score: float = 85.0  # 0 to 100
    health_status: str = "HEALTHY"  # HEALTHY, AT_RISK, CRITICAL
    velocity_forecast: float = 40.0
    goal_achievement_prob: float = 88.0  # 0 to 100%
    story_ids: list[str] = Field(default_factory=list)


class DeliveryDependency(TenantOwned):
    source_id: str
    source_title: str
    source_type: str = "STORY"  # STORY, TEAM, SERVICE, REPO, EXTERNAL
    target_id: str
    target_title: str
    target_type: str = "SERVICE"
    dependency_type: DependencyType = DependencyType.DEPENDS_ON
    critical_path: bool = False
    aging_days: int = 0
    risk_level: str = "LOW"
    blast_radius_score: float = 0.2
    status: str = "ACTIVE"  # ACTIVE, BLOCKED, RESOLVED
    impact_description: str = ""


class DeliveryRisk(TenantOwned):
    category: RiskCategory = RiskCategory.DEPENDENCY
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    title: str
    description: str
    probability: float = 0.5
    impact: float = 0.6
    urgency: str = "THIS_SPRINT"  # IMMEDIATE, THIS_SPRINT, FUTURE
    affected_story_ids: list[str] = Field(default_factory=list)
    affected_team_ids: list[str] = Field(default_factory=list)
    root_cause: str = ""
    remediation_suggested: str = ""
    # Bridge to ForgeIQ Software Engineering Factory:
    engineering_link: dict = Field(default_factory=dict)
    remediation_harness_id: Optional[str] = None
    status: str = "ACTIVE"  # ACTIVE, MITIGATING, RESOLVED


class DeliveryRecommendation(TenantOwned):
    title: str
    recommendation: str
    rationale: str = ""
    confidence: float = 0.85
    automation_level: AutomationLevel = AutomationLevel.L1_RECOMMEND
    evidence_ids: list[str] = Field(default_factory=list)
    suggested_action_type: str = "UPDATE_JIRA"
    target_entity_id: str = ""
    parameters: dict = Field(default_factory=dict)
    applied: bool = False


class DeliveryAction(TenantOwned):
    title: str
    action_type: str
    description: str = ""
    status: ActionStatus = ActionStatus.PENDING_APPROVAL
    automation_level: AutomationLevel = AutomationLevel.L3_APPROVE_AND_EXECUTE
    initiated_by: str = "AI Scrum Master"
    approved_by: Optional[str] = None
    payload: dict = Field(default_factory=dict)
    execution_result: Optional[dict] = None
    evidence_ids: list[str] = Field(default_factory=list)
    reversible: bool = True


class DeliveryForecast(TenantOwned):
    target_release: str
    epic_id: Optional[str] = None
    target_date: str
    optimistic_date: str
    expected_date: str
    conservative_date: str
    confidence_score: float = 0.82
    scope_buffer_points: float = 12.0
    monte_carlo_runs: int = 1000
    forecast_curves: list[dict] = Field(default_factory=list)


class DeliveryState(TenantOwned):
    active_sprint_id: Optional[str] = None
    team_id: Optional[str] = None
    health_index: float = 85.0
    goal_confidence: float = 88.0
    velocity_trend: str = "STABLE"
    cycle_time_days: float = 3.4
    lead_time_days: float = 8.2
    blocked_time_hours: float = 14.5
    wip_items: int = 7
    total_active_risks: int = 4
    critical_risks: int = 1
    open_dependencies: int = 6
    engineering_state_link_id: Optional[str] = None
    last_scanned_at: str = Field(default_factory=lambda: utc_now().isoformat())
