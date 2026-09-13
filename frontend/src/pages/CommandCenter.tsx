import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import {
  Boxes, Bot, Workflow, GitBranch, Activity, FileCheck, Shield, Wrench,
  Coins, Gauge, Play, Plus, Network, Download, AlertTriangle,
  CheckCircle2, XCircle, Lock, Zap, TrendingUp, TrendingDown, ChevronRight,
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
  ExecutionStarted: <Play size={12} className="text-blue-500" />,
  PipelineStarted: <GitBranch size={12} className="text-blue-500" />,
  HarnessStarted: <Workflow size={12} className="text-forgeiq-600" />,
  GraphNodeStarted: <Network size={12} className="text-slate-500" />,
  AgentStarted: <Bot size={12} className="text-forgeiq-600" />,
  ToolExecuted: <Wrench size={12} className="text-amber-500" />,
  EvidenceCreated: <FileCheck size={12} className="text-emerald-500" />,
  LoopTriggered: <Zap size={12} className="text-amber-500" />,
  ApprovalRequested: <Lock size={12} className="text-amber-500" />,
  ExecutionFailed: <XCircle size={12} className="text-red-500" />,
  ExecutionCompleted: <CheckCircle2 size={12} className="text-emerald-500" />,
  PipelineCompleted: <CheckCircle2 size={12} className="text-emerald-500" />,
  HarnessCompleted: <CheckCircle2 size={12} className="text-emerald-500" />,
  RetryStarted: <Zap size={12} className="text-amber-500" />,
}

export default function CommandCenter() {
  const { data, isLoading } = useDashboard()
  const navigate = useNavigate()

  if (isLoading) return (
    <>
      <PageHeader title="Engineering Command Center" description="Monitor and operate the AI Engineering Factory." />
      <LoadingSpinner />
    </>
  )
  if (!data) return (
    <>
      <PageHeader title="Engineering Command Center" description="Monitor and operate the AI Engineering Factory." />
      <EmptyState message="No dashboard data available" />
    </>
  )

  const d = data as DashboardData

  const primaryActions = [
    { label: 'Start Engineering', icon: Play, to: '/executions', primary: true },
    { label: 'Create Agent', icon: Plus, to: '/agent-factory' },
    { label: 'Create Harness', icon: Workflow, to: '/harness-builder' },
    { label: 'Design Pipeline', icon: GitBranch, to: '/pipelines' },
    { label: 'Import Application', icon: Download, to: '/applications' },
  ]

  const metrics = [
    { key: 'active_executions', label: 'Active Executions', value: d.execution_status.RUNNING + d.execution_status.AWAITING_APPROVAL, icon: Activity, to: '/executions' },
    { key: 'applications', label: 'Applications', value: d.counts.applications, icon: Boxes, to: '/applications' },
    { key: 'pipelines', label: 'Pipelines', value: d.counts.pipelines, icon: GitBranch, to: '/pipelines' },
    { key: 'harnesses', label: 'Harnesses', value: d.counts.harnesses, icon: Workflow, to: '/harnesses' },
    { key: 'agents', label: 'Agents', value: d.counts.agents, icon: Bot, to: '/agents' },
    { key: 'success_rate', label: 'Success Rate', value: `${d.success_rate}%`, icon: Gauge, to: '/quality' },
    { key: 'ai_cost', label: 'AI Cost', value: formatCost(d.economics.total_cost_cents), icon: Coins, to: '/engineering-economics' },
    { key: 'throughput', label: 'Throughput', value: d.throughput, icon: TrendingUp, to: '/executions' },
  ]

  return (
    <>
      <PageHeader
        title="Engineering Command Center"
        description="Monitor and operate the AI Engineering Factory."
        actions={
          <div className="flex items-center gap-2">
            {primaryActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={action.primary ? 'fi-btn-primary' : 'fi-btn-secondary'}
              >
                <action.icon size={14} />
                {action.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* TOP METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => navigate(m.to)}
              className="bg-white px-3 py-2.5 text-left hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{m.label}</span>
                <m.icon size={12} className="text-forgeiq-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg font-semibold text-slate-900 leading-tight">{m.value}</div>
            </button>
          ))}
        </div>

        {/* ACTIVE EXECUTIONS */}
        <div className="fi-card">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Activity size={14} className="text-forgeiq-600" /> Active Executions
            </h3>
            <button onClick={() => navigate('/executions')} className="text-xs text-forgeiq-600 hover:text-forgeiq-700 flex items-center gap-0.5">
              View All <ChevronRight size={12} />
            </button>
          </div>
          {d.active_executions.length === 0 ? (
            <EmptyState message="No active executions" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Execution</th>
                    <th>Application</th>
                    <th>Pipeline</th>
                    <th>Harness</th>
                    <th>Current Stage</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th className="text-right">Duration</th>
                    <th className="text-right">Retries</th>
                    <th className="text-right">Cost</th>
                    <th>Started</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {d.active_executions.map((exec) => (
                    <tr
                      key={exec.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/executions/${exec.id}`)}
                    >
                      <td className="font-mono text-xs text-slate-700">{exec.id.slice(0, 12)}</td>
                      <td className="font-medium text-slate-900">{exec.application}</td>
                      <td className="text-slate-600">{exec.pipeline}</td>
                      <td className="text-slate-600">{exec.harness}</td>
                      <td className="text-slate-600">{exec.current_stage}</td>
                      <td className="text-slate-600">{exec.agent}</td>
                      <td><StatusBadge status={exec.status} /></td>
                      <td className="text-right text-slate-600">{formatDuration(exec.duration_seconds)}</td>
                      <td className="text-right text-slate-600">{exec.retries}</td>
                      <td className="text-right text-slate-600">{formatCost(exec.cost_cents)}</td>
                      <td className="text-xs text-slate-500">{formatTimeAgo(exec.started_at)}</td>
                      <td><ChevronRight size={14} className="text-slate-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ENGINEERING ACTIVITY + PIPELINE HEALTH */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity Feed */}
          <div className="fi-card">
            <div className="px-4 py-2.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Zap size={14} className="text-forgeiq-600" /> Engineering Activity
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {d.activity_feed.length === 0 ? (
                <EmptyState message="No recent activity" />
              ) : (
                d.activity_feed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/executions/${item.execution_id}`)}
                  >
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      {activityIconMap[item.event_type] ?? <Activity size={12} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{item.message}</p>
                      <p className="text-xs text-slate-400">{item.application} - {formatTimeAgo(item.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pipeline Health */}
          <div className="fi-card">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <GitBranch size={14} className="text-forgeiq-600" /> Pipeline Health
              </h3>
              <button onClick={() => navigate('/pipelines')} className="text-xs text-forgeiq-600 hover:text-forgeiq-700 flex items-center gap-0.5">
                View All <ChevronRight size={12} />
              </button>
            </div>
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
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate(`/pipelines/${ph.id}`)}
                      >
                        <td className="font-medium text-slate-900">{ph.name}</td>
                        <td className="text-right text-slate-600">{ph.runs}</td>
                        <td className="text-right text-emerald-600 font-medium">{ph.success}</td>
                        <td className="text-right text-red-600 font-medium">{ph.failures}</td>
                        <td className="text-right text-slate-600">{formatDuration(ph.avg_duration_seconds)}</td>
                        <td className="text-xs text-slate-500">{formatTimeAgo(ph.last_run)}</td>
                        <td>
                          {successRate >= 75 ? (
                            <TrendingUp size={14} className="text-emerald-500" />
                          ) : successRate >= 50 ? (
                            <TrendingDown size={14} className="text-amber-500" />
                          ) : (
                            <TrendingDown size={14} className="text-red-500" />
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

        {/* ENGINEERING ECONOMICS + SECURITY/QUALITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Economics Chart */}
          <div className="fi-card lg:col-span-2">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Coins size={14} className="text-forgeiq-600" /> Engineering Economics
              </h3>
              <button onClick={() => navigate('/engineering-economics')} className="text-xs text-forgeiq-600 hover:text-forgeiq-700 flex items-center gap-0.5">
                Details <ChevronRight size={12} />
              </button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-md overflow-hidden mb-3">
                <div className="bg-white px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">AI Spend</p>
                  <p className="text-base font-semibold text-slate-900">{formatCost(d.economics_breakdown.ai_spend_cents)}</p>
                </div>
                <div className="bg-white px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Tokens</p>
                  <p className="text-base font-semibold text-slate-900">{d.economics_breakdown.total_tokens.toLocaleString()}</p>
                </div>
                <div className="bg-white px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Exec Time</p>
                  <p className="text-base font-semibold text-slate-900">{formatDuration(d.economics_breakdown.execution_time_seconds)}</p>
                </div>
                <div className="bg-white px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Retry Cost</p>
                  <p className="text-base font-semibold text-slate-900">{formatCost(d.economics_breakdown.retry_cost_cents)}</p>
                </div>
              </div>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                  legend: { data: ['Cost by Agent', 'Cost by Application'], bottom: 0, textStyle: { fontSize: 11 } },
                  grid: { left: 50, right: 20, top: 10, bottom: 40 },
                  xAxis: {
                    type: 'category',
                    data: d.economics_breakdown.cost_by_agent.map((c) => c.name.slice(0, 15)),
                    axisLabel: { fontSize: 10, rotate: 30 },
                  },
                  yAxis: { type: 'value', name: 'Cents', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 } },
                  series: [
                    {
                      name: 'Cost by Agent',
                      type: 'bar',
                      data: d.economics_breakdown.cost_by_agent.map((c) => c.cost_cents),
                      itemStyle: { color: '#7c3aed' },
                    },
                    {
                      name: 'Cost by Application',
                      type: 'bar',
                      data: d.economics_breakdown.cost_by_application.map((c) => c.cost_cents),
                      itemStyle: { color: '#0ea5e9' },
                    },
                  ],
                }}
              />
            </div>
          </div>

          {/* Security / Quality */}
          <div className="fi-card">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Shield size={14} className="text-forgeiq-600" /> Security / Quality
              </h3>
              <button onClick={() => navigate('/security')} className="text-xs text-forgeiq-600 hover:text-forgeiq-700 flex items-center gap-0.5">
                Details <ChevronRight size={12} />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {[
                { label: 'Open Vulnerabilities', value: d.security_quality.open_vulnerabilities, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', to: '/security' },
                { label: 'Failed Tests', value: d.security_quality.failed_tests, icon: XCircle, color: 'text-amber-600', bg: 'bg-amber-50', to: '/quality' },
                { label: 'Build Failures', value: d.security_quality.build_failures, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', to: '/build-automation' },
                { label: 'High-Risk Changes', value: d.security_quality.high_risk_changes, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', to: '/applications' },
                { label: 'Pending Approvals', value: d.security_quality.pending_approvals, icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50', to: '/executions' },
                { label: 'Security Findings', value: d.security_quality.security_findings, icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50', to: '/security' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded ${item.bg} flex items-center justify-center`}>
                      <item.icon size={13} className={item.color} />
                    </div>
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT APPLICATIONS */}
        <div className="fi-card">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Boxes size={14} className="text-forgeiq-600" /> Recent Applications
            </h3>
            <button onClick={() => navigate('/applications')} className="text-xs text-forgeiq-600 hover:text-forgeiq-700 flex items-center gap-0.5">
              View All <ChevronRight size={12} />
            </button>
          </div>
          {d.recent_applications.length === 0 ? (
            <EmptyState message="No applications yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Type</th>
                    <th>Technology</th>
                    <th>Environment</th>
                    <th>Last Commit</th>
                    <th>Eng State</th>
                    <th>Last Execution</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent_applications.map((app) => (
                    <tr
                      key={app.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      <td className="font-medium text-slate-900">{app.name}</td>
                      <td>
                        <span className={`fi-badge ${app.type === 'greenfield' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {app.type}
                        </span>
                      </td>
                      <td className="text-slate-600">{app.technology}</td>
                      <td className="text-slate-600">{app.environment}</td>
                      <td className="font-mono text-xs text-slate-500">{app.last_commit}</td>
                      <td>
                        <span className="text-sm font-medium text-slate-700">{app.engineering_state}</span>
                      </td>
                      <td><StatusBadge status={app.last_execution} /></td>
                      <td><StatusBadge status={app.status} /></td>
                      <td><ChevronRight size={14} className="text-slate-300" /></td>
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
