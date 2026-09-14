import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useDeployments } from '../hooks/useQueries'
import { useNavigate } from 'react-router-dom'
import { Rocket, Plus, CheckCircle2, XCircle, RotateCcw, Clock, Server, ChevronRight, AlertTriangle } from 'lucide-react'

function formatTime(ts?: string): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const statusStyle: Record<string, { bg: string; color: string; border: string }> = {
  COMPLETED:  { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  VERIFIED:   { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  DEPLOYING:  { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
  FAILED:     { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  ROLLED_BACK:{ bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  ROLLING_BACK:{ bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  PRECHECK:   { bg: 'rgba(99,102,241,0.1)', color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
}

export default function DeploymentsPage() {
  const navigate = useNavigate()
  const { data: deployments, isLoading } = useDeployments()

  const completed  = deployments?.filter(d => d.status === 'COMPLETED' || d.status === 'verified').length ?? 0
  const deploying  = deployments?.filter(d => ['DEPLOYING','deploying','running'].includes(d.status)).length ?? 0
  const failed     = deployments?.filter(d => d.status === 'FAILED').length ?? 0
  const rolledBack = deployments?.filter(d => ['ROLLED_BACK','rolled_back'].includes(d.status)).length ?? 0

  return (
    <>
      <PageHeader
        title="Deployments"
        description="Autonomous deployment engine — progressive rollouts, canary analysis, verification gates, and auto-rollback."
        icon={<Rocket size={18} />}
        badge="Progressive Delivery"
        badgeVariant="violet"
        actions={<button className="fi-btn-primary"><Plus size={13} /> New Deployment</button>}
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Deploying"    value={deploying}  sub="In progress"     icon={Rocket}       gradient={['#00adef','#0a68f4']} />
          <StatCard label="Completed"    value={completed}  sub="Successful"      icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Failed"       value={failed}     sub="Needs attention" icon={XCircle}      gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Rolled Back"  value={rolledBack} sub="Auto-recovered"  icon={RotateCcw}    gradient={['#f59e0b','#f97316']} />
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Rocket} title="Deployment Ledger" subtitle={`${deployments?.length ?? 0} total deployments`} iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner message="Loading deployments..." />
          ) : !deployments?.length ? (
            <EmptyState
              message="No deployments found"
              description="Trigger a pipeline to automatically deploy your application with AI verification."
              icon={<Rocket size={24} className="text-slate-300" />}
              action={<button className="fi-btn-primary"><Plus size={13} /> New Deployment</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Deployment</th><th>Application</th><th>Environment</th>
                    <th>Strategy</th><th>Version</th><th>Status</th><th>Deployed At</th><th />
                  </tr>
                </thead>
                <tbody>
                  {deployments.map(d => {
                    const ss = statusStyle[d.status?.toUpperCase()] ?? statusStyle['DEPLOYING']
                    return (
                      <tr key={d.id} className="cursor-pointer group" onClick={() => navigate(`/deployments/${d.id}`)}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                              <Rocket size={12} style={{ color: '#7c3aed' }} />
                            </div>
                            <span className="font-mono text-xs font-bold" style={{ color: '#0284c7' }}>{d.id.slice(0, 12)}…</span>
                          </div>
                        </td>
                        <td className="font-semibold text-slate-900 text-xs">{d.application_id?.slice(0, 20) || '—'}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Server size={11} className="text-slate-400" />
                            <span className="text-xs text-slate-600">{d.environment_id?.slice(0, 16) || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.2)' }}>
                            {d.strategy?.replace('_', ' ') || 'blue-green'}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>
                            {d.version || d.artifact_version || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                            {d.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400">{formatTime(d.completed_at || d.started_at || d.deployed_at)}</td>
                        <td><ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-500 transition-colors" /></td>
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
