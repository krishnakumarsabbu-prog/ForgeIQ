from __future__ import annotations

from typing import Any
from ..storage.in_memory import store


class DeliveryCopilotService:
    def __init__(self, tenant_id: str = "tenant_forgeiq") -> None:
        self.tenant_id = tenant_id

    def query(self, prompt: str) -> dict[str, Any]:
        p = prompt.lower().strip()
        sprints = [s for s in store.sprints.all(self.tenant_id) if s.status == "ACTIVE"]
        active_sprint = sprints[0] if sprints else None
        stories = store.stories.all(self.tenant_id)
        teams = store.delivery_teams.all(self.tenant_id)
        risks = store.delivery_risks.all(self.tenant_id)
        deps = store.delivery_dependencies.all(self.tenant_id)

        # 1. "How healthy is Sprint..."
        if "healthy" in p or "health" in p or "sprint 42" in p:
            if not active_sprint:
                return {"answer": "No active sprint found in current tenant workspace.", "evidence": []}
            blocked = [s for s in stories if s.status == "BLOCKED"]
            return {
                "answer": (
                    f"**{active_sprint.name}** is currently at **{active_sprint.health_score}% Health ({active_sprint.health_status})** "
                    f"with a **{active_sprint.goal_achievement_prob}% probability** of achieving its Sprint Goal: *\"{active_sprint.goal.statement}\"*.\n\n"
                    f"• **Committed vs Completed**: {active_sprint.committed_points} pts committed, {active_sprint.completed_points} pts completed.\n"
                    f"• **Key Blockers**: {len(blocked)} blocked story ({', '.join(b.key for b in blocked) if blocked else 'None'}).\n"
                    f"• **PR Review SLA**: 2 PRs waiting > 24 hours in Mobile Banking repo.\n"
                    f"• **Goal Confidence Driver**: Low risk on Payments API once PR #142 retry harness resolves."
                ),
                "confidence": 0.94,
                "evidence": [
                    {"label": f"Sprint Record: {active_sprint.name}", "id": active_sprint.id},
                    {"label": f"Active Risks ({len(risks)})", "id": "risks_active"},
                ],
                "suggested_actions": [
                    {"label": "Review Blocked Story PAY-104", "action": "INSPECT_BLOCKER", "target": "PAY-104"},
                    {"label": "Simulate Team B Slip (+2 Days)", "action": "SIMULATE_SLIP", "target": "dep_team_b"},
                ]
            }

        # 2. "Why is velocity down?"
        elif "velocity" in p and ("down" in p or "why" in p or "drop" in p):
            return {
                "answer": (
                    "**Velocity Root Cause Analysis (Rolling 3-Sprint Causal Model)**:\n\n"
                    "1. **Capacity Reduction (-14% effect)**: 60 PTO hours were deducted this sprint across Senior Engineers in Payments Core.\n"
                    "2. **Unplanned Work / Tech Debt (-9% effect)**: 8 story points were pulled in to address a critical gateway timeout patch.\n"
                    "3. **Dependency Idle Time (-6% effect)**: Downstream mobile team was blocked 38 hours waiting for Payment API contract freeze.\n\n"
                    "**Recommendation**: Baseline velocity will normalize to 38.0 points next sprint as leave concludes and the retry harness is merged."
                ),
                "confidence": 0.91,
                "evidence": [
                    {"label": "Team Capacity Ledger (PTO Records)", "id": "cap_pto_team1"},
                    {"label": "Jira Unplanned Work Audit", "id": "jira_unplanned"},
                ],
                "suggested_actions": [
                    {"label": "Adjust Next Sprint Capacity", "action": "PLANNER_ADJUST_CAPACITY"},
                ]
            }

        # 3. "What needs my attention?" / "attention" / "urgent"
        elif "attention" in p or "urgent" in p or "risks" in p:
            top_risks = sorted(risks, key=lambda r: r.probability * r.impact, reverse=True)[:3]
            risk_bullets = "\n".join([f"• **{r.severity}**: {r.title} — *{r.remediation_suggested}*" for r in top_risks])
            return {
                "answer": (
                    f"**Top 3 Priority Items Requiring Attention Today**:\n\n{risk_bullets}\n\n"
                    "Immediate Action: PAY-104 is blocking 2 downstream stories in Mobile Banking. A ForgeIQ Remediation Harness can be launched with 1-click approval."
                ),
                "confidence": 0.96,
                "evidence": [{"label": r.title, "id": r.id} for r in top_risks],
                "suggested_actions": [
                    {"label": "Approve Remediation Harness", "action": "TRIGGER_REMEDIATION_HARNESS", "target": "PAY-104"},
                    {"label": "Nudge Secondary PR Reviewer", "action": "SEND_REVIEWER_REMINDER"},
                ]
            }

        # 4. "What if Team B slips..."
        elif "team b" in p or "slip" in p:
            return {
                "answer": (
                    "**What-If Simulation: Team B Slips 2 Days on Payment Contract API**:\n\n"
                    "• **Sprint Goal Impact**: Goal confidence drops from **88% down to 64%** (Critical Path exposure).\n"
                    "• **Blast Radius**: 2 dependent stories in Mobile Banking (MOB-201, MOB-204) cannot begin UI integration.\n"
                    "• **Recommended Decoupling**: Mock the API contract in the frontend test environment using WireMock or ForgeIQ Synthetic API mock tool to keep Mobile engineers unblocked."
                ),
                "confidence": 0.89,
                "evidence": [
                    {"label": "Dependency Path: Team B -> Mobile Core", "id": "dep_team_b_mobile"},
                    {"label": "Critical Path Graph", "id": "graph_cp"},
                ],
                "suggested_actions": [
                    {"label": "Inject Synthetic API Mock", "action": "INJECT_MOCK_API"},
                ]
            }

        # 5. "Daily standup" / "standup" / "summary"
        elif "standup" in p or "daily" in p or "summary" in p:
            return {
                "answer": (
                    f"**Daily Scrum Intelligence Briefing ({active_sprint.name if active_sprint else 'Sprint 42'})**\n\n"
                    "**1. What Progress Was Made Yesterday**:\n"
                    "• 4 PRs merged across Payments Core and Fraud Detection (14 pts verified).\n"
                    "• Definition of Ready compliance improved to 92% across backlog items.\n\n"
                    "**2. Active Blockers & Impediments**:\n"
                    "• `PAY-104`: Gateway timeout in integration test (PR #142 waiting on retry fix).\n"
                    "• PR #148 (Biometric Auth) waiting for second reviewer > 38 hours.\n\n"
                    "**3. Focus For Today**:\n"
                    "• Execute Remediation Harness on PAY-104 to unblock Mobile team.\n"
                    "• Close review on PR #148 to maintain sprint burndown trajectory."
                ),
                "confidence": 0.95,
                "evidence": [
                    {"label": "Daily Activity Log", "id": "daily_log"},
                ],
                "suggested_actions": [
                    {"label": "Export Standup Notes to Slack", "action": "EXPORT_STANDUP"},
                ]
            }

        # Default fallback
        return {
            "answer": (
                f"I am your **ForgeIQ AI Scrum Master**. I continuously analyze delivery signals, predict sprint health, "
                f"and connect delivery risks to root-cause engineering fixes in ForgeIQ.\n\n"
                f"Currently monitoring **{len(teams)} teams**, **{len(stories)} stories**, and **{len(risks)} delivery risks**.\n"
                f"Ask me about: *\"How healthy is Sprint 42?\"*, *\"Why is velocity down?\"*, *\"What needs my attention?\"*, or *\"What if Team B slips 2 days?\"*."
            ),
            "confidence": 0.90,
            "evidence": [],
            "suggested_actions": [
                {"label": "Check Sprint Health", "action": "NAV_SPRINT_HEALTH"},
                {"label": "View Dependency Graph", "action": "NAV_DEPENDENCY_GRAPH"},
            ]
        }
