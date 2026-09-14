import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useNavigate } from 'react-router-dom'
import { Hammer, Package, CheckCircle2, XCircle, Clock, Activity, Play, ChevronRight } from 'lucide-react'
import { useBuildRuns } from '../hooks/useQueries'

function formatTime(ts?: string): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function BuildAutomationPage() {
  const navigate = useNavigate()
  const { data: builds, isLoading } = useBuildRuns?.() ?? { data: null, isLoading: false }

  const running   = builds?.filter((b: any) => b.status === 'RUNNING').length ?? 0
  const success   = builds?.filter((b: any) => b.status === 'SUCCESS' || b.status === 'COMPLETED').length ?? 0
  const failed    = builds?.filter((b: any) => b.status === 'FAILED').length ?? 0

  return (
    <>
      <PageHeader
        title="Build Automation"
        description="Autonomous build orchestration — compile, package, scan, and publish artifacts with AI verification."
        icon={<Hammer size={18} />}
        badge="CI/CD"
        badgeVariant="emerald"
        actions={<button className="fi-btn-primary"><Play size={13} /> Trigger Build</button>}
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Running"    value={running}                sub="In progress"   icon={Activity}     gradient={['#00adef','#0a68f4']} />
          <StatCard label="Successful" value={success}                sub="Green builds"  icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Failed"     value={failed}                 sub="Broken"        icon={XCircle}      gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Artifacts"  value={builds?.length ?? 0}   sub="Published"     icon={Package}      gradient={['#7c3aed','#4f46e5']} />
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Hammer} title="Build Run History" subtitle="All CI/CD build runs" iconColor="#10b981" />
          {isLoading ? (
            <LoadingSpinner message="Loading build history..." />
          ) : !builds?.length ? (
            <EmptyState
              message="No build runs found"
              description="Trigger a build to see automated compile, test, and package results here."
              icon={<Hammer size={24} className="text-slate-300" />}
              action={<button className="fi-btn-primary"><Play size={13} /> Trigger First Build</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Build ID</th><th>Application</th><th>Branch</th>
                    <th>Status</th><th>Duration</th><th>Started</th><th />
                  </tr>
                </thead>
                <tbody>
                  {builds.map((b: any) => (
                    <tr key={b.id} className="cursor-pointer group" onClick={() => navigate(`/builds/${b.id}`)}>
                      <td><span className="font-mono text-xs font-bold" style={{ color: '#0284c7' }}>{b.id?.slice(0, 12)}…</span></td>
                      <td className="font-semibold text-slate-900 text-xs">{b.application}</td>
                      <td><span className="font-mono text-[11px] text-slate-500">{b.branch}</span></td>
                      <td>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={b.status === 'SUCCESS' || b.status === 'COMPLETED'
                            ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
                            : b.status === 'FAILED'
                            ? { background: 'rgba(244,63,94,0.1)', color: '#e11d48', border: '1px solid rgba(244,63,94,0.2)' }
                            : { background: 'rgba(14,165,233,0.1)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }
                          }>
                          {b.status}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-slate-600">{b.duration_seconds ? `${b.duration_seconds}s` : '—'}</td>
                      <td className="text-xs text-slate-400">{formatTime(b.started_at)}</td>
                      <td><ChevronRight size={14} className="text-slate-200 group-hover:text-sky-500 transition-colors" /></td>
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
