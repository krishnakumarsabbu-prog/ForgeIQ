import { useNavigate } from 'react-router-dom'
import { useAgentExecutions } from '../hooks/useQueries'
import { PageHeader, StatusBadge, StageStepIndicator, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { Bot, Activity, CheckCircle2, XCircle, Coins, ChevronRight, RotateCcw } from 'lucide-react'

function formatCost(cents: number) { return `$${(cents/100).toFixed(3)}` }
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins/60)}h ago`
}

export default function AgentExecutionsPage() {
  const navigate = useNavigate()
  const { data: executions, isLoading } = useAgentExecutions()

  const running   = executions?.filter(e => e.status === 'RUNNING').length ?? 0
  const completed = executions?.filter(e => e.status === 'COMPLETED').length ?? 0
  const failed    = executions?.filter(e => e.status === 'FAILED').length ?? 0
  const totalCost = executions?.reduce((s, e) => s + (e.cost_cents || 0), 0) ?? 0

  return (
    <>
      <PageHeader
        title="Agent Executions"
        description="Live telemetry of all AI agent task executions — cost, tokens, status, and retry trace."
        icon={<Bot size={18} />}
        badge="Live Telemetry"
        badgeVariant="cyan"
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Running"    value={running}   sub="Active now"   icon={Activity}     gradient={['#00adef','#0a68f4']} />
          <StatCard label="Completed"  value={completed} sub="Successful"   icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Failed"     value={failed}    sub="Errors"       icon={XCircle}      gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Total Spend" value={formatCost(totalCost)} sub="AI cost" icon={Coins} gradient={['#f59e0b','#f97316']} />
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Bot} title="Agent Execution Ledger" subtitle={`${executions?.length ?? 0} agent task runs`} iconColor="#00adef" />
          {isLoading ? <LoadingSpinner /> : !executions?.length ? (
            <EmptyState message="No agent executions found" description="Agent task runs will appear here in real-time." />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Execution</th><th>Agent</th><th>Status</th><th>Stage</th>
                    <th className="text-right">Tokens</th><th className="text-right">Cost</th>
                    <th className="text-right">Retries</th><th>Started</th><th />
                  </tr>
                </thead>
                <tbody>
                  {executions.map((e: any) => (
                    <tr key={e.id} onClick={() => navigate(`/executions/${e.id}`)} className="cursor-pointer group">
                      <td><span className="font-mono text-xs font-bold" style={{ color: '#0284c7' }}>{e.id.slice(0, 12)}…</span></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Bot size={12} className="text-sky-500" />
                          <span className="text-xs font-medium text-slate-700">{e.agent_name || e.agent_id?.slice(0, 16)}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={e.status} /></td>
                      <td>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}>
                          {e.current_stage || 'idle'}
                        </span>
                      </td>
                      <td className="text-right font-mono text-xs text-slate-600">{(e.tokens_used || 0).toLocaleString()}</td>
                      <td className="text-right font-mono text-xs font-bold text-slate-700">{formatCost(e.cost_cents || 0)}</td>
                      <td className="text-right font-mono text-xs text-slate-600">
                        <div className="flex items-center justify-end gap-1">
                          {e.retry_count > 0 && <RotateCcw size={10} className="text-amber-500" />}
                          {e.retry_count || 0}
                        </div>
                      </td>
                      <td className="text-xs text-slate-400">{timeAgo(e.started_at)}</td>
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
