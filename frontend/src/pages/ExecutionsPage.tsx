import { useNavigate } from 'react-router-dom'
import { Play, DollarSign, Coins, RotateCcw } from 'lucide-react'
import { useExecutions } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Execution } from '../types'

export default function ExecutionsPage() {
  const navigate = useNavigate()
  const { data: executions, isLoading } = useExecutions()

  return (
    <div>
      <PageHeader
        title="Executions"
        description="Live and historical pipeline and harness executions"
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : !executions?.length ? (
          <div className="fi-card">
            <EmptyState message="No executions found" />
          </div>
        ) : (
          <div className="fi-card">
            <table className="fi-table">
              <thead>
                <tr>
                  <th className="text-left">ID</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Progress</th>
                  <th className="text-left">Trigger</th>
                  <th className="text-left">Current Stage</th>
                  <th className="text-right">Tokens</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Retries</th>
                  <th className="text-left">Started At</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((e: Execution) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/executions/${e.id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="font-mono text-xs text-slate-500">
                      {e.id.slice(0, 8)}…
                    </td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-forgeiq-600 transition-all"
                            style={{ width: `${e.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-mono w-8 text-right">
                          {e.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5 text-slate-400" />
                        {e.trigger}
                      </div>
                    </td>
                    <td className="text-slate-600 text-sm">{e.current_stage || '—'}</td>
                    <td className="text-right text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        <Coins className="h-3.5 w-3.5 text-slate-400" />
                        {e.tokens_used.toLocaleString()}
                      </div>
                    </td>
                    <td className="text-right text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                        {(e.cost_cents / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="text-right text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        {e.retry_count > 0 && <RotateCcw className="h-3.5 w-3.5 text-amber-500" />}
                        {e.retry_count}
                      </div>
                    </td>
                    <td className="text-slate-500 text-sm">
                      {e.started_at
                        ? new Date(e.started_at).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
