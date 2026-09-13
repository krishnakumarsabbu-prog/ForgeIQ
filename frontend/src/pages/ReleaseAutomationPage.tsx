import { useDeployments } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

function truncateId(id: string, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—'
}

function formatTime(ts?: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function ReleaseAutomationPage() {
  const { data: deployments, isLoading } = useDeployments()

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Release Automation" description="Release deployments and verification status" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = (deployments ?? []).filter((d) => d.status === 'COMPLETED' || d.status === 'FAILED' || d.status === 'CANCELLED')

  return (
    <div className="fi-card">
      <PageHeader
        title="Release Automation"
        description="Release deployments and verification status"
        actions={<span className="text-xs text-slate-500">{items.length} releases</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No releases found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Version</th>
                <th>Status</th>
                <th>Strategy</th>
                <th>Verified</th>
                <th>Started At</th>
                <th>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="font-mono text-xs text-slate-600">{truncateId(d.application_id)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
