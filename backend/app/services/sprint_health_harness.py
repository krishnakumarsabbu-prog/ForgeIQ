from __future__ import annotations

from typing import Any
from ..domain.models.delivery_state import Sprint, SprintStatus, DeliveryRisk, AutomationLevel
from ..storage.in_memory import store


class SprintHealthHarness:
    def __init__(self, tenant_id: str = "tenant_forgeiq") -> None:
        self.tenant_id = tenant_id

    def evaluate_sprint_health(self, sprint_id: str) -> dict[str, Any]:
        sprint = store.sprints.get(sprint_id)
        if not sprint:
            return {"error": "Sprint not found"}

        stories = [store.stories.get(sid) for sid in sprint.story_ids if store.stories.get(sid)]
        total_stories = len(stories)
        blocked_stories = [s for s in stories if s.status == "BLOCKED"]
        stale_stories = [s for s in stories if s.stale_days >= 2 and s.status in ["IN_PROGRESS", "IN_REVIEW"]]
        high_risk_stories = [s for s in stories if s.risk_level in ["CRITICAL", "HIGH"]]

        # Simulated PR / Review metrics (connected to Git signals)
        pr_waiting_count = 2
        pr_longest_wait_hours = 38.5  # Baseline: 12h, Alert threshold: 24h
        pr_review_status = "WARNING" if pr_longest_wait_hours > 24 else "HEALTHY"

        # Simulated CI/CD Build signals
        build_failure_rate_pct = 12.0  # 1 failure in last 8 builds
        build_status = "HEALTHY" if build_failure_rate_pct < 15 else "UNSTABLE"

        # Scope Growth
        scope_growth_pts = sprint.scope_change_points
        scope_growth_pct = round((scope_growth_pts / max(1.0, sprint.committed_points)) * 100, 1)

        # Composite Health Score Calculation (0 - 100)
        # Weights:
        # - Blocked stories penalty (-15 per blocked story)
        # - High risk stories penalty (-5 per story)
        # - PR review bottleneck penalty (-10 if alert)
        # - Stale work penalty (-5 per stale story)
        # - Scope growth penalty (-1 per 2% scope growth)
        base_score = 95.0
        base_score -= len(blocked_stories) * 12.0
        base_score -= len(high_risk_stories) * 4.0
        base_score -= len(stale_stories) * 3.0
        if pr_review_status == "WARNING":
            base_score -= 8.0
        if scope_growth_pct > 10.0:
            base_score -= (scope_growth_pct - 10.0) * 0.8

        health_score = max(20.0, min(100.0, round(base_score, 1)))
        health_status = "HEALTHY" if health_score >= 80 else "AT_RISK" if health_score >= 60 else "CRITICAL"

        # Update sprint model
        sprint.health_score = health_score
        sprint.health_status = health_status

        # Active Signals / Alarms
        signals: list[dict[str, Any]] = []

        if blocked_stories:
            for bs in blocked_stories:
                signals.append({
                    "type": "BLOCKED_WORK",
                    "severity": "CRITICAL",
                    "title": f"Story {bs.key} is Blocked",
                    "description": f"Blocked for > 2 days: {bs.risk_explanation}",
                    "suggested_action": "Trigger Cross-Domain Remediation Harness or reassign blocker",
                    "automation_level": "L3_APPROVE_AND_EXECUTE",
                    "story_id": bs.id,
                })

        if pr_review_status == "WARNING":
            signals.append({
                "type": "PR_REVIEW_BOTTLENECK",
                "severity": "HIGH",
                "title": f"PR Review Bottleneck ({pr_waiting_count} PRs waiting)",
                "description": f"Average wait time {pr_longest_wait_hours}h exceeds team SLA baseline of 24h",
                "suggested_action": "Send Slack reminder to designated secondary reviewer",
                "automation_level": "L4_POLICY_AUTOMATION",
            })

        if stale_stories:
            signals.append({
                "type": "STORY_AGING",
                "severity": "MEDIUM",
                "title": f"{len(stale_stories)} Inactive In-Progress Stories",
                "description": f"Stories have had no commit or PR activity for 2+ days",
                "suggested_action": "Request status update from story assignees",
                "automation_level": "L1_RECOMMEND",
            })

        if scope_growth_pct > 8.0:
            signals.append({
                "type": "SCOPE_GROWTH",
                "severity": "MEDIUM",
                "title": f"Scope Increased by {scope_growth_pts} pts ({scope_growth_pct}%)",
                "description": "Mid-sprint additions threaten planned sprint commitment",
                "suggested_action": "Rebalance lower-priority backlog items to next iteration",
                "automation_level": "L2_PREPARE",
            })

        return {
            "sprint_id": sprint.id,
            "sprint_name": sprint.name,
            "health_score": health_score,
            "health_status": health_status,
            "total_stories": total_stories,
            "blocked_stories_count": len(blocked_stories),
            "stale_stories_count": len(stale_stories),
            "high_risk_stories_count": len(high_risk_stories),
            "pr_review_metrics": {
                "prs_waiting": pr_waiting_count,
                "longest_wait_hours": pr_longest_wait_hours,
                "status": pr_review_status,
            },
            "build_metrics": {
                "failure_rate_pct": build_failure_rate_pct,
                "status": build_status,
            },
            "scope_growth": {
                "added_points": scope_growth_pts,
                "growth_pct": scope_growth_pct,
            },
            "signals": signals,
        }
