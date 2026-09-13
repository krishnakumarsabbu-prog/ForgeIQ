import { useDashboard } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { Boxes, Bot, Workflow, GitBranch, Activity, FileCheck, Shield, Sparkles, Wrench, Cpu, Coins, Gauge } from 'lucide-react'

const metricCards = [
  { key: 'applications', label: 'Applications', icon: Boxes },
  { key: 'agents', label: 'Agents', icon: Bot },
  { key: 'harnesses', label: 'Harnesses', icon: Workflow },
  { key: 'pipelines', label: 'Pipelines', icon: GitBranch },
  { key: 'executions', label: 'Executions', icon: Activity },
  { key: 'evidence', label: 'Evidence', icon: FileCheck },
  { key: 'policies', label: 'Policies', icon: Shield },
  { key: 'skills', label: 'Skills', icon: Sparkles },
  { key: 'tools', label: 'Tools', icon: Wrench },
  { key: 'models', label: 'Models', icon: Cpu },
]

const executionStatuses = ['COMPLETED', 'RUNNING', 'FAILED', 'AWAITING_APPROVAL']

export default function CommandCenter() {
  const { data, isLoading } = useDashboard()

  if (isLoading) return (
    <>
      <PageHeader title="Command Center" description="Real-time overview of the ForgeIQ platform" />
      <LoadingSpinner />
    </>
  )
  if (!data) return (
    <>
      <PageHeader title="Command Center" description="Real-time overview of the ForgeIQ platform" />
      <EmptyState message="No dashboard data available" />
    </>
  )

  return (
    <>
      <PageHeader title="Command Center" description="Real-time overview of the ForgeIQ platform" />

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {metricCards.map(({ key, label, icon: Icon }) => (
            <div key={key} className="fi-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                <Icon className="h-4 w-4 text-forgeiq-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data.counts[key] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Execution Status + Economics + Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Execution Status */}
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-forgeiq-600" /> Execution Status
              </h3>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {executionStatuses.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="text-sm font-semibold text-slate-700">{data.execution_status[status] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Economics */}
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Coins className="h-4 w-4 text-forgeiq-600" /> Economics
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Tokens</p>
                <p className="text-lg font-semibold text-slate-900">{data.economics.total_tokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Cost</p>
                <p className="text-lg font-semibold text-slate-900">${data.economics.total_cost_dollars.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Quality */}
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-forgeiq-600" /> Quality
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Health</p>
                <p className="text-lg font-semibold text-slate-900">{data.quality.avg_health_score.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Coverage</p>
                <p className="text-lg font-semibold text-slate-900">{data.quality.avg_coverage_pct.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Security Findings</p>
                <p className="text-lg font-semibold text-slate-900">{data.quality.total_security_findings}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Open Vulnerabilities</p>
                <p className="text-lg font-semibold text-slate-900">{data.quality.total_open_vulnerabilities}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Executions */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Recent Executions</h3>
          </div>
          {data.recent_executions.length === 0 ? (
            <EmptyState message="No recent executions" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Pipeline</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th className="text-right">Tokens</th>
                    <th className="text-right">Cost</th>
                    <th className="text-right">Retries</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_executions.map((exec) => (
                    <tr key={exec.id}>
                      <td className="font-medium text-slate-900">{exec.application}</td>
                      <td className="text-slate-600">{exec.pipeline}</td>
                      <td><StatusBadge status={exec.status} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-forgeiq-600 rounded-full" style={{ width: `${exec.progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{exec.progress}%</span>
                        </div>
                      </td>
                      <td className="text-right text-slate-600">{exec.tokens_used.toLocaleString()}</td>
                      <td className="text-right text-slate-600">${(exec.cost_cents / 100).toFixed(2)}</td>
                      <td className="text-right text-slate-600">{exec.retry_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Applications Overview */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Applications Overview</h3>
          </div>
          {data.applications_overview.length === 0 ? (
            <EmptyState message="No applications yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Risk</th>
                    <th>Version</th>
                    <th>Technologies</th>
                    <th>Team</th>
                    <th className="text-right">Pipelines</th>
                    <th className="text-right">Requirements</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications_overview.map((app) => (
                    <tr key={app.id}>
                      <td className="font-medium text-slate-900">{app.name}</td>
                      <td className="text-slate-600">{app.type}</td>
                      <td><StatusBadge status={app.risk_level} /></td>
                      <td className="text-slate-600">{app.version}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {app.technologies.map((tech) => (
                            <span key={tech} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{tech}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-slate-600">{app.team}</td>
                      <td className="text-right text-slate-600">{app.pipelines}</td>
                      <td className="text-right text-slate-600">{app.requirements}</td>
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
