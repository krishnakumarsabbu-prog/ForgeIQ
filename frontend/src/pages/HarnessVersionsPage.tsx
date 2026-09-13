import { useHarnesses } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Layers, GitCommit } from 'lucide-react'

export default function HarnessVersionsPage() {
  const { data: harnesses, isLoading } = useHarnesses()

  if (isLoading) return (<><PageHeader title="Harness Versions" description="Published and draft harness versions across the platform" /><LoadingSpinner /></>)
  if (!harnesses || harnesses.length === 0) return (<><PageHeader title="Harness Versions" description="Published and draft harness versions across the platform" /><EmptyState message="No harness versions found" /></>)

  const allVersions = harnesses.flatMap(h =>
    (h.versions ?? []).map(v => ({ ...v, harnessName: h.display_name || h.name, harnessId: h.id }))
  ).sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <>
      <PageHeader title="Harness Versions" description="Published and draft harness versions across the platform" />
      <div className="p-6">
        <div className="fi-card">
          {allVersions.length === 0 ? (
            <EmptyState message="No versions published yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Harness</th>
                    <th>Version</th>
                    <th>Graph</th>
                    <th className="text-right">Loops</th>
                    <th className="text-right">Agents</th>
                    <th className="text-right">Skills</th>
                    <th className="text-right">Tools</th>
                    <th>Environment</th>
                    <th>Approval</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allVersions.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="font-medium text-slate-900 flex items-center gap-2">
                        <Layers size={14} className="text-forgeiq-600" />
                        {v.harnessName}
                      </td>
                      <td className="font-mono text-sm text-slate-700">v{v.version}</td>
                      <td className="font-mono text-xs text-slate-500">{v.graph_id?.slice(0, 8) || '—'}</td>
                      <td className="text-right text-slate-600">{v.loop_ids.length}</td>
                      <td className="text-right text-slate-600">{v.agent_ids.length}</td>
                      <td className="text-right text-slate-600">{v.skill_ids.length}</td>
                      <td className="text-right text-slate-600">{v.tool_ids.length}</td>
                      <td className="text-slate-600">{v.environment}</td>
                      <td>{v.approval_required ? <StatusBadge status="AWAITING_APPROVAL" showIcon={false} /> : <span className="text-slate-400 text-xs">Not required</span>}</td>
                      <td>
                        {v.is_default ? (
                          <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>
                        ) : v.published ? (
                          <StatusBadge status="published" />
                        ) : (
                          <StatusBadge status="draft" />
                        )}
                      </td>
                      <td className="text-xs text-slate-500">{new Date(v.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {allVersions.length > 0 && (
          <div className="mt-4 fi-card p-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <GitCommit size={14} className="text-forgeiq-600" /> Version Summary
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Versions</p>
                <p className="text-lg font-semibold text-slate-900">{allVersions.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Published</p>
                <p className="text-lg font-semibold text-emerald-600">{allVersions.filter(v => v.published).length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Drafts</p>
                <p className="text-lg font-semibold text-slate-600">{allVersions.filter(v => !v.published).length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Defaults</p>
                <p className="text-lg font-semibold text-forgeiq-600">{allVersions.filter(v => v.is_default).length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
