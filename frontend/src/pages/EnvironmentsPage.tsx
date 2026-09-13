import { useEnvironments } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

const typeColors: Record<string, string> = {
  development: 'bg-slate-100 text-slate-700 border border-slate-300',
  staging: 'bg-amber-50 text-amber-700 border border-amber-200',
  production: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  preview: 'bg-blue-50 text-blue-700 border border-blue-200',
  test: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
}

export default function EnvironmentsPage() {
  const { data: environments, isLoading } = useEnvironments()

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Environments" description="Deployment environments and their protection rules" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = environments ?? []

  return (
    <div className="fi-card">
      <PageHeader
        title="Environments"
        description="Deployment environments and their protection rules"
        actions={<span className="text-xs text-slate-500">{items.length} environments</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No environments configured" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Cluster</th>
                <th>Region</th>
                <th>Protected</th>
                <th>Requires Approval</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td>
                    <span className="font-medium text-slate-800">{e.display_name || e.name}</span>
                  </td>
                  <td>
                    <span className={`fi-badge ${typeColors[e.env_type] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      {e.env_type}
                    </span>
                  </td>
                  <td className="text-slate-600 font-mono text-xs">{e.cluster}</td>
                  <td className="text-slate-600">{e.region}</td>
                  <td>
                    {e.protected ? (
                      <span className="fi-badge bg-red-50 text-red-700 border border-red-200">protected</span>
                    ) : (
                      <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">no</span>
                    )}
                  </td>
                  <td>
                    {e.requires_approval ? (
                      <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">approval required</span>
                    ) : (
                      <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">auto</span>
                    )}
                  </td>
                  <td>
                    {e.active ? (
                      <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">active</span>
                    ) : (
                      <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
