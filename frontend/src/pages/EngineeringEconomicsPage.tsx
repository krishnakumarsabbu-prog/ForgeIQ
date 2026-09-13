import { useDashboard, useExecutions, useAgents, useModels } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '../components/ui/PageHeader'
import { MetricStrip } from '../components/ui/MetricStrip'
import { DollarSign, Coins, Cpu, TrendingUp, Bot } from 'lucide-react'

export default function EngineeringEconomicsPage() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard()
  const { data: executions, isLoading: execLoading } = useExecutions()
  const { data: agents, isLoading: agentLoading } = useAgents()
  const { data: models, isLoading: modelLoading } = useModels()

  if (dashLoading || execLoading || agentLoading || modelLoading) return (<><PageHeader title="Engineering Economics" description="Token consumption, cost analysis, and resource utilization across the platform" /><LoadingSpinner /></>)

  const econ = dashboard?.economics
  const execs = executions ?? []
  const agentList = agents ?? []
  const modelList = models ?? []

  const costByAgent = agentList.map(a => {
    const agentExecs = execs.filter(e => e.events?.some(ev => ev.agent_id === a.id))
    const cost = agentExecs.reduce((sum, e) => sum + e.cost_cents, 0)
    const tokens = agentExecs.reduce((sum, e) => sum + e.tokens_used, 0)
    return { name: a.display_name || a.name, cost, tokens, executions: agentExecs.length }
  }).sort((a, b) => b.cost - a.cost)

  const costByModel = modelList.map(m => {
    const modelExecs = execs.filter(e => e.events?.some(ev => ev.data?.model === m.model))
    const cost = modelExecs.reduce((sum, e) => sum + e.cost_cents, 0)
    const tokens = modelExecs.reduce((sum, e) => sum + e.tokens_used, 0)
    return { name: m.display_name || m.name, cost, tokens, executions: modelExecs.length, costPer1k: m.cost_per_1k_input_cents + m.cost_per_1k_output_cents }
  }).sort((a, b) => b.cost - a.cost)

  return (
    <>
      <PageHeader title="Engineering Economics" description="Token consumption, cost analysis, and resource utilization across the platform" />
      <div className="p-6 space-y-6">
        {econ && (
          <MetricStrip
            metrics={[
              { label: 'Total Cost', value: `$${econ.total_cost_dollars.toFixed(2)}`, icon: <DollarSign size={14} /> },
              { label: 'Total Tokens', value: econ.total_tokens.toLocaleString(), icon: <Coins size={14} /> },
              { label: 'Avg Cost / Execution', value: execs.length > 0 ? `$${(econ.total_cost_cents / execs.length / 100).toFixed(2)}` : '$0.00', icon: <TrendingUp size={14} /> },
              { label: 'Active Agents', value: agentList.filter(a => a.published).length, icon: <Bot size={14} /> },
              { label: 'Active Models', value: modelList.filter(m => m.active).length, icon: <Cpu size={14} /> },
            ]}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Cost by Agent</h3>
            </div>
            {costByAgent.length === 0 || costByAgent.every(a => a.cost === 0) ? (
              <EmptyState message="No agent cost data available" />
            ) : (
              <div className="p-4 space-y-3">
                {costByAgent.filter(a => a.cost > 0).slice(0, 15).map(a => (
                  <div key={a.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">{a.name}</span>
                      <span className="text-sm font-semibold text-slate-900">${(a.cost / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-forgeiq-500 rounded-full" style={{ width: `${(a.cost / (costByAgent[0]?.cost || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{a.tokens.toLocaleString()} tok</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Cost by Model</h3>
            </div>
            {costByModel.length === 0 || costByModel.every(m => m.cost === 0) ? (
              <EmptyState message="No model cost data available" />
            ) : (
              <div className="p-4 space-y-3">
                {costByModel.filter(m => m.cost > 0).slice(0, 15).map(m => (
                  <div key={m.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">{m.name}</span>
                      <span className="text-sm font-semibold text-slate-900">${(m.cost / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.cost / (costByModel[0]?.cost || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{m.costPer1k.toFixed(2)}c/1k</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Recent Execution Costs</h3>
          </div>
          {execs.length === 0 ? (
            <EmptyState message="No execution data available" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>Status</th>
                    <th className="text-right">Tokens</th>
                    <th className="text-right">Cost</th>
                    <th className="text-right">Retries</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {execs.slice(0, 50).map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs text-slate-600">{e.id.slice(0, 12)}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td className="text-right text-slate-600">{e.tokens_used.toLocaleString()}</td>
                      <td className="text-right font-medium text-slate-900">${(e.cost_cents / 100).toFixed(2)}</td>
                      <td className="text-right text-slate-600">{e.retry_count}</td>
                      <td className="text-xs text-slate-500">{e.started_at ? new Date(e.started_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
