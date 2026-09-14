import { useNavigate } from 'react-router-dom'
import { useIncidents, useApplications, useCreateIncident } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { SideDrawer } from '../components/ui/SideDrawer'
import type { Incident } from '../types'
import { AlertTriangle, Plus, Activity, Shield, CheckCircle2, XCircle, Clock, Zap, ChevronRight } from 'lucide-react'
import { useState } from 'react'

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const severityStyle: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: 'rgba(127,29,29,0.12)', color: '#991b1b', border: 'rgba(127,29,29,0.3)' },
  HIGH:     { bg: 'rgba(244,63,94,0.1)', color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  MEDIUM:   { bg: 'rgba(245,158,11,0.1)', color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  LOW:      { bg: 'rgba(16,185,129,0.1)', color: '#059669', border: 'rgba(16,185,129,0.25)' },
}

export default function IncidentsPage() {
  const navigate = useNavigate()
  const { data: incidents, isLoading } = useIncidents()
  const [createOpen, setCreateOpen] = useState(false)

  const active = incidents?.filter(i => !['resolved','closed'].includes(i.status.toLowerCase())).length ?? 0
  const critical = incidents?.filter(i => i.severity === 'CRITICAL').length ?? 0
  const resolved = incidents?.filter(i => ['resolved','closed'].includes(i.status.toLowerCase())).length ?? 0

  return (
    <>
      <PageHeader
        title="Incident Command"
        description="AI-driven incident detection, root cause analysis, autonomous remediation, and post-mortem tracking."
        icon={<AlertTriangle size={18} />}
        badge="Incident Response"
        badgeVariant="red"
        actions={
          <button className="fi-btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={13} /> Report Incident
          </button>
        }
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active"     value={active}   sub="In progress"   icon={Activity}     gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Critical"   value={critical} sub="P0 incidents"  icon={XCircle}      gradient={['#991b1b','#e11d48']} />
          <StatCard label="Resolved"   value={resolved} sub="Closed"        icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="MTTR"       value="23min"    sub="Mean time resolve" icon={Clock}    gradient={['#7c3aed','#4f46e5']} />
        </div>

        {active > 0 && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}>
            <Zap size={16} style={{ color: '#e11d48' }} className="shrink-0 animate-pulse" />
            <span className="text-sm font-semibold" style={{ color: '#9f1239' }}>
              {active} active incident{active > 1 ? 's' : ''} — autonomous remediation in progress
            </span>
          </div>
        )}

        <EnterpriseCard>
          <SectionHeader icon={AlertTriangle} title="Incident Register" subtitle={`${incidents?.length ?? 0} total incidents`} iconColor="#e11d48" />
          {isLoading ? (
            <LoadingSpinner message="Loading incident register..." />
          ) : !incidents?.length ? (
            <EmptyState
              message="No incidents recorded"
              description="Incidents detected by autonomous monitoring will appear here."
              icon={<CheckCircle2 size={24} className="text-emerald-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Incident</th><th>Severity</th><th>Application</th><th>Environment</th>
                    <th>Root Cause</th><th>Status</th><th>Detected</th><th />
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc: Incident) => {
                    const ss = severityStyle[inc.severity] ?? severityStyle['LOW']
                    return (
                      <tr
                        key={inc.id}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/incidents/${inc.id}`)}
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: ss.bg, border: `1px solid ${ss.border}` }}>
                              <AlertTriangle size={12} style={{ color: ss.color }} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate max-w-[180px]">{inc.title}</div>
                              <div className="font-mono text-[10px] text-slate-400">{inc.id.slice(0, 14)}…</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                            {inc.severity}
                          </span>
                        </td>
                        <td className="text-xs font-semibold text-slate-700">{inc.application_id?.slice(0, 16) || '—'}</td>
                        <td className="text-xs text-slate-600">{inc.environment_id || (inc as any).environment || '—'}</td>
                        <td className="text-xs text-slate-500 max-w-[160px] truncate">
                          {typeof inc.root_cause === 'object' && inc.root_cause !== null
                            ? (inc.root_cause as any).finding || (inc.root_cause as any).description || 'Identified'
                            : (inc.root_cause || 'Analyzing…')}
                        </td>
                        <td><StatusBadge status={inc.status?.toUpperCase()} /></td>
                        <td className="text-xs text-slate-400">{timeAgo(inc.detected_at)}</td>
                        <td>
                          <ChevronRight size={14} className="text-slate-200 group-hover:text-rose-500 transition-colors" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>

      <SideDrawer open={createOpen} onClose={() => setCreateOpen(false)} title="Report Incident" subtitle="Create a new incident for autonomous remediation">
        <div className="p-5">
          <p className="text-sm text-slate-600">Incident creation form — connect to useCreateIncident hook.</p>
        </div>
      </SideDrawer>
    </>
  )
}
