import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, X, Hash, Cpu, Code2, ShieldCheck, TestTube2, BookCheck, ArrowRightLeft } from 'lucide-react'
import { useEvidence } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Evidence } from '../types'

const typeColors: Record<string, string> = {
  code: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  test: 'bg-blue-50 text-blue-700 border border-blue-200',
  security: 'bg-red-50 text-red-700 border border-red-200',
  review: 'bg-amber-50 text-amber-700 border border-amber-200',
  build: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  decision: 'bg-slate-100 text-slate-700 border border-slate-300',
}

function truncateId(id: string, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—'
}

function formatTimestamp(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function JsonBlock({ label, icon: Icon, data }: { label: string; icon: typeof FileText; data: unknown }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto max-h-48 text-slate-700">
{JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default function EvidencePage() {
  const navigate = useNavigate()
  const { data: evidence, isLoading } = useEvidence()
  const [selected, setSelected] = useState<Evidence | null>(null)

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Evidence" description="Cryptographically signed execution evidence and audit trail" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = evidence ?? []

  return (
    <div className="fi-card">
      <PageHeader
        title="Evidence"
        description="Cryptographically signed execution evidence and audit trail"
        actions={
          <span className="text-xs text-slate-500">{items.length} records</span>
        }
      />
      {items.length === 0 ? (
        <EmptyState message="No evidence records found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Agent</th>
                <th>Model</th>
                <th>Execution ID</th>
                <th>Summary</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => (
                <tr
                  key={ev.id}
                  onClick={() => setSelected(ev)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="font-mono text-xs text-slate-600">{truncateId(ev.id)}</td>
                  <td>
                    <span className={`fi-badge ${typeColors[ev.evidence_type] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      {ev.evidence_type}
                    </span>
                  </td>
                  <td className="text-slate-700">{ev.agent_id ? truncateId(ev.agent_id) : '—'}</td>
                  <td className="text-slate-700">{ev.model_used || '—'}</td>
                  <td className="font-mono text-xs text-slate-600">{truncateId(ev.execution_id)}</td>
                  <td className="text-slate-700 max-w-md truncate">{ev.summary || '—'}</td>
                  <td className="text-slate-500 whitespace-nowrap">{formatTimestamp(ev.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-xl bg-white shadow-xl h-full overflow-y-auto border-l border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Evidence Detail</h2>
                <p className="font-mono text-xs text-slate-500">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Type</div>
                  <StatusBadge status={selected.evidence_type} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Timestamp</div>
                  <div className="text-slate-700">{formatTimestamp(selected.timestamp)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Agent</div>
                  <div className="font-mono text-xs text-slate-700">{selected.agent_id || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Model</div>
                  <div className="text-slate-700">{selected.model_used || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Execution ID</div>
                  <button
                    onClick={() => navigate(`/executions/${selected.execution_id}`)}
                    className="font-mono text-xs text-forgeiq-600 hover:underline flex items-center gap-1"
                  >
                    {truncateId(selected.execution_id)}
                    <ArrowRightLeft className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Harness</div>
                  <div className="font-mono text-xs text-slate-700">{selected.harness_id ? truncateId(selected.harness_id) : '—'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Summary</div>
                <p className="text-sm text-slate-700">{selected.summary || '—'}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Hash className="h-3.5 w-3.5" />
                  Hash
                </div>
                <code className="block text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 break-all text-slate-700">
                  {selected.hash}
                </code>
              </div>

              <JsonBlock label="Inputs" icon={ArrowRightLeft} data={selected.inputs} />
              <JsonBlock label="Outputs" icon={FileText} data={selected.outputs} />
              <JsonBlock label="Code Changes" icon={Code2} data={selected.code_changes} />
              <JsonBlock label="Test Results" icon={TestTube2} data={selected.test_results} />
              <JsonBlock label="Security Results" icon={ShieldCheck} data={selected.security_results} />

              <div>
                <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <BookCheck className="h-3.5 w-3.5" />
                  Policies Applied
                </div>
                {selected.policies_applied.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selected.policies_applied.map((p, i) => (
                      <span key={i} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">None</span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Cpu className="h-3.5 w-3.5" />
                  Versions
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  {selected.agent_version && <div>Agent version: <span className="font-mono">{selected.agent_version}</span></div>}
                  {selected.harness_version && <div>Harness version: <span className="font-mono">{selected.harness_version}</span></div>}
                  {selected.tool_id && <div>Tool: <span className="font-mono">{truncateId(selected.tool_id)}</span></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
