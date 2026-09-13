import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Activity, TrendingUp, DollarSign, CheckCircle2, XCircle, Hash } from 'lucide-react'
import { useExecutions } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Execution, ExecutionEvent } from '../types'

interface AgentStats {
  agentId: string
  total: number
  successes: number
  failures: number
  totalTokens: number
  totalCostCents: number
  executions: Execution[]
}

function truncateId(id: string, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—'
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return String(tokens)
}

export default function AgentExecutionsPage() {
  const { data: executions, isLoading } = useExecutions()

  const grouped = useMemo(() => {
    const items = executions ?? []
    const map = new Map<string, AgentStats>()

    for (const ex of items) {
      const agentId = ex.events.find((e: ExecutionEvent) => e.agent_id)?.agent_id || 'unknown'
      if (!map.has(agentId)) {
        map.set(agentId, {
          agentId,
          total: 0,
          successes: 0,
          failures: 0,
          totalTokens: 0,
          totalCostCents: 0,
          executions: [],
        })
      }
      const stats = map.get(agentId)!
      stats.total++
      if (ex.status === 'COMPLETED') stats.successes++
      if (ex.status === 'FAILED') stats.failures++
      stats.totalTokens += ex.tokens_used || 0
      stats.totalCostCents += ex.cost_cents || 0
      stats.executions.push(ex)
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [executions])

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Agent Executions" description="Execution metrics grouped by agent" />
        <LoadingSpinner />
      </div>
    )
  }

  if (grouped.length === 0) {
    return (
      <div className="fi-card">
        <PageHeader title="Agent Executions" description="Execution metrics grouped by agent" />
        <EmptyState message="No executions found" />
      </div>
    )
  }

  return (
    <div className="fi-card">
      <PageHeader
        title="Agent Executions"
        description="Execution metrics grouped by agent"
        actions={<span className="text-xs text-slate-500">{grouped.length} agents</span>}
      />
      <div className="divide-y divide-slate-100">
        {grouped.map((stats) => {
          const successRate = stats.total > 0 ? (stats.successes / stats.total) * 100 : 0
          const avgTokens = stats.total > 0 ? stats.totalTokens / stats.total : 0
          const avgCost = stats.total > 0 ? stats.totalCostCents / stats.total : 0
          return (
            <div key={stats.agentId} className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center">
                  <Cpu className="h-4 w-4 text-forgeiq-600" />
                </div>
                <div>
                  <Link to={`/agents/${stats.agentId}`} className="font-mono text-sm text-forgeiq-600 hover:underline">
                    {stats.agentId === 'unknown' ? 'Unknown Agent' : truncateId(stats.agentId)}
                  </Link>
                  <div className="text-xs text-slate-500">{stats.total} executions</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Activity className="h-3 w-3" /> Total</div>
                  <div className="text-lg font-semibold text-slate-800">{stats.total}</div>
                </div>
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Success Rate</div>
                  <div className={`text-lg font-semibold ${successRate >= 80 ? 'text-emerald-600' : successRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {successRate.toFixed(0)}%
                  </div>
                </div>
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Hash className="h-3 w-3" /> Avg Tokens</div>
                  <div className="text-lg font-semibold text-slate-800">{formatTokens(avgTokens)}</div>
                </div>
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Avg Cost</div>
                  <div className="text-lg font-semibold text-slate-800">{formatCost(avgCost)}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th>Execution ID</th>
                      <th>Status</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                      <th>Retries</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.executions.slice(0, 10).map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50">
                        <td>
                          <Link to={`/executions/${ex.id}`} className="font-mono text-xs text-forgeiq-600 hover:underline">
                            {truncateId(ex.id)}
                          </Link>
                        </td>
                        <td><StatusBadge status={ex.status} /></td>
                        <td className="text-slate-600">{formatTokens(ex.tokens_used || 0)}</td>
                        <td className="text-slate-600">{formatCost(ex.cost_cents || 0)}</td>
                        <td className="text-slate-600">{ex.retry_count}</td>
                        <td className="text-slate-500 whitespace-nowrap text-xs">
                          {ex.started_at ? new Date(ex.started_at).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stats.executions.length > 10 && (
                <div className="text-xs text-slate-400 text-center py-2">
                  Showing 10 of {stats.executions.length} executions
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
