import { useNavigate } from 'react-router-dom'
import { GitBranch, Plus, LayoutTemplate } from 'lucide-react'
import { usePipelines } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Pipeline } from '../types'

export default function PipelinesPage() {
  const navigate = useNavigate()
  const { data: pipelines, isLoading } = usePipelines()

  return (
    <div>
      <PageHeader
        title="Pipelines"
        description="Ordered execution stages composed of harnesses"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/pipeline-templates')}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </button>
            <button
              onClick={() => navigate('/pipeline-builder')}
              className="inline-flex items-center gap-1.5 rounded-md bg-forgeiq-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forgeiq-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Pipeline
            </button>
          </div>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : !pipelines?.length ? (
          <div className="fi-card">
            <EmptyState message="No pipelines configured" />
          </div>
        ) : (
          <div className="fi-card">
            <table className="fi-table">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Description</th>
                  <th className="text-left">Application</th>
                  <th className="text-right">Stages</th>
                  <th className="text-center">Published</th>
                  <th className="text-center">Active</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map((p: Pipeline) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/pipelines/${p.id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-slate-400" />
                        {p.display_name || p.name}
                      </div>
                    </td>
                    <td className="text-slate-600 max-w-xs truncate">{p.description || '—'}</td>
                    <td className="text-slate-600 font-mono text-xs">
                      {p.application_id || '—'}
                    </td>
                    <td className="text-right text-slate-600">{p.stages.length}</td>
                    <td className="text-center">
                      <StatusBadge status={p.published ? 'published' : 'draft'} />
                    </td>
                    <td className="text-center">
                      {p.active ? (
                        <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
