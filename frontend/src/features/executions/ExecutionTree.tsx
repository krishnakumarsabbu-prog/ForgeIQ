import { useState, useMemo } from 'react'
import {
  ChevronRight, ChevronDown,
  Workflow, Layers, Network, Box, Bot, Wrench,
  CheckCircle2, XCircle, Loader2, Clock, RotateCcw, AlertOctagon, Ban,
} from 'lucide-react'
import type { ExecutionEvent } from '../../types'
import { buildExecutionTree, flattenTree, type TreeNode } from './executionTree'

interface ExecutionTreeProps {
  events: ExecutionEvent[]
  selectedNodeId?: string
  onSelectNode: (node: TreeNode) => void
}

const TYPE_ICON = {
  pipeline: Workflow,
  harness: Layers,
  graph: Network,
  node: Box,
  agent: Bot,
  tool: Wrench,
}

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  succeeded: CheckCircle2,
  completed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
  retrying: RotateCcw,
  waiting: Clock,
  blocked: Ban,
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: 'text-emerald-500',
  completed: 'text-emerald-500',
  failed: 'text-red-500',
  running: 'text-blue-500',
  pending: 'text-slate-400',
  retrying: 'text-yellow-500',
  waiting: 'text-amber-500',
  blocked: 'text-red-400',
}

export function ExecutionTree({ events, selectedNodeId, onSelectNode }: ExecutionTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']))

  const tree = useMemo(() => buildExecutionTree(events), [events])
  const flat = useMemo(() => flattenTree(tree, expanded), [tree, expanded])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-slate-900">Execution Tree</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">{events.length} events tracked</p>
      </div>
      <div className="py-1">
        {flat.map(node => {
          const Icon = TYPE_ICON[node.type] || Box
          const StatusIcon = STATUS_ICON[node.status] || Clock
          const statusColor = STATUS_COLOR[node.status] || 'text-slate-400'
          const hasChildren = node.children.length > 0
          const isExpanded = expanded.has(node.id)
          const isSelected = selectedNodeId === node.id

          return (
            <div
              key={node.id}
              className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer text-sm transition-colors ${
                isSelected ? 'bg-forgeiq-50 border-l-2 border-forgeiq-500' : 'hover:bg-slate-50 border-l-2 border-transparent'
              }`}
              style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
              onClick={() => onSelectNode(node)}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(node.id) }}
                  className="p-0.5 rounded hover:bg-slate-200 text-slate-400"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <Icon size={14} className="text-slate-500 flex-shrink-0" />
              <span className="flex-1 truncate text-slate-700 font-medium">{node.label}</span>
              <StatusIcon
                size={13}
                className={`${statusColor} flex-shrink-0 ${node.status === 'running' ? 'animate-spin' : ''}`}
              />
              {node.events.length > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">{node.events.length}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
