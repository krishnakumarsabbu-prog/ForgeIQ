import { Link } from 'react-router-dom'
import { Clock, Cpu, Hash, FileText, ChevronRight } from 'lucide-react'
import { useEvidence } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

const typeColors: Record<string, string> = {
  code: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  test: 'bg-blue-50 text-blue-700 border border-blue-200',
  security: 'bg-red-50 text-red-700 border border-red-200',
  review: 'bg-amber-50 text-amber-700 border border-amber-200',
  build: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  decision: 'bg-slate-100 text-slate-700 border border-slate-300',
}

function formatTimestamp(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AuditPage() {
  const { data: evidence, isLoading } = useEvidence()

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Audit Trail" description="Chronological evidence log for compliance and traceability" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = [...(evidence ?? [])].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="fi-card">
      <PageHeader
        title="Audit Trail"
        description="Chronological evidence log for compliance and traceability"
        actions={<span className="text-xs text-slate-500">{items.length} entries</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No audit entries available" />
      ) : (
        <div className="px-6 py-4">
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-3">
              {items.map((ev) => (
                <div key={ev.id} className="relative pl-8">
                  <div className="absolute left-1.5 top-3 h-3 w-3 rounded-full bg-forgeiq-600 border-2 border-white" />
                  <div className="fi-card p-3 hover:border-forgeiq-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`fi-badge ${typeColors[ev.evidence_type] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                            {ev.evidence_type}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(ev.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1.5">{ev.summary || '—'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          {ev.agent_id && (
                            <span className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" />
                              <Link to={`/agents/${ev.agent_id}`} className="font-mono text-forgeiq-600 hover:underline">
                                {ev.agent_id.slice(0, 8)}…
                              </Link>
                            </span>
                          )}
                          {ev.model_used && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {ev.model_used}
                            </span>
                          )}
                          <Link to={`/executions/${ev.execution_id}`} className="flex items-center gap-1 font-mono text-forgeiq-600 hover:underline">
                            exec {ev.execution_id.slice(0, 8)}…
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Hash className="h-3 w-3" />
                          <code className="font-mono">{ev.hash.slice(0, 16)}…</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
