from __future__ import annotations

from typing import Any
from ..domain.models.delivery_state import Story, StoryStatus
from ..storage.in_memory import store


class StoryIntelligenceHarness:
    def __init__(self, tenant_id: str = "tenant_forgeiq") -> None:
        self.tenant_id = tenant_id

    def evaluate_definition_of_ready(self, story: Story) -> dict[str, Any]:
        """
        Evaluates story readiness against configurable enterprise DoR rules:
        1. Clear Title & Description (> 20 chars)
        2. At least 1 verifiable Acceptance Criteria
        3. Story Points estimate assigned (> 0)
        4. Priority defined
        5. Component / Architecture / Application tagged
        6. Assignee assigned (if ready for sprint)
        """
        checks: list[dict[str, Any]] = []
        missing_metadata: list[str] = []

        # Check 1: Description
        desc_ok = len(story.description.strip()) >= 25
        checks.append({
            "criterion": "Descriptive Story Context",
            "met": desc_ok,
            "weight": 20,
            "detail": "Description has sufficient domain detail" if desc_ok else "Description is too brief or missing"
        })
        if not desc_ok:
            missing_metadata.append("description_detail")

        # Check 2: Acceptance Criteria
        ac_count = len(story.acceptance_criteria)
        ac_ok = ac_count >= 1
        checks.append({
            "criterion": "Verifiable Acceptance Criteria",
            "met": ac_ok,
            "weight": 25,
            "detail": f"{ac_count} acceptance criteria defined" if ac_ok else "No acceptance criteria defined"
        })
        if not ac_ok:
            missing_metadata.append("acceptance_criteria")

        # Check 3: Story Points Estimate
        points_ok = story.points > 0
        checks.append({
            "criterion": "Story Points Estimated",
            "met": points_ok,
            "weight": 20,
            "detail": f"Estimated at {story.points} pts" if points_ok else "Story is unestimated (0 pts)"
        })
        if not points_ok:
            missing_metadata.append("points_estimate")

        # Check 4: Priority Defined
        prio_ok = bool(story.priority and story.priority in ["P0", "P1", "P2", "P3"])
        checks.append({
            "criterion": "Priority Assigned",
            "met": prio_ok,
            "weight": 10,
            "detail": f"Priority: {story.priority}" if prio_ok else "Priority undefined"
        })

        # Check 5: Application / Component Tag
        comp_ok = bool(story.application_id or story.service_name or story.component_tag)
        checks.append({
            "criterion": "Architecture / Component Tagged",
            "met": comp_ok,
            "weight": 15,
            "detail": f"Linked to {story.service_name or story.application_id or story.component_tag}" if comp_ok else "No architectural component linked"
        })
        if not comp_ok:
            missing_metadata.append("component_tag")

        # Check 6: Assignee or Team
        team_ok = bool(story.team_id or story.assignee_id)
        checks.append({
            "criterion": "Team / Owner Assigned",
            "met": team_ok,
            "weight": 10,
            "detail": f"Assigned to {story.assignee_name or story.team_id}" if team_ok else "Unassigned"
        })
        if not team_ok:
            missing_metadata.append("owner")

        # Compute weighted score
        score = sum(c["weight"] for c in checks if c["met"])
        criteria_met = [c["criterion"] for c in checks if c["met"]]
        criteria_missing = [c["criterion"] for c in checks if not c["met"]]

        # Sizing and splitting recommendations
        split_recommended = story.points >= 8.0
        split_suggestions: list[str] = []
        if split_recommended:
            split_suggestions = [
                f"Split into API contract & validation story (3 pts) and backend persistence logic (5 pts)",
                f"Extract integration test suite and negative failure cases into a separate test task (2 pts)"
            ]

        # Calculate risk score
        risk_score = 15.0
        risk_factors = []
        if not ac_ok:
            risk_score += 25
            risk_factors.append("Missing acceptance criteria increases ambiguity")
        if story.points >= 8:
            risk_score += 20
            risk_factors.append("Large story size (> 8 points) historically correlates with sprint spillover")
        if story.carry_over_count > 0:
            risk_score += story.carry_over_count * 15
            risk_factors.append(f"Carried over across {story.carry_over_count} previous sprint(s)")
        if story.stale_days > 3:
            risk_score += min(30, story.stale_days * 5)
            risk_factors.append(f"Inactive with no PR or commit activity for {story.stale_days} days")

        risk_score = min(100.0, risk_score)
        risk_level = "CRITICAL" if risk_score >= 75 else "HIGH" if risk_score >= 50 else "MEDIUM" if risk_score >= 30 else "LOW"

        # Update story instance
        story.definition_of_ready_score = float(score)
        story.dor_criteria_met = criteria_met
        story.dor_criteria_missing = criteria_missing
        story.missing_metadata = missing_metadata
        story.risk_score = risk_score
        story.risk_level = risk_level
        story.risk_explanation = "; ".join(risk_factors) if risk_factors else "Story has healthy clarity and low execution risk"
        story.split_recommended = split_recommended
        story.split_suggestions = split_suggestions

        return {
            "story_id": story.id,
            "key": story.key,
            "title": story.title,
            "dor_score": score,
            "is_ready": score >= 80,
            "checks": checks,
            "criteria_met": criteria_met,
            "criteria_missing": criteria_missing,
            "missing_metadata": missing_metadata,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_explanation": story.risk_explanation,
            "split_recommended": split_recommended,
            "split_suggestions": split_suggestions,
        }

    def analyze_all_stories(self) -> list[dict[str, Any]]:
        stories = store.stories.all(self.tenant_id)
        results = []
        for s in stories:
            res = self.evaluate_definition_of_ready(s)
            results.append(res)
        return results
