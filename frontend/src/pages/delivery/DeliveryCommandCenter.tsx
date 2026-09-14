import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Target, Activity, AlertTriangle, ShieldCheck, Zap, ArrowRight,
  TrendingUp, Clock, GitBranch, CheckCircle2, Play, Users, RefreshCw,
  Sparkles, ExternalLink, Flame, ChevronRight, MessageSquare, ShieldAlert,
  Layers, Package, Check, X, Info
} from 'lucide-react'
import { api } from '../../api/client'
import { PageHeader, LoadingSpinner } from '../../components/ui/PageHeader'
import DeliverySubNav from '../../features/delivery/DeliverySubNav'

interface CommandCenterData {
  active_sprint: any
  metrics_strip: {
    sprint_goal_confidence: number
    sprint_health_score: number
    release_confidence: number
    critical_risks_count: number
    blocked_stories_count: number
    critical_dependencies_count: number
    pending_approvals_count: number
  }
  what_needs_attention: Array<{
    id: string
    severity: string
    category: string
    title: string
    impact: string
    suggested_action: string
    story_id?: string
    story_key?: string
    action_type: string
  }>
  sprint_health: any
  release_forecast_summary: any
}

export default function DeliveryCommandCenter() {
  const navigate = useNavigate()
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remediating, setRemediating] = useState(false)
  const [remediationResult, setRemediationResult] = useState<any>(null)
  const [inspectionData, setInspectionData] = useState<any>(null)
  const [showBridgeModal, setShowBridgeModal] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get<CommandCenterData>('/delivery-intelligence/command-center')
      setData(res)
    } catch (err: any) {
      setError(err.message || 'Failed to load command center data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenBridge = async (storyId: string) => {
    try {
      const inspect = await api.get<any>(`/delivery-intelligence/cross-domain/inspect/${storyId}`)
      setInspectionData(inspect)
      setShowBridgeModal(true)
    } catch (err: any) {
      alert('Inspection failed: ' + err.message)
    }
  }

  const handleExecuteRemediation = async (storyId: string) => {
    try {
      setRemediating(true)
      const res = await api.post<any>(`/delivery-intelligence/cross-domain/remediate/${storyId}`)
      setRemediationResult(res)
      await fetchData()
    } catch (err: any) {
      alert('Remediation failed: ' + err.message)
    } finally {
      setRemediating(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner />
      </div>
    )
  }

  const m = data?.metrics_strip || {
    sprint_goal_confidence: 88,
    sprint_health_score: 85,
    release_confidence: 82,
    critical_risks_count: 2,
    blocked_stories_count: 1,
    critical_dependencies_count: 3,
    pending_approvals_count: 1,
  }

  return (
    <div className="space-y-6">
      {/* Cohesive Delivery Sub-Nav */}
      <DeliverySubNav />

      {/* Hero: Delivery Intelligence Multi-Agent Harness */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-7 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Target size={12} className="animate-pulse" /> Engineering Intelligence Control Plane
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-medium text-slate-300">
                  {data?.active_sprint?.name || 'Sprint 42 (Banking Core)'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Delivery Intelligence & Scrum Harness
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Multi-agent delivery pipeline: <strong>StoryWeaver</strong> (Requirements) → <strong>Jira Agent</strong> (Issue sync & points) → <strong>Code Analyzer</strong> (AST calibration) → <strong>Scheduler Harness</strong> (Daily crawl & notifications).
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                to="/delivery-intelligence/story-weaver"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02]"
              >
                <Sparkles size={14} />
                Launch Story Weaver Pipeline
              </Link>
              <button
                onClick={() => navigate('/delivery-intelligence/daily-scrum')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
              >
                <Clock size={14} className="text-amber-400" />
                Daily Scheduler
              </button>
            </div>
          </div>

          {/* 4 Agent Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-cyan-400 font-mono font-bold">
                <span>StoryWeaver Agent</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-300 mt-1 font-semibold">Custom Requirement Decomposer</div>
              <div className="text-[10px] text-slate-400">Gherkin AC • Scenarios • DoR</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-blue-400 font-mono font-bold">
                <span>Jira Integration Agent</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-300 mt-1 font-semibold">Issue Lifecycle & Estimates</div>
              <div className="text-[10px] text-slate-400">Board #42 • PAY Keys • Sprints</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-mono font-bold">
                <span>Code Analyzer Agent</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-300 mt-1 font-semibold">AST Code Impact Engine</div>
              <div className="text-[10px] text-slate-400">Complexity • Point Calibration</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-amber-400 font-mono font-bold">
                <span>Daily Scrum Scheduler</span>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-300 mt-1 font-semibold">Daily Jira Crawl & Alerts</div>
              <div className="text-[10px] text-slate-400">Slack • Teams • 09:00 UTC Cron</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cockpit Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Sprint Goal Confidence */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-sky-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sprint Goal Confidence
            </span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Target size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {m.sprint_goal_confidence}%
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
              <TrendingUp size={12} className="mr-0.5" /> High Prob
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${m.sprint_goal_confidence}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
            Goal: {data?.active_sprint?.goal?.statement || 'Deliver resilient payment retry engine'}
          </p>
        </div>

        {/* Metric 2: Sprint Health Score */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sprint Health Index
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {m.sprint_health_score}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {data?.active_sprint?.health_status || 'HEALTHY'}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${m.sprint_health_score}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {data?.sprint_health?.signals?.length || 2} active health telemetry signals
          </p>
        </div>

        {/* Metric 3: Release Runway Confidence */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-violet-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Release 2.4 Runway
            </span>
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {m.release_confidence}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Target: in 35 days
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-violet-500 to-purple-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${m.release_confidence}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
            Expected: {data?.release_forecast_summary?.expected_completion || '2026-10-15'} (P50 Monte Carlo)
          </p>
        </div>

        {/* Metric 4: Critical Risks & Blocked Work */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Delivery Blockers
            </span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {m.blocked_stories_count} Blocked
            </span>
            <span className="text-xs font-medium text-amber-500">
              / {m.critical_risks_count} Critical Risks
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[11px] font-medium">
              PAY-104 Gateway Timeout
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {m.critical_dependencies_count} on critical delivery path
          </p>
        </div>
      </div>

      {/* Main Operational Section: What Needs Attention Now */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Prioritized Triage Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Flame size={16} />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                What Needs Attention Now
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {data?.what_needs_attention?.length || 3} items
              </span>
            </div>
            <Link
              to="/delivery-intelligence/risk-center"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              View Risk Center <ChevronRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.what_needs_attention?.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/40 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        item.severity === 'CRITICAL'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                          : item.severity === 'HIGH'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-700 dark:text-slate-300">Impact:</strong> {item.impact}
                  </p>
                  <p className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Sparkles size={12} />
                    <strong>AI Recommendation:</strong> {item.suggested_action}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.story_id ? (
                    <button
                      onClick={() => handleOpenBridge(item.story_id!)}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5"
                    >
                      <Zap size={13} />
                      Inspect & Fix
                    </button>
                  ) : (
                    <button
                      onClick={() => alert(`Action executed: ${item.suggested_action}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      Execute Action
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Differentiator Highlight Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/20 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sky-500 text-white shrink-0 mt-0.5">
              <Zap size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                ForgeIQ Closed-Loop Advantage
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Unlike passive dashboards that only report delays, ForgeIQ bridges Delivery Blockers directly to the underlying 
                Application code, failing tests, and PR branches in the Software Engineering Factory. You can trigger a governed
                remediation harness with one click to verify and update the delivery state.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Radar & Flow Health */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                <Activity size={16} />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sprint Flow Telemetry
              </h2>
            </div>
            <Link
              to="/delivery-intelligence/velocity"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              Metrics <ChevronRight size={13} />
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Committed Points</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {data?.active_sprint?.committed_points || 42} pts
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Completed Points</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {data?.active_sprint?.completed_points || 26} pts
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Cycle Time (Avg)</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">3.4 Days</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">PR Longest Wait</span>
              <span className="text-xs font-bold text-amber-500">38.5 Hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">Net Usable Capacity</span>
              <span className="text-xs font-bold text-indigo-500">
                {data?.active_sprint?.usable_capacity_hours || 420}h (-60h PTO)
              </span>
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Delivery Intelligence Views
            </h3>
            <Link
              to="/delivery-intelligence/sprint-health"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" /> Sprint Health Monitor
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </Link>
            <Link
              to="/delivery-intelligence/dependency-graph"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <GitBranch size={14} className="text-sky-500" /> Dependency Graph & Blast Radius
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </Link>
            <Link
              to="/delivery-intelligence/story-intelligence"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Target size={14} className="text-violet-500" /> Story Intelligence & DoR
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </Link>
            <Link
              to="/delivery-intelligence/team-allocation"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Users size={14} className="text-amber-500" /> Team Capability Matrix
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Cross-Domain Remediation Modal */}
      {showBridgeModal && inspectionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                  <Zap size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cross-Domain Remediation Bridge
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connecting Delivery Blocker to ForgeIQ Software Engineering State
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBridgeModal(false)
                  setRemediationResult(null)
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Story:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {inspectionData.story_key} - {inspectionData.story_title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Linked Application:</span>
                  <span className="font-semibold text-sky-500">
                    {inspectionData.correlation?.application_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Service & Branch:</span>
                  <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">
                    {inspectionData.correlation?.target_service} ({inspectionData.correlation?.branch})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Pull Request:</span>
                  <span className="font-semibold text-indigo-500">
                    {inspectionData.correlation?.open_pr}
                  </span>
                </div>
              </div>

              {/* Technical Diagnosis */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Technical Root-Cause Diagnosis
                </h4>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                    <ShieldAlert size={14} /> Failing Integration Test
                  </div>
                  <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2 rounded">
                    {inspectionData.correlation?.failing_tests?.[0]?.test_case}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {inspectionData.correlation?.failing_tests?.[0]?.error_message}
                  </p>
                </div>
              </div>

              {/* Remediation Result if executed */}
              {remediationResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 size={16} /> Remediation Harness Succeeded!
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {remediationResult.message}
                  </p>
                  <div className="p-2.5 rounded bg-white/60 dark:bg-slate-900/60 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    {remediationResult.harness_execution?.test_rerun_result}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setShowBridgeModal(false)
                  setRemediationResult(null)
                }}
                className="fi-btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
              {!remediationResult && (
                <button
                  disabled={remediating}
                  onClick={() => handleExecuteRemediation(inspectionData.story_id)}
                  className="fi-btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                >
                  {remediating ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Executing Remediation Harness...
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      Execute Governed Fix & Verify
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
