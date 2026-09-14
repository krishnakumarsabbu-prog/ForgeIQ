import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useNavigate } from 'react-router-dom'
import { Rocket, Package, CheckCircle2, Clock, Tag, ArrowUpRight, Play, ChevronRight, TrendingUp } from 'lucide-react'
import { useReleases } from '../hooks/useQueries'

function timeAgo(iso: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return `${Math.floor(diff/60000)}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs/24)}d ago`
}

export default function ReleaseAutomationPage() {
  const navigate = useNavigate()
  const { data: releases, isLoading } = useReleases?.() ?? { data: null, isLoading: false }

  const released = releases?.filter((r: any) => r.status === 'released' || r.status === 'RELEASED').length ?? 0
  const pending  = releases?.filter((r: any) => r.status === 'pending'  || r.status === 'PENDING').length ?? 0

  return (
    <>
      <PageHeader
        title="Release Automation"
        description="Autonomous release planning, version management, changelog generation, and canary progressive delivery."
        icon={<Rocket size={18} />}
        badge="Continuous Delivery"
        badgeVariant="violet"
        actions={<button className="fi-btn-primary"><Play size={13} /> Plan Release</button>}
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Releases" value={releases?.length ?? 0} sub="All time"       icon={Tag}         gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Released"       value={released}               sub="Shipped"        icon={CheckCircle2} gradient={['#10b981','#0891b2']} />
          <StatCard label="Pending"        value={pending}                sub="In queue"       icon={Clock}       gradient={['#f59e0b','#f97316']} />
          <StatCard label="Velocity"       value="98.2%"                  sub="Success rate"  icon={TrendingUp}  gradient={['#00adef','#0a68f4']} />
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Rocket} title="Release Register" subtitle="All release versions across applications" iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner message="Loading release register..." />
          ) : !releases?.length ? (
            <EmptyState
              message="No releases found"
              description="Plan your first release to start tracking delivery velocity."
              icon={<Rocket size={24} className="text-slate-300" />}
              action={<button className="fi-btn-primary"><Play size={13} /> Plan Release</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Release</th><th>Application</th><th>Version</th>
                    <th>Environment</th><th>Status</th><th>Released</th><th />
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r: any) => (
                    <tr key={r.id} className="cursor-pointer group" onClick={() => navigate(`/releases/${r.id}`)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <Package size={12} style={{ color: '#7c3aed' }} />
                          </div>
                          <span className="font-semibold text-slate-900 text-xs">{r.name || r.id?.slice(0, 16)}</span>
                        </div>
                      </td>
                      <td className="text-xs font-medium text-slate-700">{r.application}</td>
                      <td>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>
                          {r.version}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600">{r.environment}</td>
                      <td>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={r.status === 'released' || r.status === 'RELEASED'
                            ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
                            : r.status === 'failed' || r.status === 'FAILED'
                            ? { background: 'rgba(244,63,94,0.1)', color: '#e11d48', border: '1px solid rgba(244,63,94,0.2)' }
                            : { background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }
                          }>
                          {r.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{timeAgo(r.released_at || r.created_at)}</td>
                      <td><ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-500 transition-colors" /></td>
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
