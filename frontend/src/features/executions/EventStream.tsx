import { useEffect, useRef, useState } from 'react'
import {
  Play, CheckCircle2, XCircle, AlertCircle, Clock,
  Bot, FileText, Wrench, ShieldCheck, Shield, RotateCcw,
  GitBranch, ScrollText, Lock, Unlock, Loader2, CircleDot,
} from 'lucide-react'
import type { ExecutionEvent } from '../../types'

interface EventStreamProps {
  events: ExecutionEvent[]
  autoScroll?: boolean
}

const EVENT_CONFIG: Record<string, { icon: typeof Play; color: string; bg: string }> = {
  EXECUTION_STARTED: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
  PIPELINE_STARTED: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
  HARNESS_STARTED: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
  GRAPH_NODE_STARTED: { icon: CircleDot, color: 'text-forgeiq-600', bg: 'bg-forgeiq-50' },
  AGENT_STARTED: { icon: Bot, color: 'text-forgeiq-600', bg: 'bg-forgeiq-50' },
  CONTEXT_PREPARED: { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
  TOOL_REQUESTED: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
  PERMISSION_CHECKED: { icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' },
  POLICY_CHECKED: { icon: ShieldCheck, color: 'text-red-600', bg: 'bg-red-50' },
  TOOL_EXECUTED: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
  TOOL_RESULT: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  EVALUATION_STARTED: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' },
  EVALUATION_COMPLETED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  LOOP_TRIGGERED: { icon: RotateCcw, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  RETRY_STARTED: { icon: RotateCcw, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  APPROVAL_REQUESTED: { icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50' },
  APPROVAL_GRANTED: { icon: Unlock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  APPROVAL_REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  EVIDENCE_CREATED: { icon: ScrollText, color: 'text-rose-600', bg: 'bg-rose-50' },
  GRAPH_NODE_COMPLETED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  HARNESS_COMPLETED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  PIPELINE_COMPLETED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  EXECUTION_FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  EXECUTION_COMPLETED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

export function EventStream({ events, autoScroll = true }: EventStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPinned, setIsPinned] = useState(true)

  useEffect(() => {
    if (autoScroll && isPinned && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events, autoScroll, isPinned])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setIsPinned(atBottom)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Event Stream</h3>
          <span className="text-xs text-slate-400">{events.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          {isPinned ? (
            <span className="text-[11px] text-blue-600 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Live
            </span>
          ) : (
            <button
              onClick={() => {
                setIsPinned(true)
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }}
              className="text-[11px] text-forgeiq-600 hover:text-forgeiq-700 flex items-center gap-1"
            >
              Jump to latest
            </button>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            Waiting for events...
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {events.map((event) => {
              const cfg = EVENT_CONFIG[event.event_type] || { icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-50' }
              const Icon = cfg.icon
              const isRunning = event.event_type.includes('STARTED') && !event.event_type.includes('COMPLETED')

              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors ${cfg.bg}`}
                >
                  <Icon
                    size={14}
                    className={`${cfg.color} mt-0.5 flex-shrink-0 ${isRunning ? 'animate-spin' : ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {event.message && (
                      <p className="text-xs text-slate-600 mt-0.5 truncate">{event.message}</p>
                    )}
                    {(event.node_id || event.agent_id || event.tool_id || event.harness_id) && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {event.harness_id && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            H:{event.harness_id.slice(0, 8)}
                          </span>
                        )}
                        {event.node_id && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            N:{event.node_id.slice(0, 8)}
                          </span>
                        )}
                        {event.agent_id && (
                          <span className="text-[10px] text-forgeiq-500 font-mono bg-forgeiq-50 px-1.5 py-0.5 rounded">
                            A:{event.agent_id.slice(0, 8)}
                          </span>
                        )}
                        {event.tool_id && (
                          <span className="text-[10px] text-amber-500 font-mono bg-amber-50 px-1.5 py-0.5 rounded">
                            T:{event.tool_id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
