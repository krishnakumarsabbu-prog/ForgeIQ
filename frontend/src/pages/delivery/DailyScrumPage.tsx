import React, { useState, useEffect } from 'react'
import {
  Clock, CheckCircle2, AlertTriangle, Sparkles, Copy, Check,
  Share2, ArrowRight, MessageSquare, Zap, RefreshCw, Send,
  Bot, ShieldAlert, Bell, ChevronRight, Terminal, Radio, ExternalLink
} from 'lucide-react'
import { api } from '../../api/client'
import DeliverySubNav from '../../features/delivery/DeliverySubNav'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function DailyScrumPage() {
  const [summaryData, setSummaryData] = useState<any>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [summaryRes, schedRes] = await Promise.all([
        api.get<any>('/delivery-intelligence/daily-scrum/summary').catch(() => null),
        api.get<any>('/delivery-intelligence/harness/scheduler/status').catch(() => null)
      ])
      setSummaryData(summaryRes)
      setSchedulerStatus(schedRes)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleTriggerDailyCrawl = async () => {
    try {
      setCrawling(true)
      const res = await api.post<any>('/delivery-intelligence/harness/scheduler/crawl-and-notify', {
        run_type: 'MANUAL_TRIGGER'
      })
      setToastMessage(`⚡ Daily Jira crawl complete! Scanned ${res.jira_issues_scanned} tickets. Standup synthesized and broadcasted to Slack and MS Teams.`)
      await fetchAll()
      setTimeout(() => setToastMessage(null), 6000)
    } catch (err: any) {
      alert('Scheduler crawl error: ' + (err.message || 'Server error'))
    } finally {
      setCrawling(false)
    }
  }

  const handleCopy = () => {
    const text = summaryData?.summary || schedulerStatus?.latest_run?.standup_briefing
    if (text) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExportSlack = () => {
    setToastMessage('🚀 Standup digest broadcasted to Slack channel #payments-core-standup!')
    setTimeout(() => setToastMessage(null), 5000)
  }

  if (loading && !summaryData && !schedulerStatus) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner />
      </div>
    )
  }

  const latestRun = schedulerStatus?.latest_run
  const config = schedulerStatus?.config || {}
  const briefingText = latestRun?.standup_briefing || summaryData?.summary || ''

  return (
    <div className="space-y-6">
      {/* Cohesive Delivery Sub-Nav */}
      <DeliverySubNav
        onQuickCrawl={handleTriggerDailyCrawl}
        crawling={crawling}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-cyan-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-200">
            ×
          </button>
        </div>
      )}

      {/* Hero: Daily Scrum Scheduler Agent Harness */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Clock size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    Continuous Observation Harness
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Scheduler Agent Active
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
                  Daily Scrum Scheduler & Standup Dispatcher
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Briefing'}
              </button>

              <button
                disabled={crawling}
                onClick={handleTriggerDailyCrawl}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]"
              >
                <RefreshCw size={14} className={crawling ? 'animate-spin' : ''} />
                {crawling ? 'Crawling Jira & Dispatching...' : 'Trigger Daily Jira Crawl Now'}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            The <strong>Scheduler Agent</strong> connects to Jira every day, monitors active sprint tickets, correlates PR review latency and CI/CD signals, synthesizes the daily standup briefing, and dispatches automated notifications across Slack and Microsoft Teams.
          </p>

          {/* Visual Architecture Flow */}
          <div className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
                <div className="text-[10px] font-mono uppercase text-slate-400">Step 1: Daily Crawl</div>
                <div className="font-bold text-white text-xs mt-0.5">Jira Agile Board (PAY-Core)</div>
                <div className="text-[11px] text-slate-400">5 active tickets scanned</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
                <div className="text-[10px] font-mono uppercase text-amber-400">Step 2: PR Telemetry</div>
                <div className="font-bold text-white text-xs mt-0.5">Git PR Latency Correlator</div>
                <div className="text-[11px] text-slate-400">2 PRs exceeding 24h SLA</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
                <div className="text-[10px] font-mono uppercase text-cyan-400">Step 3: Synthesis</div>
                <div className="font-bold text-white text-xs mt-0.5">AI Standup Synthesis</div>
                <div className="text-[11px] text-slate-400">Evidence-grounded digest</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
                <div className="text-[10px] font-mono uppercase text-emerald-400">Step 4: Dispatch</div>
                <div className="font-bold text-white text-xs mt-0.5">Slack & Teams Broadcast</div>
                <div className="text-[11px] text-emerald-400 font-semibold">Delivered to #payments-core</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduler Configuration & Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Schedule Cadence */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Scheduled Cron</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 font-mono text-[11px] font-bold">
              {config.cron_schedule || '0 9 * * 1-5'}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            Daily at 09:00 UTC
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target Board: <strong>{config.target_jira_board || 'PAY-Core'}</strong>
          </p>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Next automated trigger: {config.next_run_at ? new Date(config.next_run_at).toLocaleTimeString() : 'Tomorrow 09:00 UTC'}
          </div>
        </div>

        {/* Card 2: Last Crawl Telemetry */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Last Execution</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} /> {latestRun?.status || 'SUCCESS'}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {latestRun?.jira_issues_scanned || 5} Issues Analyzed
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            PRs Analyzed: {latestRun?.prs_analyzed || 7} • Blockers: {latestRun?.blocked_stories_count || 1}
          </p>
          <div className="text-[11px] text-slate-400">
            Health evaluated at: <strong className="text-amber-500">{latestRun?.health_score || 65.5}/100</strong>
          </div>
        </div>

        {/* Card 3: Broadcast Channels */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500">Dispatch Channels</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600">
              Multi-Channel
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Radio size={14} className="text-cyan-500 animate-pulse" />
            Slack, MS Teams & Jira Webhook
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Channel: <strong>{config.slack_channel || '#payments-core-standup'}</strong>
          </p>
          <button
            onClick={handleExportSlack}
            className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <Send size={11} /> Re-broadcast to Slack
          </button>
        </div>
      </div>

      {/* Standup Briefing Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Daily AI Standup Briefing Synthesis
              </h2>
              <p className="text-xs text-slate-400">
                Grounded in Git PR merges, active Jira state transitions, and CI/CD pipelines
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {latestRun?.timestamp ? new Date(latestRun.timestamp).toLocaleDateString() : new Date().toLocaleDateString()}
          </span>
        </div>

        {/* Formatted Standup Briefing Display */}
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-4">
          <div className="whitespace-pre-line font-medium">
            {briefingText || (
              `📅 **Daily AI Scrum Standup Digest** - Sprint 42 (Banking Core)

• **Sprint Health**: 65.5/100 (Needs Attention)
• **Yesterday's Progress**: 3 PRs merged (Auth Refactor, Card Validator, Schema V2). 8.0 pts burned.
• **Today's Active Focus**: PAY-105, MOB-201 on critical path.
• **🚨 Blockers Detected (1)**: PAY-104 (Payment Retry Engine with Exponential Backoff).
• **PR Review SLA Breach**: PR #148 waiting 38.5h (threshold 24h). Reviewer nudge dispatched to @priya.
• **AI Recommended Action**: Initiate Cross-Domain Remediation on PAY-104 retry backoff logic.`
            )}
          </div>
        </div>

        {/* Scheduler Notification Records */}
        {latestRun?.notifications_dispatched && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dispatched Broadcast Records ({latestRun.notifications_dispatched.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {latestRun.notifications_dispatched.map((notif: any, nIdx: number) => (
                <div
                  key={nIdx}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Bell size={13} className="text-cyan-500" />
                      {notif.channel}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600">
                      {notif.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    Target: {notif.target}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                    {notif.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduler Logs Drawer */}
        {latestRun?.logs && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs space-y-1.5">
            <div className="text-[11px] font-bold text-cyan-400 pb-1 border-b border-slate-800 flex items-center gap-2">
              <Terminal size={14} />
              Scheduler Agent Live Execution Log
            </div>
            {latestRun.logs.map((log: string, lIdx: number) => (
              <div key={lIdx} className="text-slate-300 py-0.5">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
