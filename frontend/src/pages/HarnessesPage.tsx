import { useNavigate } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import { useHarnesses } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Harness } from '../types'

export default function HarnessesPage() {
  const navigate = useNavigate()
  const { data: harnesses, isLoading } = useHarnesses()

  return (
    <div>
      <PageHeader
        title="Harnesses"
        description="Agent execution harnesses with graphs, loops, agents, skills, and tools"
        actions={
          <button
            onClick={() => navigate('/harnesses/builder')}
            className="inline-flex items-center gap-1.5 rounded-md bg-forgeiq-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forgeiq-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Harness
          </button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : !harnesses?.length ? (
          <div className="fi-card">
            <EmptyState message="No harnesses configured yet" />
          </div>
        ) : (
          <div className="fi-card">
            <table className="fi-table">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Environment</th>
                  <th className="text-left">Graph</th>
                  <th className="text-right">Agents</th>
                  <th className="text-right">Loops</th>
                  <th className="text-right">Skills</th>
                  <th className="text-right">Tools</th>
                  <th className="text-center">Approval</th>
                  <th className="text-center">Published</th>
                </tr>
              </thead>
              <tbody>
                {harnesses.map((h: Harness) => (
                  <tr
                    key={h.id}
                    onClick={() => navigate(`/harnesses/${h.id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-slate-400" />
                        {h.display_name || h.name}
                      </div>
                    </td>
                    <td>
                      <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                        {h.harness_type}
                      </span>
                    </td>
                    <td className="text-slate-600">{h.environment}</td>
                    <td className="text-slate-600">{h.graph_id ? 'Linked' : '—'}</td>
                    <td className="text-right text-slate-600">{h.agent_ids.length}</td>
                    <td className="text-right text-slate-600">{h.loop_ids.length}</td>
                    <td className="text-right text-slate-600">{h.skill_ids.length}</td>
                    <td className="text-right text-slate-600">{h.tool_ids.length}</td>
                    <td className="text-center">
                      {h.approval_required ? (
                        <span className="text-amber-600 font-medium text-xs">Required</span>
                      ) : (
                        <span className="text-slate-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="text-center">
                      <StatusBadge status={h.published ? 'published' : 'draft'} />
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
