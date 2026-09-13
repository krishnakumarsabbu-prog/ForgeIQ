import { useState } from 'react'
import { ChevronRight, Activity, Heart } from 'lucide-react'
import { useDeployments } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Deployment } from '../types'

function truncateId(id: string, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—'
}

function formatTime(ts?: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function DeploymentsPage() {
  const { data: deployments, isLoading } = useDeployments()
  const [expanded, setExpanded] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Deployments" description="Active and historical deployment records" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = deployments ?? []

  return (
    <div className="fi-card">
      <PageHeader
        title="Deployments"
        description="Active and historical deployment records"
        actions={<span className="text-xs text-slate-500">{items.length} deployments</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No deployments found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th className="w-6" />
                <th>Application ID</th>
                <th>Environment ID</th>
                <th>Version</th>
                <th>Status</th>
                <th>Strategy</th>
                <th>Verified</th>
                <th>Started At</th>
                <th>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d: Deployment) => (
                <>
                  <tr
                    key={d.id}
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="text-slate-400">
                      <ChevronRight className={`h-4 w-4 transition-transform ${expanded === d.id ? 'rotate-90' : ''}`} />
                    </td>
                    <td className="font-mono text-xs text-slate-600">{truncateId(d.application_id)}</td>
                    <td className="font-mono text-xs text-slate-600">{truncateId(d.environment_id)}</td>
                    <td className="font-mono text-slate-700">{d.version}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-slate-600">{d.strategy}</td>
                    <td>
                      {d.verified ? (
                        <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">verified</span>
                      ) : (
                        <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">unverified</span>
                      )}
                    </td>
                    <td className="text-slate-500 whitespace-nowrap">{formatTime(d.started_at)}</td>
                    <td className="text-slate-500 whitespace-nowrap">{formatTime(d.completed_at)}</td>
                  </tr>
                  {expanded === d.id && (
                    <tr className="bg-slate-50">
                      <td />
                      <td colSpan={8} className="px-6 py-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          <Heart className="h-3.5 w-3.5" />
                          Health Checks
                        </div>
                        {d.health_checks.length > 0 ? (
                          <div className="space-y-2">
                            {d.health_checks.map((hc, i) => (
                              <div key={i} className="fi-card p-2 flex items-start gap-2">
                                <Activity className="h-4 w-4 text-slate-400 mt-0.5" />
                                <pre className="text-xs font-mono text-slate-700 overflow-x-auto flex-1">
{JSON.stringify(hc, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">No health checks recorded</span>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                          <span>Rollback supported: <strong className="text-slate-700">{d.rollback_supported ? 'Yes' : 'No'}</strong></span>
                          {d.artifact_id && <span>Artifact: <code className="font-mono">{truncateId(d.artifact_id)}</code></span>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
