import { useMemo, useState } from 'react'
import {
  Wrench, Shield, ShieldCheck, CheckCircle2, XCircle,
  ScrollText, Terminal, FileText, ChevronRight, ChevronDown,
} from 'lucide-react'
import type { ExecutionEvent, Evidence } from '../../types'

interface ToolCallInspectorProps {
  events: ExecutionEvent[]
  evidence: Evidence[]
}

interface ToolCall {
  toolId: string
  toolName: string
  operation: string
  request: ExecutionEvent | null
  permissionCheck: ExecutionEvent | null
  policyCheck: ExecutionEvent | null
  execution: ExecutionEvent | null
  result: ExecutionEvent | null
  evidence: Evidence | null
  status: 'pending' | 'running' | 'succeeded' | 'failed'
}

function formatData(data: unknown): string {
  if (!data) return '—'
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

export function ToolCallInspector({ events, evidence }: ToolCallInspectorProps) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null)

  const toolCalls = useMemo<ToolCall[]>(() => {
    const toolEvents = events.filter(e => e.tool_id)
    const toolMap = new Map<string, ExecutionEvent[]>()

    for (const ev of toolEvents) {
      if (!toolMap.has(ev.tool_id!)) toolMap.set(ev.tool_id!, [])
      toolMap.get(ev.tool_id!)!.push(ev)
    }

    const result: ToolCall[] = []
    for (const [toolId, evs] of toolMap) {
      const sorted = [...evs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const request = sorted.find(e => e.event_type === 'TOOL_REQUESTED') || null
      const permission = sorted.find(e => e.event_type === 'PERMISSION_CHECKED') || null
      const policy = sorted.find(e => e.event_type === 'POLICY_CHECKED') || null
      const execution = sorted.find(e => e.event_type === 'TOOL_EXECUTED') || null
      const resultEv = sorted.find(e => e.event_type === 'TOOL_RESULT') || null
      const toolEvidence = evidence.find(e => e.tool_id === toolId) || null

      const toolName = (request?.data?.tool_name as string) || toolId.slice(0, 12)
      const operation = (request?.data?.operation as string) || (execution?.data?.operation as string) || 'unknown'

      let status: ToolCall['status'] = 'pending'
      if (resultEv) {
        status = (resultEv.data?.exit_code as number) === 0 || resultEv.data?.success === true ? 'succeeded' : 'failed'
      } else if (execution) {
        status = 'running'
      } else if (request) {
        status = 'running'
      }

      result.push({
        toolId,
        toolName,
        operation,
        request,
        permissionCheck: permission,
        policyCheck: policy,
        execution,
        result: resultEv,
        evidence: toolEvidence,
        status,
      })
    }

    return result
  }, [events, evidence])

  if (toolCalls.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Tool Call Inspector</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs px-4 text-center">
          No tool calls in this execution
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">Tool Call Inspector</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">{toolCalls.length} tool call(s)</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {toolCalls.map((tc) => {
          const isExpanded = expandedTool === tc.toolId
          const statusIcon = tc.status === 'succeeded' ? CheckCircle2 :
            tc.status === 'failed' ? XCircle :
            tc.status === 'running' ? Terminal : Wrench
          const StatusIcon = statusIcon
          const statusColor = tc.status === 'succeeded' ? 'text-emerald-600' :
            tc.status === 'failed' ? 'text-red-600' : 'text-blue-600'

          return (
            <div key={tc.toolId} className="border-b border-slate-100">
              <button
                onClick={() => setExpandedTool(isExpanded ? null : tc.toolId)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors"
              >
                {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                <StatusIcon size={14} className={statusColor} />
                <span className="text-sm font-medium text-slate-800">{tc.toolName}</span>
                <span className="text-xs text-slate-500 font-mono">· {tc.operation}</span>
                <span className={`ml-auto text-[11px] font-medium ${statusColor}`}>{tc.status}</span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2.5 bg-slate-50/50">
                  {/* Request */}
                  {tc.request && (
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Terminal size={11} /> Request
                      </div>
                      <pre className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-32 font-mono whitespace-pre-wrap break-all">
                        {formatData(tc.request.data)}
                      </pre>
                    </div>
                  )}

                  {/* Permission */}
                  {tc.permissionCheck && (
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Shield size={11} /> Permission Decision
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {(tc.permissionCheck.data?.allowed as boolean) ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <XCircle size={12} className="text-red-500" />
                        )}
                        <span className="text-slate-700">
                          {tc.permissionCheck.data?.allowed ? 'Allowed' : 'Denied'}
                        </span>
                        {tc.permissionCheck.data?.reason != null && (
                          <span className="text-slate-500">— {String(tc.permissionCheck.data.reason)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Policy */}
                  {tc.policyCheck && (
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <ShieldCheck size={11} /> Policy Decision
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {(tc.policyCheck.data?.allowed as boolean) ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <XCircle size={12} className="text-red-500" />
                        )}
                        <span className="text-slate-700">
                          {tc.policyCheck.data?.allowed ? 'Permitted' : 'Prohibited'}
                        </span>
                        {tc.policyCheck.data?.policies_applied != null && (
                          <span className="text-slate-500">
                            — {Array.isArray(tc.policyCheck.data.policies_applied) ?
                              (tc.policyCheck.data.policies_applied as string[]).join(', ') :
                              String(tc.policyCheck.data.policies_applied)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {tc.result && (
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <FileText size={11} /> Result
                      </div>
                      <pre className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2 overflow-x-auto max-h-40 font-mono whitespace-pre-wrap break-all">
                        {formatData(tc.result.data)}
                      </pre>
                    </div>
                  )}

                  {/* Evidence */}
                  {tc.evidence && (
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <ScrollText size={11} /> Evidence
                      </div>
                      <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">Type:</span>
                          <span className="text-slate-800 font-medium">{tc.evidence.evidence_type}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            tc.evidence.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                            tc.evidence.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{tc.evidence.status}</span>
                        </div>
                        <div className="text-xs text-slate-500">{tc.evidence.summary}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">hash: {tc.evidence.hash.slice(0, 32)}...</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
