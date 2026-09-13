import { useRequirements } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Requirement } from '../types'
import { Plus, FileText } from 'lucide-react'

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border border-red-200',
  HIGH: 'bg-orange-50 text-orange-700 border border-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

export default function RequirementsPage() {
  const { data, isLoading } = useRequirements()

  return (
    <>
      <PageHeader
        title="Requirements"
        description="All requirements across the platform"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> New Requirement
          </button>
        }
      />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data || data.length === 0 ? (
            <EmptyState message="No requirements found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Complexity</th>
                    <th>Tags</th>
                    <th>Application</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((req: Requirement) => (
                    <tr key={req.id}>
                      <td className="font-medium text-slate-900 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-forgeiq-600" />
                        {req.title}
                      </td>
                      <td className="text-slate-500 max-w-xs truncate">{req.description}</td>
                      <td>
                        <span className={`fi-badge ${priorityColors[req.priority] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td><StatusBadge status={req.status} /></td>
                      <td className="text-slate-600">{req.estimated_complexity}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {req.tags.map((tag) => (
                            <span key={tag} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-slate-600 font-mono text-xs">{req.application_id.slice(0, 8)}</td>
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
