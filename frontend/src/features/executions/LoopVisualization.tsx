import { useMemo } from 'react'
import {
  RotateCcw, XCircle, CheckCircle2, AlertCircle,
  Wrench, Search, ArrowRight, Clock,
} from 'lucide-react'
import type { ExecutionEvent } from '../../types'

interface LoopVisualizationProps {
  events: ExecutionEvent[]
}

interface LoopIteration {
  iteration: number
  trigger?: string
  evaluationResult?: string
  decision?: string
  action?: string
  exitReason?: string
  timestamp: string
  status: 'running' | 'succeeded' | 'failed' | 'retrying'
  events: ExecutionEvent[]
}

export function LoopVisualization({ events }: LoopVisualizationProps) {
  const iterations = useMemo<LoopIteration[]>(() => {
    const loopEvents = events.filter(e =>
      e.event_type === 'LOOP_TRIGGERED' ||
      e.event_type === 'RETRY_STARTED' ||
      e.event_type === 'EVALUATION_STARTED' ||
      e.event_type === 'EVALUATION_COMPLETED' ||
      e.event_type === 'EVIDENCE_CREATED'
    )

    if (loopEvents.length === 0) return []

    const result: LoopIteration[] = []
    let current: LoopIteration | null = null

    for (const ev of loopEvents) {
      if (ev.event_type === 'LOOP_TRIGGERED' || ev.event_type === 'RETRY_STARTED') {
        if (current) result.push(current)
        const iterationNum = (ev.data?.iteration as number) || result.length + 1
        current = {
          iteration: iterationNum,
          trigger: ev.data?.trigger as string || ev.event_type,
          timestamp: ev.timestamp,
          status: 'running',
          events: [ev],
        }
      } else if (current) {
        current.events.push(ev)
        if (ev.event_type === 'EVALUATION_COMPLETED') {
          const success = ev.data?.success
          current.evaluationResult = success ? 'passed' : 'failed'
          current.status = success ? 'succeeded' : 'retrying'
        }
        if (ev.event_type === 'EVIDENCE_CREATED' && current.evaluationResult === 'passed') {
          current.exitReason = 'exit_condition_met'
          current.status = 'succeeded'
        }
      }
    }
    if (current) result.push(current)
    return result
  }, [events])

  if (iterations.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Loop Visualization</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs px-4 text-center">
          No loop iterations in this execution
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">Loop Visualization</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">{iterations.length} iteration(s)</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-4">
            {iterations.map((iter, idx) => {
              const isLast = idx === iterations.length - 1
              const statusIcon = iter.status === 'succeeded' ? CheckCircle2 :
                iter.status === 'failed' ? XCircle :
                iter.status === 'retrying' ? RotateCcw : Clock
              const StatusIcon = statusIcon
              const statusColor = iter.status === 'succeeded' ? 'text-emerald-600' :
                iter.status === 'failed' ? 'text-red-600' :
                iter.status === 'retrying' ? 'text-yellow-600' : 'text-blue-600'
              const statusBg = iter.status === 'succeeded' ? 'bg-emerald-50 border-emerald-200' :
                iter.status === 'failed' ? 'bg-red-50 border-red-200' :
                iter.status === 'retrying' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'

              return (
                <div key={idx} className="relative flex gap-3">
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 ${statusBg} flex items-center justify-center`}>
                    <StatusIcon size={16} className={`${statusColor} ${iter.status === 'running' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Attempt {iter.iteration}
                      </span>
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${statusBg} ${statusColor}`}>
                        {iter.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-auto">
                        {new Date(iter.timestamp).toLocaleTimeString(undefined, { hour12: false })}
                      </span>
                    </div>

                    {iter.trigger && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
                        <AlertCircle size={11} className="text-slate-400" />
                        <span>Trigger: {iter.trigger}</span>
                      </div>
                    )}

                    {iter.evaluationResult && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs">
                        <Search size={11} className={iter.evaluationResult === 'passed' ? 'text-emerald-500' : 'text-red-500'} />
                        <span className={iter.evaluationResult === 'passed' ? 'text-emerald-700' : 'text-red-700'}>
                          Evaluation: {iter.evaluationResult}
                        </span>
                      </div>
                    )}

                    {iter.status === 'retrying' && !isLast && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-yellow-600">
                        <RotateCcw size={11} />
                        <span>Retrying with fix...</span>
                      </div>
                    )}

                    {iter.status === 'succeeded' && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600">
                        <CheckCircle2 size={11} />
                        <span>Exit condition met — loop completed</span>
                      </div>
                    )}

                    {iter.exitReason && (
                      <div className="text-[10px] text-slate-400 mt-0.5">Exit: {iter.exitReason}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
