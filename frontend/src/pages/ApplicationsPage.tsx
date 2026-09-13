import { useNavigate } from 'react-router-dom'
import { useApplications, useEngineeringStates, useExecutions } from '../hooks/useQueries'
import { PageHeader, RiskBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Application, EngineeringState, Execution } from '../types'
import { Boxes, Rocket, GitBranch, Shield, Activity, CheckCircle2 } from 'lucide-react'

export default function ApplicationsPage() {
  const { data, isLoading } = useApplications()
  const { data: engStates } = useEngineeringStates()
  const { data: executions } = useExecutions()
  const navigate = useNavigate()

  const engStateMap = new Map<string, EngineeringState>()
  engStates?.forEach((es) => engStateMap.set(es.application_id, es))

  const lastExecMap = new Map<string, Execution>()
  executions?.forEach((e) => {
    if (e.application_id) {
      const existing = lastExecMap.get(e.application_id)
      if (!existing || (e.created_at > existing.created_at)) {
        lastExecMap.set(e.application_id, e)
      }
    }
  })

  return (
    <>
      <PageHeader
        title="Applications"
        description="Manage all applications in the ForgeIQ registry"
        actions={
          <button
            onClick={() => navigate('/start-engineering')}
            className="fi-button-primary"
          >
            <Rocket className="h-4 w-4" /> Start Engineering
          </button>
        }
      />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data || data.length === 0 ? (
            <EmptyState message="No applications found" icon={<Boxes className="h-12 w-12" />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Type</th>
                    <th>Technology</th>
                    <th>Repository</th>
                    <th>Branch</th>
                    <th>Environment</th>
                    <th>Eng. State</th>
                    <th>Last Execution</th>
                    <th>Security</th>
                    <th>Quality</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((app: Application) => {
                    const es = engStateMap.get(app.id)
                    const lastExec = lastExecMap.get(app.id)
                    const env = es?.deployment ? (es.deployment as Record<string, unknown>).environment as string : 'N/A'
                    const repo = app.repository?.url?.replace('git@github.com:forgeiq/', '').replace('.git', '') || 'N/A'
                    const branch = app.repository?.branch || 'main'
                    const healthScore = es?.health_score ?? 0
                    const coverage = es?.coverage_pct ?? 0
                    const secFindings = es?.security_findings ?? 0
                    const healthLabel = healthScore >= 0.9 ? 'Healthy' : healthScore >= 0.7 ? 'Fair' : 'At Risk'
                    const healthColor = healthScore >= 0.9 ? 'text-emerald-600' : healthScore >= 0.7 ? 'text-amber-600' : 'text-red-600'

                    return (
                      <tr
                        key={app.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate(`/applications/${app.id}`)}
                      >
                        <td className="font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Boxes className="h-4 w-4 text-forgeiq-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate">{app.display_name || app.name}</div>
                              <div className="text-xs text-slate-400">{app.team}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`fi-badge ${app.type === 'greenfield' ? 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                            {app.type}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {app.technologies.slice(0, 3).map((tech) => (
                              <span key={tech} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{tech}</span>
                            ))}
                            {app.technologies.length > 3 && (
                              <span className="fi-badge bg-slate-50 text-slate-400 border border-slate-200 text-xs">+{app.technologies.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="text-slate-600 text-xs font-mono">{repo}</td>
                        <td className="text-slate-600 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-slate-400" />
                            {branch}
                          </span>
                        </td>
                        <td className="text-slate-600 text-xs">{env}</td>
                        <td>
                          <span className={`text-xs font-medium ${healthColor}`}>
                            {healthLabel} ({(healthScore * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td>
                          {lastExec ? (
                            <span className={`fi-badge text-xs ${lastExec.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : lastExec.status === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-200' : lastExec.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                              {lastExec.status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1">
                            <Shield className="h-3 w-3 text-slate-400" />
                            <span className={`text-xs font-medium ${secFindings === 0 ? 'text-emerald-600' : secFindings <= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                              {secFindings} findings
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1">
                            <Activity className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-600">{coverage.toFixed(0)}%</span>
                          </span>
                        </td>
                        <td>
                          <span className={`fi-badge ${app.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                            <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
