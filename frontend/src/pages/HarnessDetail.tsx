import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Layers,
  Users,
  Wrench,
  Repeat,
  Network,
  DollarSign,
  Clock,
  ShieldCheck,
  GitBranch,
} from 'lucide-react'
import { useHarness, useAgents, useSkills, useTools, useGraphs, useLoops } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

export default function HarnessDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: harness, isLoading } = useHarness(id || '')

  // Fetch related entities to resolve IDs to names
  const { data: agents } = useAgents()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: graphs } = useGraphs()
  const { data: loops } = useLoops()

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Harness Detail" />
        <LoadingSpinner />
      </div>
    )
  }

  if (!harness) {
    return (
      <div>
        <PageHeader title="Harness Detail" />
        <div className="fi-card">
          <EmptyState message="Harness not found" />
        </div>
      </div>
    )
  }

  const agentNames = (agents || []).filter((a) => harness.agent_ids.includes(a.id))
  const skillNames = (skills || []).filter((s) => harness.skill_ids.includes(s.id))
  const toolNames = (tools || []).filter((t) => harness.tool_ids.includes(t.id))
  const graph = (graphs || []).find((g) => g.id === harness.graph_id)
  const linkedLoops = (loops || []).filter((l) => harness.loop_ids.includes(l.id))

  return (
    <div>
      <PageHeader
        title={harness.display_name || harness.name}
        description={harness.purpose}
        actions={
          <Link
            to="/harnesses"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Harness Info */}
        <div className="fi-card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-forgeiq-600" />
            Configuration
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <InfoField label="Name" value={harness.name} />
            <InfoField label="Type" value={harness.harness_type} />
            <InfoField label="Environment" value={harness.environment} />
            <InfoField
              label="Cost Limit"
              value={`$${(harness.cost_limit_cents / 100).toFixed(2)}`}
              icon={<DollarSign className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Time Limit"
              value={`${harness.time_limit_seconds}s`}
              icon={<Clock className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Approval Required"
              value={harness.approval_required ? 'Yes' : 'No'}
              icon={<ShieldCheck className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField label="Current Version" value={harness.current_version} />
            <InfoField label="Published" value={harness.published ? 'Yes' : 'No'} />
          </div>
        </div>

        {/* Associated Entities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agents */}
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-forgeiq-600" />
              Agents ({agentNames.length})
            </h3>
            {agentNames.length === 0 ? (
              <p className="text-sm text-slate-400">No agents assigned</p>
            ) : (
              <ul className="space-y-1.5">
                {agentNames.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-forgeiq-500" />
                    {a.display_name || a.name}
                    <span className="text-slate-400 text-xs">· {a.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Skills */}
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-forgeiq-600" />
              Skills ({skillNames.length})
            </h3>
            {skillNames.length === 0 ? (
              <p className="text-sm text-slate-400">No skills assigned</p>
            ) : (
              <ul className="space-y-1.5">
                {skillNames.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-forgeiq-500" />
                    {s.display_name || s.name}
                    <span className="text-slate-400 text-xs">· {s.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tools */}
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-forgeiq-600" />
              Tools ({toolNames.length})
            </h3>
            {toolNames.length === 0 ? (
              <p className="text-sm text-slate-400">No tools assigned</p>
            ) : (
              <ul className="space-y-1.5">
                {toolNames.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-forgeiq-500" />
                    {t.display_name || t.name}
                    <span className="text-slate-400 text-xs">· {t.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Loops */}
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Repeat className="h-4 w-4 text-forgeiq-600" />
              Loops ({linkedLoops.length})
            </h3>
            {linkedLoops.length === 0 ? (
              <p className="text-sm text-slate-400">No loops assigned</p>
            ) : (
              <ul className="space-y-1.5">
                {linkedLoops.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-forgeiq-500" />
                    {l.display_name || l.name}
                    <span className="text-slate-400 text-xs">· {l.loop_type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Graph */}
        <div className="fi-card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Network className="h-4 w-4 text-forgeiq-600" />
            Graph
          </h3>
          {graph ? (
            <div className="text-sm text-slate-700">
              <span className="font-medium">{graph.display_name || graph.name}</span>
              <span className="text-slate-400 ml-2">v{graph.version}</span>
              <span className="ml-3">
                <StatusBadge status={graph.published ? 'published' : 'draft'} />
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No graph linked</p>
          )}
        </div>

        {/* Versions Table */}
        <div className="fi-card">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Versions</h3>
          </div>
          {harness.versions.length === 0 ? (
            <EmptyState message="No versions published" />
          ) : (
            <table className="fi-table">
              <thead>
                <tr>
                  <th className="text-left">Version</th>
                  <th className="text-center">Published</th>
                  <th className="text-center">Default</th>
                  <th className="text-left">Changelog</th>
                  <th className="text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {harness.versions.map((v) => (
                  <tr key={v.id}>
                    <td className="font-medium text-slate-900">{v.version}</td>
                    <td className="text-center">
                      <StatusBadge status={v.published ? 'published' : 'draft'} />
                    </td>
                    <td className="text-center">
                      {v.is_default ? (
                        <span className="text-forgeiq-600 font-medium text-xs">Default</span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-slate-600 max-w-xs truncate">{v.changelog || '—'}</td>
                    <td className="text-slate-500 text-sm">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-slate-900 flex items-center gap-1.5">
        {icon}
        {value}
      </div>
    </div>
  )
}
