import { Repeat, Zap, AlertTriangle, ArrowUpCircle } from 'lucide-react'
import { useLoops } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Loop } from '../types'

const LOOP_TYPE_COLORS: Record<string, string> = {
  iterative: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  event_driven: 'bg-blue-50 text-blue-700 border border-blue-200',
  polling: 'bg-amber-50 text-amber-700 border border-amber-200',
  feedback: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  retry: 'bg-orange-50 text-orange-700 border border-orange-200',
}

export default function LoopEngineeringPage() {
  const { data: loops, isLoading } = useLoops()

  return (
    <div>
      <PageHeader
        title="Loop Engineering"
        description="Execution loops with triggers, exit conditions, and failure handling"
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : !loops?.length ? (
          <div className="fi-card">
            <EmptyState message="No loops defined" />
          </div>
        ) : (
          <div className="fi-card">
            <table className="fi-table">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Trigger</th>
                  <th className="text-right">Max Iterations</th>
                  <th className="text-left">Exit Condition</th>
                  <th className="text-left">Failure Handling</th>
                  <th className="text-left">Escalation</th>
                  <th className="text-center">Published</th>
                </tr>
              </thead>
              <tbody>
                {loops.map((l: Loop) => (
                  <tr key={l.id}>
                    <td className="font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-slate-400" />
                        {l.display_name || l.name}
                      </div>
                    </td>
                    <td>
                      <span className={`fi-badge ${LOOP_TYPE_COLORS[l.loop_type] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                        {l.loop_type}
                      </span>
                    </td>
                    <td className="text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-slate-400" />
                        {l.trigger}
                      </div>
                    </td>
                    <td className="text-right text-slate-600 font-mono">{l.max_iterations}</td>
                    <td className="text-slate-600 text-sm max-w-xs truncate">{l.exit_condition}</td>
                    <td className="text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                        {l.failure_handling}
                      </div>
                    </td>
                    <td className="text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-slate-400" />
                        {l.escalation}
                      </div>
                    </td>
                    <td className="text-center">
                      <StatusBadge status={l.published ? 'published' : 'draft'} />
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
