import { useNavigate } from 'react-router-dom'
import { useAgents } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Agent } from '../types'
import { Plus, Bot } from 'lucide-react'

const categoryColors: Record<string, string> = {
  engineering: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  analysis: 'bg-blue-50 text-blue-700 border border-blue-200',
  testing: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  security: 'bg-red-50 text-red-700 border border-red-200',
  deployment: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function AgentsPage() {
  const { data, isLoading } = useAgents()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Agents"
        description="Autonomous agents with contracts, skills, and tools"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> Create Agent
          </button>
        }
      />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data || data.length === 0 ? (
            <EmptyState message="No agents found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Purpose</th>
                    <th>Model</th>
                    <th className="text-right">Skills</th>
                    <th className="text-right">Tools</th>
                    <th>Version</th>
                    <th>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((agent: Agent) => (
                    <tr
                      key={agent.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/agents/${agent.id}`)}
                    >
                      <td className="font-medium text-slate-900 flex items-center gap-2">
                        <Bot className="h-4 w-4 text-forgeiq-600" />
                        {agent.display_name || agent.name}
                      </td>
                      <td>
                        <span className={`fi-badge ${categoryColors[agent.category] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {agent.category}
                        </span>
                      </td>
                      <td className="text-slate-500 max-w-xs truncate">{agent.purpose}</td>
                      <td className="text-slate-600 font-mono text-xs">{agent.model_config_id?.slice(0, 8) || '—'}</td>
                      <td className="text-right text-slate-600">{agent.skill_ids.length}</td>
                      <td className="text-right text-slate-600">{agent.tool_ids.length}</td>
                      <td className="text-slate-600">{agent.current_version}</td>
                      <td>
                        <StatusBadge status={agent.published ? 'published' : 'draft'} />
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
