import { useMemo } from 'react'
import {
  Box, Bot, Cpu, FileText, ArrowRight, Wrench,
  Coins, Clock, ShieldCheck, ScrollText, Hash,
} from 'lucide-react'
import type { ExecutionEvent, Evidence } from '../../types'
import type { TreeNode } from './executionTree'

interface CurrentNodePanelProps {
  node: TreeNode | null
  events: ExecutionEvent[]
  evidence: Evidence[]
}

function extractFromEvents(events: ExecutionEvent[], keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const ev of events) {
    if (!ev.data) continue
    for (const key of keys) {
      if (key in ev.data && !(key in result)) {
        result[key] = ev.data[key]
      }
    }
  }
  return result
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function DataBlock({ label, value }: { label: string; value: unknown }) {
  const formatted = formatValue(value)
  const isMultiline = formatted.length > 60 || formatted.includes('\n')

  return (
    <div>
      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      {isMultiline ? (
        <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto max-h-32 font-mono whitespace-pre-wrap break-all">
          {formatted}
        </pre>
      ) : (
        <div className="text-sm text-slate-900">{formatted}</div>
      )}
    </div>
  )
}

export function CurrentNodePanel({ node, events: allEvents, evidence }: CurrentNodePanelProps) {
  const nodeEvents = useMemo(() => {
    if (!node) return []
    return allEvents.filter(e => {
      if (node.type === 'pipeline') return !e.harness_id && !e.node_id && !e.agent_id && !e.tool_id
      if (node.type === 'harness') return e.harness_id === node.refId
      if (node.type === 'node') return e.node_id === node.refId
      if (node.type === 'agent') return e.agent_id === node.refId
      if (node.type === 'tool') return e.tool_id === node.refId
      return false
    })
  }, [node, allEvents])

  const nodeEvidence = useMemo(() => {
    if (!node) return []
    return evidence.filter(e => {
      if (node.type === 'harness') return e.harness_id === node.refId
      if (node.type === 'node') return e.node_id === node.refId
      if (node.type === 'agent') return e.agent_id === node.refId
      if (node.type === 'tool') return e.tool_id === node.refId
      return false
    })
  }, [node, evidence])

  const extracted = useMemo(() => {
    return extractFromEvents(nodeEvents, [
      'agent_name', 'agent_version', 'model', 'model_provider',
      'context', 'input', 'output', 'inputs', 'outputs',
      'tools', 'duration_ms', 'duration_seconds',
      'input_tokens', 'output_tokens', 'total_tokens',
      'cost_cents', 'policy', 'policy_decision', 'policies_applied',
      'node_type', 'node_label', 'operation', 'tool_name',
      'success', 'error', 'result',
    ])
  }, [nodeEvents])

  if (!node) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Current Node</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs px-4 text-center">
          Select a node from the tree or graph to inspect details
        </div>
      </div>
    )
  }

  const tokens = (extracted.total_tokens as number) ||
    ((extracted.input_tokens as number) || 0) + ((extracted.output_tokens as number) || 0)
  const costCents = (extracted.cost_cents as number) || 0
  const durationMs = (extracted.duration_ms as number) || (extracted.duration_seconds as number) ? (extracted.duration_seconds as number) * 1000 : undefined

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          {node.type === 'agent' ? <Bot size={14} className="text-forgeiq-600" /> :
           node.type === 'tool' ? <Wrench size={14} className="text-amber-600" /> :
           node.type === 'harness' ? <Box size={14} className="text-slate-600" /> :
           <Box size={14} className="text-slate-600" />}
          <h3 className="text-sm font-semibold text-slate-900">{node.label}</h3>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 capitalize">{node.type} · {node.status}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Agent info */}
        {node.type === 'agent' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <Bot size={11} /> Agent
                </div>
                <div className="text-sm text-slate-900">{formatValue(extracted.agent_name)}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Version</div>
                <div className="text-sm text-slate-900">{formatValue(extracted.agent_version)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <Cpu size={11} /> Model
                </div>
                <div className="text-sm text-slate-900">{formatValue(extracted.model)}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Provider</div>
                <div className="text-sm text-slate-900">{formatValue(extracted.model_provider)}</div>
              </div>
            </div>
          </>
        )}

        {/* Tool info */}
        {node.type === 'tool' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <Wrench size={11} /> Tool
              </div>
              <div className="text-sm text-slate-900">{formatValue(extracted.tool_name)}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Operation</div>
              <div className="text-sm text-slate-900">{formatValue(extracted.operation)}</div>
            </div>
          </div>
        )}

        {/* Context */}
        {extracted.context != null && (
          <DataBlock label="Context" value={extracted.context} />
        )}

        {/* Input / Output */}
        <div className="grid grid-cols-1 gap-3">
          {(extracted.input != null || extracted.inputs != null) && (
            <DataBlock label="Input" value={extracted.input ?? extracted.inputs} />
          )}
          {(extracted.output != null || extracted.outputs != null || extracted.result != null) && (
            <DataBlock label="Output" value={extracted.output ?? extracted.outputs ?? extracted.result} />
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Coins size={11} /> Tokens
            </div>
            <div className="text-sm text-slate-900 font-mono">{tokens > 0 ? tokens.toLocaleString() : '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Clock size={11} /> Duration
            </div>
            <div className="text-sm text-slate-900 font-mono">
              {durationMs ? `${durationMs.toFixed(0)}ms` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Hash size={11} /> Cost
            </div>
            <div className="text-sm text-slate-900 font-mono">
              {costCents > 0 ? `$${(costCents / 100).toFixed(4)}` : '—'}
            </div>
          </div>
        </div>

        {/* Policy */}
        {(extracted.policy != null || extracted.policy_decision != null || extracted.policies_applied != null) && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <ShieldCheck size={11} /> Policy
            </div>
            <div className="text-sm text-slate-700">
              {formatValue(extracted.policy_decision ?? extracted.policy ?? extracted.policies_applied)}
            </div>
          </div>
        )}

        {/* Evidence */}
        {nodeEvidence.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <ScrollText size={11} /> Evidence ({nodeEvidence.length})
            </div>
            <div className="space-y-1">
              {nodeEvidence.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    ev.status === 'SUCCESS' ? 'bg-emerald-500' :
                    ev.status === 'FAILED' ? 'bg-red-500' :
                    ev.status === 'WARNING' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <span className="text-slate-700 font-medium">{ev.evidence_type}</span>
                  <span className="text-slate-400 truncate">{ev.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw events for this node */}
        {nodeEvents.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <FileText size={11} /> Events ({nodeEvents.length})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {nodeEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-400 font-mono shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                  <ArrowRight size={10} className="text-slate-300 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-slate-700 font-medium">{ev.event_type}</span>
                    {ev.message && <span className="text-slate-500 ml-1">— {ev.message}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
