import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useQueries'
import { PageHeader, StatusBadge, StageStepIndicator, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { HarnessPipelineCanvas } from '../components/ui/HarnessPipelineCanvas'
import {
  Boxes, Bot, Workflow, GitBranch, Activity, FileCheck, Shield, Wrench,
  Coins, Gauge, Play, Plus, Network, Download, AlertTriangle,
  CheckCircle2, XCircle, Lock, Zap, TrendingUp, TrendingDown, ChevronRight,
  ArrowUpRight, Sparkles, BarChart3, Globe, Server,
} from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import type { DashboardData } from '../types'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatTimeAgo(iso?: string): string {
  if (!iso) return 'N/A'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const activityIconMap: Record<string, React.ReactNode> = {
  ExecutionStarted:    <Play size={12} className="text-sky-500" />,
  PipelineStarted:    <GitBranch size={12} className="text-sky-500" />,
  HarnessStarted:     <Workflow size={12} className="text-indigo-600" />,
  GraphNodeStarted:   <Network size={12} className="text-slate-500" />,
  AgentStarted:       <Bot size={12} className="text-sky-600" />,
  ToolExecuted:       <Wrench size={12} className="text-amber-500" />,
  EvidenceCreated:    <FileCheck size={12} className="text-emerald-500" />,
  LoopTriggered:      <Zap size={12} className="text-amber-500" />,
  ApprovalRequested:  <Lock size={12} className="text-amber-500" />,
  ExecutionFailed:    <XCircle size={12} className="text-rose-500" />,
  ExecutionCompleted: <CheckCircle2 size={12} className="text-emerald-500" />,
  PipelineCompleted:  <CheckCircle2 size={12} className="text-emerald-500" />,
  HarnessCompleted:   <CheckCircle2 size={12} className="text-emerald-500" />,
  RetryStarted:       <Zap size={12} className="text-amber-500" />,
}

/* ── Metric Card ── */
function MetricCard({
  label, value, trend, icon: Icon, to, gradient, onClick,
}: {
  label: string
  value: string | number
  trend: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  to: string
  gradient: string[]
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: '#fff',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 4px 24px -4px rgba(0,14,35,0.12), 0 1px 3px rgba(0,0,0,0.04)`
        e.currentTarget.style.borderColor = 'rgba(203,213,225,0.9)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)'
        e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'
      }}
    >
      {/* Gradient accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }}
      />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${gradient[0]}18, ${gradient[1]}12)`,
            border: `1px solid ${gradient[0]}30`,
          }}
        >
          <Icon size={13} style={{ color: gradient[0] }} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
        {value}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400">{trend}</span>
        <ArrowUpRight
          size={12}
          className="text-slate-200 group-hover:text-sky-500 transition-colors"
        />
      </div>
    </button>
  )
}

/* ── Section Header ── */
function SectionHeader({
  icon: Icon, title, subtitle, action, iconColor = '#0284c7',
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  title: string
  subtitle?: string
  action?: React.ReactNode
  iconColor?: string
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3.5"
      style={{ borderBottom: '1px solid rgba(226,232,240,0.7)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: `${iconColor}18`,
            border: `1px solid ${iconColor}30`,
          }}
        >
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ── View All Link ── */
function ViewAll({ onClick, label = 'View All' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-semibold transition-colors"
      style={{ color: '#0284c7' }}
      onMouseEnter={e => e.currentTarget.style.color = '#0369a1'}
      onMouseLeave={e => e.currentTarget.style.color = '#0284c7'}
    >
      {label} <ChevronRight size={13} />
    </button>
  )
}

export default function CommandCenter() {
  const { data, isLoading } = useDashboard()
  const navigate = useNavigate()

  if (isLoading) return (
    <>
      <PageHeader
        title="Engineering Command Center"
        description="Monitor and operate the AI Engineering Factory."
        icon={<Zap size={18} />}
      />
      <LoadingSpinner message="Loading engineering intelligence..." />
    </>
  )
  if (!data) return (
    <>
      <PageHeader
        title="Engineering Command Center"
        description="Monitor and operate the AI Engineering Factory."
        icon={<Zap size={18} />}
      />
      <EmptyState message="No dashboard data available" />
    </>
  )

  const d = data as DashboardData

  const primaryActions = [
    { label: 'Start Engineering', icon: Play, to: '/executions', primary: true },
    { label: 'Create Agent', icon: Plus, to: '/agent-factory' },
    { label: 'Create Harness', icon: Workflow, to: '/harness-builder' },
    { label: 'Design Pipeline', icon: GitBranch, to: '/pipelines' },
    { label: 'Import App', icon: Download, to: '/applications' },
  ]

  const metrics = [
    { key: 'active_executions', label: 'Active Executions', value: d.execution_status.RUNNING + d.execution_status.AWAITING_APPROVAL, icon: Activity, to: '/executions', trend: '+12% vs last week', gradient: ['#0ea5e9', '#0a68f4'] },
    { key: 'applications',      label: 'Applications',     value: d.counts.applications,   icon: Boxes,      to: '/applications', trend: 'Production Ready',  gradient: ['#3b82f6', '#4f46e5'] },
    { key: 'pipelines',         label: 'Pipelines',        value: d.counts.pipelines,      icon: GitBranch,  to: '/pipelines',    trend: '4 Active Runs',     gradient: ['#6366f1', '#7c3aed'] },
    { key: 'harnesses',         label: 'Harnesses',        value: d.counts.harnesses,      icon: Workflow,   to: '/harnesses',    trend: 'Verified',          gradient: ['#8b5cf6', '#a855f7'] },
    { key: 'agents',            label: 'AI Agents',        value: d.counts.agents,         icon: Bot,        to: '/agents',       trend: 'Autonomous Mode',   gradient: ['#00adef', '#06b6d4'] },
    { key: 'success_rate',      label: 'Success Rate',     value: `${d.success_rate}%`,    icon: Gauge,      to: '/quality',      trend: '↑ 4.2% MoM',       gradient: ['#10b981', '#0891b2'] },
    { key: 'ai_cost',           label: 'AI Cost (30d)',    value: formatCost(d.economics.total_cost_cents), icon: Coins, to: '/engineering-economics', trend: 'Optimized', gradient: ['#f59e0b', '#f97316'] },
    { key: 'throughput',        label: 'Throughput',       value: d.throughput,            icon: TrendingUp, to: '/executions',   trend: 'High Velocity',     gradient: ['#06b6d4', '#3b82f6'] },
  ]

  return (
    <>
      <PageHeader
        title="Engineering Command Center"
        description="Autonomous delivery fabric orchestrating agents, governance, and progressive delivery."
        badge="Enterprise Platform"
        badgeVariant="cyan"
        icon={<Zap size={18} />}
        actions={
          <div className="flex items-center gap-2">
            {primaryActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={action.primary ? 'fi-btn-primary' : 'fi-btn-secondary'}
              >
                <action.icon size={13} />
                {action.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-[1800px] mx-auto">

        {/* ── HARNESS AUTONOMOUS PIPELINE CANVAS ── */}
        <HarnessPipelineCanvas />

        {/* ── TOP METRICS STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {metrics.map((m) => (
            <MetricCard
              key={m.key}
              label={m.label}
              value={m.value}
              trend={m.trend}
              icon={m.icon}
              to={m.to}
              gradient={m.gradient}
              onClick={() => navigate(m.to)}
            />
          ))}
        </div>

        {/* ── ACTIVE EXECUTIONS TELEMETRY ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#fff',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
          }}
        >
          <SectionHeader
            icon={Activity}
            title="Active Execution Telemetry"
            subtitle="Real-time autonomous pipeline stage tracking"
            action={<ViewAll onClick={() => navigate('/executions')} label="View Full History" />}
          />
          {d.active_executions.length === 0 ? (
            <EmptyState
              message="No active executions at this moment"
              description="Start engineering to see live execution telemetry here."
              action={
                <button className="fi-btn-primary" onClick={() => navigate('/start-engineering')}>
                  <Play size={13} /> Start Engineering
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>Application</th>
                    <th>Pipeline</th>
                    <th>Stage Progress</th>
                    <th>Current Stage</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th className="text-right">Duration</th>
                    <th className="text-right">Retries</th>
                    <th className="text-right">Cost</th>
                    <th>Started</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.active_executions.map((exec) => (
                    <tr
                      key={exec.id}
                      className="cursor-pointer group"
                      onClick={() => navigate(`/executions/${exec.id}`)}
                    >
                      <td>
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: '#0284c7' }}
                        >
                          {exec.id.slice(0, 12)}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-900">{exec.application}</td>
                      <td className="text-slate-600 font-medium">{exec.pipeline}</td>
                      <td>
                        <StageStepIndicator currentStage={exec.current_stage} status={exec.status} />
                      </td>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold"
                          style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}
                        >
                          {exec.current_stage}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Bot size={12} className="text-sky-500" />
                          <span className="text-xs font-medium text-slate-700">{exec.agent}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={exec.status} /></td>
                      <td className="text-right font-mono text-xs text-slate-600">{formatDuration(exec.duration_seconds)}</td>
                      <td className="text-right font-mono text-xs text-slate-600">{exec.retries}</td>
                      <td className="text-right font-mono text-xs font-semibold text-slate-700">{formatCost(exec.cost_cents)}</td>
                      <td className="text-xs text-slate-400">{formatTimeAgo(exec.started_at)}</td>
                      <td>
                        <ChevronRight size={14} className="text-slate-200 group-hover:text-sky-500 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── ACTIVITY FEED + PIPELINE HEALTH ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Activity Feed */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#fff',
              border: '1px solid rgba(226,232,240,0.8)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
            }}
          >
            <SectionHeader
              icon={Zap}
              title="Autonomous Activity Stream"
              subtitle="Live event feed"
              action={
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  ● Live
                </span>
              }
            />
            <div className="max-h-80 overflow-y-auto">
              {d.activity_feed.length === 0 ? (
                <EmptyState message="No recent activity logged" />
              ) : (
                d.activity_feed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                    onClick={() => navigate(`/executions/${item.execution_id}`)}
                    style={{ ':hover': { background: 'rgba(240,249,255,0.5)' } } as React.CSSProperties}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,249,255,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(226,232,240,0.7)' }}
                    >
                      {activityIconMap[item.event_type] ?? <Activity size={12} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-snug truncate">{item.message}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {item.application} • {formatTimeAgo(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pipeline Health */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#fff',
              border: '1px solid rgba(226,232,240,0.8)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
            }}
          >
            <SectionHeader
              icon={GitBranch}
              title="Pipeline Operational Health"
              subtitle="Success rate & throughput metrics"
              action={<ViewAll onClick={() => navigate('/pipelines')} />}
            />
            <div className="overflow-x-auto max-h-80">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Pipeline</th>
                    <th className="text-right">Runs</th>
                    <th className="text-right">Success</th>
                    <th className="text-right">Failures</th>
                    <th className="text-right">Avg Duration</th>
                    <th>Last Run</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {d.pipeline_health.map((ph) => {
                    const successRate = ph.runs > 0 ? (ph.success / ph.runs) * 100 : 0
                    return (
                      <tr
                        key={ph.id}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/pipelines/${ph.id}`)}
                      >
                        <td className="font-semibold text-slate-900">{ph.name}</td>
                        <td className="text-right font-mono text-xs text-slate-600">{ph.runs}</td>
                        <td className="text-right font-mono text-xs font-bold" style={{ color: '#059669' }}>{ph.success}</td>
                        <td className="text-right font-mono text-xs font-bold" style={{ color: '#e11d48' }}>{ph.failures}</td>
                        <td className="text-right font-mono text-xs text-slate-600">{formatDuration(ph.avg_duration_seconds)}</td>
                        <td className="text-xs text-slate-400">{formatTimeAgo(ph.last_run)}</td>
                        <td>
                          {successRate >= 75 ? (
                            <TrendingUp size={14} style={{ color: '#10b981' }} />
                          ) : successRate >= 50 ? (
                            <TrendingDown size={14} style={{ color: '#f59e0b' }} />
                          ) : (
                            <TrendingDown size={14} style={{ color: '#f43f5e' }} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── ECONOMICS CHART + SECURITY GUARD ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Economics */}
          <div
            className="rounded-2xl overflow-hidden lg:col-span-2"
            style={{
              background: '#fff',
              border: '1px solid rgba(226,232,240,0.8)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
            }}
          >
            <SectionHeader
              icon={Coins}
              title="Autonomous Engineering Economics"
              subtitle="AI spend, tokens synthesized, and retry overhead"
              iconColor="#f59e0b"
              action={<ViewAll onClick={() => navigate('/engineering-economics')} label="Cost Breakdown" />}
            />
            <div className="p-5">
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'AI Spend', value: formatCost(d.economics_breakdown.ai_spend_cents), color: '#0284c7' },
                  { label: 'Tokens Synthesized', value: d.economics_breakdown.total_tokens.toLocaleString(), color: '#7c3aed' },
                  { label: 'Total Exec Time', value: formatDuration(d.economics_breakdown.execution_time_seconds), color: '#059669' },
                  { label: 'Retry Overhead', value: formatCost(d.economics_breakdown.retry_cost_cents), color: '#f59e0b' },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="p-3.5 rounded-xl"
                    style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.7)' }}
                  >
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <ReactECharts
                style={{ height: 200 }}
                option={{
                  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                  legend: { data: ['Cost by Agent', 'Cost by Application'], bottom: 0, textStyle: { fontSize: 11, fontFamily: 'Inter' } },
                  grid: { left: 45, right: 20, top: 10, bottom: 40 },
                  xAxis: {
                    type: 'category',
                    data: d.economics_breakdown.cost_by_agent.map((c) => c.name.slice(0, 15)),
                    axisLabel: { fontSize: 10, rotate: 25, color: '#64748b' },
                    axisLine: { lineStyle: { color: '#e2e8f0' } },
                    axisTick: { show: false },
                  },
                  yAxis: {
                    type: 'value',
                    name: 'Cents',
                    nameTextStyle: { fontSize: 10, color: '#94a3b8' },
                    axisLabel: { fontSize: 10, color: '#64748b' },
                    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
                  },
                  series: [
                    {
                      name: 'Cost by Agent',
                      type: 'bar',
                      data: d.economics_breakdown.cost_by_agent.map((c) => c.cost_cents),
                      itemStyle: { color: '#00adef', borderRadius: [4, 4, 0, 0] },
                      barMaxWidth: 28,
                    },
                    {
                      name: 'Cost by Application',
                      type: 'bar',
                      data: d.economics_breakdown.cost_by_application.map((c) => c.cost_cents),
                      itemStyle: { color: '#7c3aed', borderRadius: [4, 4, 0, 0] },
                      barMaxWidth: 28,
                    },
                  ],
                }}
              />
            </div>
          </div>

          {/* Security Guard */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#fff',
              border: '1px solid rgba(226,232,240,0.8)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
            }}
          >
            <SectionHeader
              icon={Shield}
              title="Governance & Risk Guard"
              subtitle="Live security posture"
              iconColor="#7c3aed"
              action={<ViewAll onClick={() => navigate('/security')} label="Inspect" />}
            />
            <div className="p-4 space-y-2">
              {[
                { label: 'Open Vulnerabilities', value: d.security_quality.open_vulnerabilities, icon: AlertTriangle, bg: 'rgba(244,63,94,0.08)', color: '#e11d48', border: 'rgba(244,63,94,0.2)', to: '/security' },
                { label: 'Failed Test Suites',   value: d.security_quality.failed_tests,         icon: XCircle,      bg: 'rgba(245,158,11,0.08)', color: '#b45309', border: 'rgba(245,158,11,0.2)', to: '/quality' },
                { label: 'Build Breakages',      value: d.security_quality.build_failures,       icon: XCircle,      bg: 'rgba(244,63,94,0.08)', color: '#e11d48', border: 'rgba(244,63,94,0.2)', to: '/build-automation' },
                { label: 'High-Risk Changes',    value: d.security_quality.high_risk_changes,    icon: AlertTriangle,bg: 'rgba(245,158,11,0.08)', color: '#b45309', border: 'rgba(245,158,11,0.2)', to: '/applications' },
                { label: 'Pending Approvals',    value: d.security_quality.pending_approvals,    icon: Lock,         bg: 'rgba(245,158,11,0.08)', color: '#b45309', border: 'rgba(245,158,11,0.2)', to: '/executions' },
                { label: 'Security Findings',    value: d.security_quality.security_findings,    icon: Shield,       bg: 'rgba(100,116,139,0.08)', color: '#475569', border: 'rgba(100,116,139,0.2)', to: '/security' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all group"
                  style={{ border: '1px solid rgba(226,232,240,0.6)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = item.bg
                    e.currentTarget.style.borderColor = item.border
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(226,232,240,0.6)'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: item.bg, border: `1px solid ${item.border}` }}
                    >
                      <item.icon size={13} style={{ color: item.color }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                  </div>
                  <span
                    className="text-sm font-black"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RECENT APPLICATIONS ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#fff',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
          }}
        >
          <SectionHeader
            icon={Boxes}
            title="Enterprise Application Services"
            subtitle="All applications managed by the AI Engineering Factory"
            action={<ViewAll onClick={() => navigate('/applications')} label="Manage Services" />}
          />
          {d.recent_applications.length === 0 ? (
            <EmptyState
              message="No applications registered yet"
              description="Import an existing application or start with a new greenfield project."
              action={
                <div className="flex items-center gap-2">
                  <button className="fi-btn-primary" onClick={() => navigate('/start-engineering')}>
                    <Plus size={13} /> New Application
                  </button>
                  <button className="fi-btn-secondary" onClick={() => navigate('/brownfield-import')}>
                    <Download size={13} /> Import Brownfield
                  </button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Type</th>
                    <th>Stack</th>
                    <th>Environment</th>
                    <th>Last Commit</th>
                    <th>Engineering State</th>
                    <th>Last Execution</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.recent_applications.map((app) => (
                    <tr
                      key={app.id}
                      className="cursor-pointer group"
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-black shrink-0"
                            style={{ background: 'linear-gradient(135deg, #00adef, #0a68f4)' }}
                          >
                            {app.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-900">{app.name}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={
                            app.type === 'greenfield'
                              ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }
                              : { background: 'rgba(14,165,233,0.1)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }
                          }
                        >
                          {app.type}
                        </span>
                      </td>
                      <td className="text-slate-600 font-medium text-xs">{app.technology}</td>
                      <td className="text-slate-600 font-medium text-xs">{app.environment}</td>
                      <td>
                        <span className="font-mono text-[11px] text-slate-400">{app.last_commit}</span>
                      </td>
                      <td>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(248,250,252,0.9)', color: '#475569', border: '1px solid rgba(226,232,240,0.7)' }}
                        >
                          {app.engineering_state}
                        </span>
                      </td>
                      <td><StatusBadge status={app.last_execution} /></td>
                      <td><StatusBadge status={app.status} /></td>
                      <td>
                        <ChevronRight size={14} className="text-slate-200 group-hover:text-sky-500 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
