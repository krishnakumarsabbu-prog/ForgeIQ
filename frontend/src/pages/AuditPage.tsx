import { useNavigate } from 'react-router-dom'
import { useAuditLogs } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { ScrollText, Search, Filter, X, User, Clock, Shield, Activity } from 'lucide-react'
import { useState, useMemo } from 'react'

function formatTime(ts?: string): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AuditPage() {
  const { data: logs, isLoading } = useAuditLogs()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!logs) return []
    if (!search) return logs
    const q = search.toLowerCase()
    return logs.filter((l: any) =>
      l.action?.toLowerCase().includes(q) ||
      l.actor?.toLowerCase().includes(q) ||
      l.resource_type?.toLowerCase().includes(q)
    )
  }, [logs, search])

  return (
    <>
      <PageHeader
        title="Audit Trail"
        description="Immutable audit log of all platform actions, governance decisions, and access events."
        icon={<ScrollText size={18} />}
        badge="Compliance"
        badgeVariant="violet"
      />

      <div className="p-6 space-y-4 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Events"   value={logs?.length ?? 0}  sub="All time"     icon={ScrollText} gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Today"          value={logs?.filter((l:any) => new Date(l.created_at).toDateString() === new Date().toDateString()).length ?? 0} sub="Events today" icon={Clock} gradient={['#00adef','#0a68f4']} />
          <StatCard label="Actors"         value={new Set(logs?.map((l:any) => l.actor).filter(Boolean)).size} sub="Unique users" icon={User} gradient={['#10b981','#0891b2']} />
          <StatCard label="Resources"      value={new Set(logs?.map((l:any) => l.resource_type).filter(Boolean)).size} sub="Types" icon={Shield} gradient={['#f59e0b','#f97316']} />
        </div>

        <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)' }}>
          <Filter size={14} className="text-slate-400" />
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by action, actor, or resource..." className="fi-input pl-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
          </div>
        </div>

        <EnterpriseCard>
          <SectionHeader icon={ScrollText} title="Audit Event Log" subtitle={`${filtered.length} events recorded`} iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner message="Loading audit trail..." />
          ) : !filtered.length ? (
            <EmptyState message="No audit events found" description="Platform actions will appear here for compliance review." />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Timestamp</th><th>Actor</th><th>Action</th>
                    <th>Resource Type</th><th>Resource ID</th><th>Result</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((log: any) => (
                    <tr key={log.id} className="group">
                      <td className="text-[11px] font-mono text-slate-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                            style={{ background: 'linear-gradient(135deg,#00adef,#7c3aed)' }}>
                            {(log.actor || 'S').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-slate-700">{log.actor || 'System'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: 'rgba(100,116,139,0.1)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }}>
                          {log.resource_type}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-slate-400">{(log.resource_id || '').slice(0, 12)}…</td>
                      <td>
                        <StatusBadge status={log.result === 'success' ? 'SUCCESS' : log.result === 'failure' ? 'FAILED' : 'NEUTRAL'} />
                      </td>
                      <td className="font-mono text-[11px] text-slate-400">{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>
    </>
  )
}
