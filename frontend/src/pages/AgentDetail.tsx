import { useParams, useNavigate } from 'react-router-dom'
import { useAgent, usePublishAgent } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { ArrowLeft, Bot, Settings, GitBranch, Sparkles, Wrench, Shield, Clock, Coins, Hash } from 'lucide-react'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agent, isLoading } = useAgent(id!)
  const publishAgent = usePublishAgent()

  if (isLoading) return (
    <>
      <PageHeader title="Agent Detail" />
      <LoadingSpinner />
    </>
  )
  if (!agent) return (
    <>
      <PageHeader title="Agent Detail" />
      <EmptyState message="Agent not found" />
    </>
  )

  return (
    <>
      <PageHeader
        title={agent.display_name || agent.name}
        description={agent.purpose}
        actions={
          <button onClick={() => navigate('/agents')} className="fi-button-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Agent Info */}
        <div className="fi-card p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-forgeiq-50 rounded-lg">
              <Bot className="h-6 w-6 text-forgeiq-600" />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Category</p>
                <p className="text-sm font-medium text-slate-900">{agent.category}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Role</p>
                <p className="text-sm font-medium text-slate-900">{agent.role}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Model Config</p>
                <p className="text-sm font-mono text-slate-900">{agent.model_config_id?.slice(0, 8) || '—'}</p>
              </div>
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">System Instructions</p>
                <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-md p-3 max-h-32 overflow-y-auto">{agent.system_instructions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Details */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="h-4 w-4 text-forgeiq-600" /> Contract
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Max Turns</p>
                <p className="text-sm font-medium text-slate-900">{agent.max_turns}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Timeout</p>
                <p className="text-sm font-medium text-slate-900">{agent.timeout_seconds}s</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Token Budget</p>
                <p className="text-sm font-medium text-slate-900">{agent.token_budget.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Cost Budget</p>
                <p className="text-sm font-medium text-slate-900">${(agent.cost_budget_cents / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Skills ({agent.skill_ids.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {agent.skill_ids.map((s) => (
                  <span key={s} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 font-mono text-xs">{s.slice(0, 8)}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Tools ({agent.tool_ids.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {agent.tool_ids.map((t) => (
                  <span key={t} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 font-mono text-xs">{t.slice(0, 8)}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Permissions ({agent.permissions.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {agent.permissions.map((p) => (
                  <span key={p} className="fi-badge bg-red-50 text-red-700 border border-red-200 text-xs">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Versions */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-forgeiq-600" /> Versions
            </h3>
          </div>
          {agent.versions.length === 0 ? (
            <EmptyState message="No versions published" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Published</th>
                    <th>Default</th>
                    <th>Changelog</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {agent.versions.map((version) => (
                    <tr key={version.id}>
                      <td className="font-medium text-slate-900">{version.version}</td>
                      <td><StatusBadge status={version.published ? 'published' : 'draft'} /></td>
                      <td>
                        {version.is_default ? (
                          <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-slate-500 max-w-xs truncate">{version.changelog}</td>
                      <td className="text-slate-600">{new Date(version.created_at).toLocaleDateString()}</td>
                      <td>
                        {!version.published && (
                          <button
                            onClick={() => publishAgent.mutate({ id: agent.id, version: version.version })}
                            disabled={publishAgent.isPending}
                            className="fi-button-primary text-xs"
                          >
                            Publish
                          </button>
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
    </>
  )
}
