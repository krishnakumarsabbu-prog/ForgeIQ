import { useNavigate } from 'react-router-dom'
import { Play, DollarSign, Coins, RotateCcw, Activity, ArrowUpRight, CheckCircle2, Clock, XCircle, Zap, Filter } from 'lucide-react'
import { useExecutions } from '../hooks/useQueries'
import { PageHeader, StatusBadge, StageStepIndicator, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import type { Execution } from '../types'

export default function ExecutionsPage() {
  const navigate = useNavigate()
  const { data: executions, isLoading } = useExecutions()

  const total = executions?.length ?? 0
  const running = executions?.filter(e => e.status === 'RUNNING').length ?? 0
  const completed = executions?.filter(e => e.status === 'COMPLETED').length ?? 0
  const failed = executions?.filter(e => e.status === 'FAILED').length ?? 0
  const totalCost = executions?.reduce((acc, e) => acc + (e.cost_cents || 0), 0) ?? 0

  return (
    <>
      <PageHeader
        title="Autonomous Executions"
        description="Real-time execution telemetry, agent steps, tokens synthesized, and cost governance."
        badge="Live Telemetry"
        badgeVariant="cyan"
        icon={<Activity size={18} />}
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Cycles"      value={total}      sub="All time"             icon={Activity}      gradient={['#0ea5e9','#0a68f4']} />
          <StatCard label="In Flight"          value={running}    sub="Running now"          icon={Play}          gradient={['#00adef','#06b6d4']} />
          <StatCard label="Verified Success"   value={completed}  sub="Completed"            icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Failed"             value={failed}     sub="Needs attention"      icon={XCircle}       gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Cumulative Spend"   value={`$${(totalCost/100).toFixed(2)}`} sub="AI cost"  icon={DollarSign}   gradient={['#f59e0b','#f97316']} />
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner message="Loading execution telemetry..." />
        ) : !executions?.length ? (
          <EnterpriseCard>
            <EmptyState
              message="No execution telemetry found"
              description="Run an engineering pipeline to see real-time execution data here."
              icon={<Activity size={24} className="text-slate-300" />}
              action={
                <button className="fi-btn-primary" onClick={() => navigate('/start-engineering')}>
                  <Play size={13} /> Start Engineering
                </button>
              }
            />
          </EnterpriseCard>
        ) : (
          <EnterpriseCard>
            <SectionHeader
              icon={Activity}
              title="Execution Run Ledger"
              subtitle={`${executions.length} runs recorded`}
              action={
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  ● Live
                </span>
              }
            />
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>Status</th>
                    <th>Stage Pipeline</th>
                    <th>Progress</th>
                    <th>Trigger Source</th>
                    <th>Current Stage</th>
                    <th className="text-right">Tokens</th>
                    <th className="text-right">Cost</th>
                    <th className="text-right">Retries</th>
                    <th>Started At</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {executions.map((e: Execution) => (
                    <tr key={e.id} onClick={() => navigate(`/executions/${e.id}`)} className="cursor-pointer group">
                      <td>
                        <span className="font-mono text-xs font-bold" style={{ color: '#0284c7' }}>
                          {e.id.slice(0, 10)}…
                        </span>
                      </td>
                      <td><StatusBadge status={e.status} /></td>
                      <td><StageStepIndicator currentStage={e.current_stage} status={e.status} /></td>
                      <td className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${e.progress}%`,
                                background: e.progress >= 80 ? 'linear-gradient(90deg,#10b981,#0891b2)' : 'linear-gradient(90deg,#00adef,#0a68f4)',
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 w-7 text-right">{e.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Zap size={11} className="text-sky-500" /> {e.trigger}
                        </div>
                      </td>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded-lg font-mono text-[11px] font-semibold"
                          style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}
                        >
                          {e.current_stage || 'idle'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs font-mono text-slate-600">
                          <Coins size={11} className="text-slate-400" />
                          {e.tokens_used.toLocaleString()}
                        </div>
                      </td>
                      <td className="text-right font-mono text-xs font-bold" style={{ color: '#0f172a' }}>
                        ${(e.cost_cents / 100).toFixed(2)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs font-mono text-slate-600">
                          {e.retry_count > 0 && <RotateCcw size={10} className="text-amber-500" />}
                          {e.retry_count}
                        </div>
                      </td>
                      <td className="text-slate-400 text-xs">
                        {e.started_at ? new Date(e.started_at).toLocaleTimeString() : '—'}
                      </td>
                      <td>
                        <ArrowUpRight size={14} className="text-slate-200 group-hover:text-sky-500 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </EnterpriseCard>
        )}
      </div>
    </>
  )
}
