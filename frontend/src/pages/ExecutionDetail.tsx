import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Clock,
  Coins,
  DollarSign,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Circle,
} from 'lucide-react'
import { useExecution, useExecutionEvents } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { ExecutionEvent } from '../types'

const EVENT_ICONS: Record<string, React.ReactNode> = {
  started: <Play className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  stage_started: <Circle className="h-4 w-4 text-forgeiq-500" />,
  stage_completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  approval_requested: <AlertCircle className="h-4 w-4 text-amber-500" />,
  cancelled: <XCircle className="h-4 w-4 text-slate-400" />,
}

export default function ExecutionDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: execution, isLoading } = useExecution(id || '')
  const { data: events, isLoading: eventsLoading } = useExecutionEvents(id || '')

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Execution Detail" />
        <LoadingSpinner />
      </div>
    )
  }

  if (!execution) {
    return (
      <div>
        <PageHeader title="Execution Detail" />
        <div className="fi-card">
          <EmptyState message="Execution not found" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Execution ${execution.id.slice(0, 8)}`}
        description={execution.trigger_reason}
        actions={
          <Link
            to="/executions"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Execution Info */}
        <div className="fi-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Execution Overview</h2>
            <StatusBadge status={execution.status} />
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">Progress</span>
              <span className="text-xs font-mono text-slate-600">{execution.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-forgeiq-600 transition-all"
                style={{ width: `${execution.progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoField
              label="Trigger"
              value={execution.trigger}
              icon={<Play className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Started"
              value={execution.started_at ? new Date(execution.started_at).toLocaleString() : '—'}
              icon={<Clock className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Completed"
              value={
                execution.completed_at
                  ? new Date(execution.completed_at).toLocaleString()
                  : '—'
              }
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Current Stage"
              value={execution.current_stage || '—'}
            />
            <InfoField
              label="Tokens Used"
              value={execution.tokens_used.toLocaleString()}
              icon={<Coins className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Cost"
              value={`$${(execution.cost_cents / 100).toFixed(2)}`}
              icon={<DollarSign className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Retries"
              value={String(execution.retry_count)}
              icon={<RotateCcw className="h-3.5 w-3.5 text-slate-400" />}
            />
            <InfoField
              label="Pipeline"
              value={execution.pipeline_id || '—'}
            />
          </div>
        </div>

        {/* Error message */}
        {execution.error_message && (
          <div className="fi-card p-4 border-l-4 border-l-red-500">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">Execution Failed</h3>
                <p className="text-sm text-red-700 mt-1">{execution.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Events Timeline */}
        <div className="fi-card">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Event Timeline</h3>
          </div>
          {eventsLoading ? (
            <LoadingSpinner />
          ) : !events?.length ? (
            <EmptyState message="No events recorded" />
          ) : (
            <div className="p-5">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200" />

                <div className="space-y-4">
                  {events.map((event: ExecutionEvent) => (
                    <div key={event.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                        {EVENT_ICONS[event.event_type] || (
                          <Circle className="h-4 w-4 text-slate-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {event.event_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">{event.message}</p>
                        {(event.agent_id || event.tool_id || event.node_id) && (
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            {event.node_id && (
                              <span>Node: {event.node_id.slice(0, 8)}</span>
                            )}
                            {event.agent_id && (
                              <span>Agent: {event.agent_id.slice(0, 8)}</span>
                            )}
                            {event.tool_id && (
                              <span>Tool: {event.tool_id.slice(0, 8)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
        {label}
      </div>
      <div className="text-sm text-slate-900 flex items-center gap-1.5">
        {icon}
        {value}
      </div>
    </div>
  )
}
