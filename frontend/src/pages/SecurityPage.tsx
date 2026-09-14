import { useNavigate } from 'react-router-dom'
import { useSecurityFindings } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { Shield, AlertTriangle, XCircle, CheckCircle2, Search, Filter, X, Bug, Lock } from 'lucide-react'
import { useState, useMemo } from 'react'

function formatTime(ts?: string): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const severityStyle: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: 'rgba(127,29,29,0.12)',  color: '#991b1b', border: 'rgba(127,29,29,0.3)' },
  HIGH:     { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  MEDIUM:   { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  LOW:      { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  INFO:     { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
}

export default function SecurityPage() {
  const { data: findings, isLoading } = useSecurityFindings()
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')

  const filtered = useMemo(() => {
    if (!findings) return []
    return findings.filter((f: any) => {
      const matchSearch = !search ||
        f.title?.toLowerCase().includes(search.toLowerCase()) ||
        f.application?.toLowerCase().includes(search.toLowerCase()) ||
        f.cve_id?.toLowerCase().includes(search.toLowerCase())
      const matchSev = !severityFilter || f.severity === severityFilter
      return matchSearch && matchSev
    })
  }, [findings, search, severityFilter])

  const critical = findings?.filter((f: any) => f.severity === 'CRITICAL').length ?? 0
  const high = findings?.filter((f: any) => f.severity === 'HIGH').length ?? 0
  const open = findings?.filter((f: any) => f.status === 'open' || f.status === 'OPEN').length ?? 0
  const resolved = findings?.filter((f: any) => f.status === 'resolved' || f.status === 'RESOLVED').length ?? 0

  return (
    <>
      <PageHeader
        title="Security Intelligence"
        description="Autonomous SAST, dependency scanning, vulnerability detection, and remediation tracking."
        icon={<Shield size={18} />}
        badge="Security"
        badgeVariant="red"
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Critical"       value={critical}   sub="Immediate action"   icon={XCircle}      gradient={['#991b1b','#e11d48']} />
          <StatCard label="High"           value={high}       sub="High priority"      icon={AlertTriangle} gradient={['#f43f5e','#f97316']} />
          <StatCard label="Open Findings"  value={open}       sub="Need remediation"   icon={Bug}          gradient={['#f59e0b','#b45309']} />
          <StatCard label="Resolved"       value={resolved}   sub="Remediated"         icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
        </div>

        {critical > 0 && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}>
            <XCircle size={16} style={{ color: '#e11d48' }} className="shrink-0" />
            <span className="text-sm font-semibold" style={{ color: '#9f1239' }}>
              {critical} critical vulnerabilit{critical > 1 ? 'ies' : 'y'} require immediate attention
            </span>
          </div>
        )}

        <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)' }}>
          <Filter size={14} className="text-slate-400" />
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by CVE ID, title, application..." className="fi-input pl-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
          </div>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="fi-input w-auto">
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Shield} title="Security Findings" subtitle={`${filtered.length} findings`} iconColor="#e11d48" />
          {isLoading ? (
            <LoadingSpinner message="Running security analysis..." />
          ) : !filtered.length ? (
            <EmptyState
              message="No security findings"
              description="All scans are clean. Security telemetry will appear here when vulnerabilities are detected."
              icon={<CheckCircle2 size={24} className="text-emerald-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Finding</th><th>Severity</th><th>CVE ID</th><th>Application</th>
                    <th>Scanner</th><th>Detected</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f: any) => {
                    const ss = severityStyle[f.severity] ?? severityStyle['INFO']
                    return (
                      <tr key={f.id} className="cursor-pointer group">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: ss.bg, border: `1px solid ${ss.border}` }}>
                              <Bug size={12} style={{ color: ss.color }} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate max-w-[200px]">{f.title}</div>
                              <div className="text-[10px] text-slate-400 truncate">{f.description?.slice(0, 60)}…</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="font-mono text-[11px] text-slate-500">{f.cve_id || '—'}</td>
                        <td className="text-xs font-semibold text-slate-700">{f.application || '—'}</td>
                        <td className="text-xs text-slate-500 capitalize">{f.scanner || '—'}</td>
                        <td className="text-xs text-slate-400">{formatTime(f.detected_at)}</td>
                        <td><StatusBadge status={f.status?.toUpperCase() ?? 'OPEN'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>
    </>
  )
}
