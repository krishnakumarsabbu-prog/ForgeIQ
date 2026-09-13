import { useNavigate } from 'react-router-dom'
import { useApplications } from '../hooks/useQueries'
import { PageHeader, RiskBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Application } from '../types'
import { Plus, Boxes } from 'lucide-react'

export default function ApplicationsPage() {
  const { data, isLoading } = useApplications()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Applications"
        description="Manage all applications in the ForgeIQ registry"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> New Application
          </button>
        }
      />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data || data.length === 0 ? (
            <EmptyState message="No applications found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Risk Level</th>
                    <th>Version</th>
                    <th>Technologies</th>
                    <th>Team</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((app: Application) => (
                    <tr
                      key={app.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      <td className="font-medium text-slate-900 flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-forgeiq-600" />
                        {app.display_name || app.name}
                      </td>
                      <td className="text-slate-600">{app.type}</td>
                      <td><RiskBadge level={app.risk_level} /></td>
                      <td className="text-slate-600">{app.current_version}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {app.technologies.map((tech) => (
                            <span key={tech} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{tech}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-slate-600">{app.team}</td>
                      <td>
                        <span className={`fi-badge ${app.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {app.status}
                        </span>
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
