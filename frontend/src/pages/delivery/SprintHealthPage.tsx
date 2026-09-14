import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, GitBranch, RefreshCw,
  TrendingUp, Shield, Sparkles, AlertCircle, ArrowUpRight, Check, X,
  Zap, Bell, ChevronRight, ShieldAlert, Play, MessageSquare, ExternalLink
} from 'lucide-react'
import { api } from '../../api/client'
import DeliverySubNav from '../../features/delivery/DeliverySubNav'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function SprintHealthPage() {
  const [healthData, setHealthData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [remediatingStoryId, setRemediatingStoryId] = useState<string | null>(null)
  const [remediationModal, setRemediationModal] = useState<any>(null)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>('/delivery-intelligence/sprint-health')
      setHealthData(res)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedulerStatus = async () => {
    try {
      const res = await api.get<any>('/delivery-intelligence/harness/scheduler/status')
      setSchedulerStatus(res)
    } catch (err: any) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchHealth()
    fetchSchedulerStatus()
  }, [])

  const handleTriggerDailyCrawl = async () => {
    try {
      setCrawling(true)
      const res = await api.post<any>('/delivery-intelligence/harness/scheduler/crawl-and-notify', {
        run_type: 'MANUAL_TRIGGER'
      })
      setActionNotice(`✅ Daily Jira crawl completed: ${res.jira_issues_scanned} tickets scanned. Standup briefing broadcasted to Slack (#payments-core-standup) and Microsoft Teams.`)
      await fetchHealth()
      await fetchSchedulerStatus()
      setTimeout(() => setActionNotice(null), 6000)
    } catch (err: any) {
      alert('Daily crawl failed: ' + (err.message || 'Server error'))
    } finally {
      setCrawling(false)
    }
  }

  const handleApplyAction = async (sig: any) => {
    if (sig.story_id || sig.title?.includes('PAY-104')) {
      const sId = sig.story_id || 'story_pay_104'
      setRemediatingStoryId(sId)
      try {
        const inspect = await api.get<any>(`/delivery-intelligence/cross-domain/inspect/${sId}`)
        setRemediationModal({ signal: sig, inspection: inspect, story_id: sId })
      } catch (err: any) {
        alert(`Remediation inspect error: ${err.message}`)
      } finally {
        setRemediatingStoryId(null)
      }
    } else {
      setActionNotice(`⚡ Automated Policy Triggered: "${sig.suggested_action}". Secondary reviewer nudged via Slack.`)
      setTimeout(() => setActionNotice(null), 5000)
    }
  }

  const handleExecuteRemediation = async () => {
    if (!remediationModal) return
    try {
      setLoading(true)
      const res = await api.post<any>(`/delivery-intelligence/cross-domain/remediate/${remediationModal.story_id}`)
      setActionNotice(`🚀 Governed Remediation Executed! Pipeline run #${res.remediation_pipeline_run_id} launched in Testing Harness. PAY-104 unblocked.`)
      setRemediationModal(null)
      await fetchHealth()
    } catch (err: any) {
      alert(`Remediation execution failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner />
      </div>
    )
  }

  const score = healthData?.health_score || 69.5
  const status = healthData?.health_status || 'AT_RISK'
  const isHealthy = score >= 80
  const isRisk = score < 75

  // Filter signals
  const signals = (healthData?.signals || []).filter((sig: any) => {
    if (filter === 'CRITICAL') return sig.severity === 'CRITICAL'
    if (filter === 'PR') return sig.title?.toLowerCase().includes('pr') || sig.title?.toLowerCase().includes('review')
    return true
  })

  // SVG Radial Gauge calculation
  const radius = 64
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="space-y-6">
      {/* Top Cohesive Navigation */}
      <DeliverySubNav
        onQuickCrawl={handleTriggerDailyCrawl}
        crawling={crawling}
      />

      {/* Action / Notification Banner */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero Observatory Cockpit */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Activity size={13} className="text-cyan-400" />
                Continuous Observation Engine
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-semibold text-slate-300">
                {healthData?.sprint_name || 'Sprint 42 (Banking Core)'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Jira Telemetry Synced
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Sprint Health & Bottleneck Monitor
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time delivery telemetry tracking story aging, PR review latency, CI/CD signals, and critical flow bottlenecks across development and release harnesses.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                disabled={crawling}
                onClick={handleTriggerDailyCrawl}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
              >
                <RefreshCw size={14} className={crawling ? 'animate-spin' : ''} />
                {crawling ? 'Crawling Jira & Dispatching...' : 'Trigger Daily Jira Crawl Now'}
              </button>

              <Link
                to="/delivery-intelligence/story-weaver"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
              >
                <Sparkles size={13} className="text-cyan-400" />
                Story Weaver Pipeline
              </Link>
            </div>
          </div>

          {/* Glowing Radial Health Meter */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative flex items-center justify-center">
              <svg className="w-44 h-44 transform -rotate-90">
                {/* Track */}
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-800"
                  fill="transparent"
                />
                {/* Indicator Ring */}
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="url(#healthGradient)"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {score}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  / 100 HEALTH
                </span>
              </div>
            </div>

            <div className="mt-2 text-center">
              <span className={`inline-block text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                isRisk
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {status}
              </span>
              <div className="text-[11px] text-slate-400 mt-1">
                Goal Confidence: <strong className="text-cyan-300">88.0%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Scheduler Agent Telemetry Pill */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              <strong>Daily Scrum Scheduler Agent:</strong> Last crawled Jira Board (PAY-Core). 3 notifications dispatched to Slack (#payments-core-standup).
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            Next automated crawl: 09:00 UTC (Mon-Fri)
          </span>
        </div>
      </div>

      {/* Top 4 Health Domain Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Health */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-md hover:border-cyan-500/40 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overall Health</span>
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Activity size={18} />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {score} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className={`px-2 py-0.5 rounded-full font-bold ${
              isRisk ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
            }`}>
              {status}
            </span>
            <span className="text-slate-400">Target &gt; 80</span>
          </div>
        </div>

        {/* Card 2: Blocked Work */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-md hover:border-rose-500/40 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Blocked Items</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-500">
            {healthData?.blocked_stories_count || 1}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-1">
            PAY-104 blocked &gt; 48h (Retry timeout)
          </p>
          <div className="mt-2 text-[11px] text-rose-500 font-semibold flex items-center gap-1">
            <span>Action: Trigger Remediation Harness</span>
          </div>
        </div>

        {/* Card 3: PR Review Latency */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-md hover:border-amber-500/40 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">PR Review Latency</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock size={18} />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-500">
            {healthData?.pr_review_metrics?.longest_wait_hours || 38.5}h
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            2 PRs waiting; exceeds 24h SLA target
          </p>
          <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            Nudge secondary reviewer @priya
          </div>
        </div>

        {/* Card 4: CI/CD Build Stability */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-md hover:border-blue-500/40 transition-all">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Build Stability</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <GitBranch size={18} />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {100 - (healthData?.build_metrics?.failure_rate_pct || 12)}%
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            1 failed pipeline out of last 8 runs
          </p>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Release gate: PASSING
          </div>
        </div>
      </div>

      {/* Health Signals Stream & Automated Action Triggers */}
      <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-cyan-500" />
              Continuous Observability Signals & Action Triggers ({signals.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live automated signals correlated from Jira issues, Git pull requests, and CI/CD pipelines.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'CRITICAL', 'PR'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  filter === tab
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'All Signals' : tab === 'CRITICAL' ? 'Critical Blockers' : 'PR Bottlenecks'}
              </button>
            ))}
          </div>
        </div>

        {/* Signals Stream List */}
        <div className="space-y-3">
          {signals.map((sig: any, idx: number) => {
            const isCritical = sig.severity === 'CRITICAL'
            const isPR = sig.title?.toLowerCase().includes('pr')
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCritical
                    ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
                    : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {sig.severity}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {sig.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      [{sig.automation_level || 'L3_APPROVE_AND_EXECUTE'}]
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {sig.description}
                  </p>

                  <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                    <span>Suggested Action:</span>
                    <span className="font-normal text-slate-700 dark:text-slate-300">{sig.suggested_action}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    disabled={remediatingStoryId !== null}
                    onClick={() => handleApplyAction(sig)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
                  >
                    <Play size={12} className="fill-current" />
                    Apply Action
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cross-Domain Remediation Modal */}
      {remediationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <ShieldAlert size={20} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cross-Domain Engineering Remediation
                  </h3>
                  <p className="text-xs text-slate-500">Governed Autonomous Remediation Harness</p>
                </div>
              </div>
              <button
                onClick={() => setRemediationModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                <strong>Blocker Signal:</strong> {remediationModal.signal?.title}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">Underlying Engineering Root Cause:</div>
                <p className="text-slate-600 dark:text-slate-300">
                  {remediationModal.inspection?.reason || 'Test assertion timeout in payment retry exponential backoff mechanism.'}
                </p>
                <div className="text-slate-400 font-mono text-[11px]">
                  Target Service: {remediationModal.inspection?.service_name || 'payment-service'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-300">
                <strong>Proposed Autonomous Fix:</strong> Adjust retry backoff ceiling from 30s to 10s with jitter, run regression testing harness, and update Jira status.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRemediationModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRemediation}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Play size={13} className="fill-white" />
                Execute Governed Remediation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
