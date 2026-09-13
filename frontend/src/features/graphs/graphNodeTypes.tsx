import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Bot, Wrench, ShieldCheck, CheckSquare, FileCheck, GitBranch,
  Split, Merge, TestTube, Server, Package, ScrollText, UserCheck,
  RotateCcw, AlertOctagon, ArrowUpCircle,
} from 'lucide-react'

export type GraphNodeData = {
  node_type: string
  label: string
  ref_id?: string
  config: Record<string, unknown>
  description?: string
  is_entry?: boolean
  is_terminal?: boolean
  execution_status?: string
  selected?: boolean
  validationErrors?: string[]
}

const NODE_CONFIG: Record<string, { icon: typeof Bot; color: string; bg: string; border: string; label: string }> = {
  agent:           { icon: Bot,           color: 'text-forgeiq-700', bg: 'bg-forgeiq-50',  border: 'border-forgeiq-300',  label: 'Agent' },
  skill:           { icon: FileCheck,     color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300',    label: 'Skill' },
  tool:            { icon: Wrench,        color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300',   label: 'Tool' },
  approval:        { icon: CheckSquare,   color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-300',  label: 'Approval' },
  policy:          { icon: ShieldCheck,   color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-300',     label: 'Policy' },
  condition:       { icon: GitBranch,     color: 'text-slate-700',  bg: 'bg-slate-50',   border: 'border-slate-300',   label: 'Condition' },
  decision:        { icon: GitBranch,     color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-300',  label: 'Decision' },
  parallel:        { icon: Split,         color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-300',    label: 'Parallel' },
  merge:           { icon: Merge,         color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-300',    label: 'Merge' },
  verification:    { icon: TestTube,      color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', label: 'Verification' },
  environment:     { icon: Server,        color: 'text-cyan-700',   bg: 'bg-cyan-50',    border: 'border-cyan-300',    label: 'Environment' },
  artifact:        { icon: Package,       color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-300',  label: 'Artifact' },
  evidence:        { icon: ScrollText,    color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-300',    label: 'Evidence' },
  human_task:      { icon: UserCheck,     color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-300',  label: 'Human Task' },
  retry:           { icon: RotateCcw,     color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-300',  label: 'Retry' },
  failure_handler: { icon: AlertOctagon,  color: 'text-red-800',    bg: 'bg-red-50',     border: 'border-red-400',     label: 'Failure Handler' },
  escalation:      { icon: ArrowUpCircle, color: 'text-pink-700',   bg: 'bg-pink-50',    border: 'border-pink-300',    label: 'Escalation' },
}

const STATUS_RING: Record<string, string> = {
  running: 'ring-2 ring-blue-400',
  succeeded: 'ring-2 ring-emerald-400',
  failed: 'ring-2 ring-red-400',
  waiting: 'ring-2 ring-amber-400',
  blocked: 'ring-2 ring-red-300',
  retrying: 'ring-2 ring-yellow-400',
  skipped: 'ring-2 ring-slate-300',
}

function GraphNodeBase({ data, selected }: NodeProps) {
  const d = data as unknown as GraphNodeData
  const cfg = NODE_CONFIG[d.node_type] || NODE_CONFIG.condition
  const Icon = cfg.icon
  const hasErrors = d.validationErrors && d.validationErrors.length > 0
  const statusRing = d.execution_status ? STATUS_RING[d.execution_status] || '' : ''

  return (
    <div
      className={`relative rounded-lg border-2 bg-white shadow-sm transition-all min-w-[170px] ${
        selected ? 'border-forgeiq-500 shadow-md ring-2 ring-forgeiq-200' :
        hasErrors ? 'border-red-400' :
        statusRing ? `${cfg.border} ${statusRing}` :
        cfg.border
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-400 !border-slate-500" />
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${cfg.border} ${cfg.bg} rounded-t-md`}>
        <Icon size={14} className={cfg.color} />
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        {d.is_entry && <span className="ml-auto text-[9px] font-bold text-forgeiq-600 uppercase">Entry</span>}
        {d.is_terminal && <span className="ml-auto text-[9px] font-bold text-rose-600 uppercase">Exit</span>}
      </div>
      <div className="px-3 py-2">
        <div className="text-sm font-medium text-slate-900 truncate">{d.label}</div>
        {d.ref_id && (
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">ref: {d.ref_id.slice(0, 16)}...</div>
        )}
        {hasErrors && (
          <div className="mt-1 flex items-center gap-1">
            <AlertOctagon size={11} className="text-red-500" />
            <span className="text-[11px] text-red-600">{d.validationErrors!.length} issue(s)</span>
          </div>
        )}
        {d.execution_status === 'running' && (
          <div className="mt-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] text-blue-600 font-medium">running</span>
          </div>
        )}
        {d.execution_status === 'succeeded' && (
          <div className="mt-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-emerald-600 font-medium">succeeded</span>
          </div>
        )}
        {d.execution_status === 'failed' && (
          <div className="mt-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[11px] text-red-600 font-medium">failed</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-400 !border-slate-500" />
    </div>
  )
}

export const graphNodeTypes = { graphNode: memo(GraphNodeBase) } as unknown as Record<string, typeof GraphNodeBase>

export const GRAPH_NODE_PALETTE: { type: string; label: string; icon: typeof Bot; color: string; bg: string }[] = [
  { type: 'agent',           label: 'Agent',           icon: Bot,           color: 'text-forgeiq-700', bg: 'bg-forgeiq-50' },
  { type: 'skill',           label: 'Skill',           icon: FileCheck,     color: 'text-blue-700',    bg: 'bg-blue-50' },
  { type: 'tool',            label: 'Tool',            icon: Wrench,        color: 'text-amber-700',  bg: 'bg-amber-50' },
  { type: 'approval',        label: 'Approval',        icon: CheckSquare,   color: 'text-orange-700', bg: 'bg-orange-50' },
  { type: 'policy',          label: 'Policy',          icon: ShieldCheck,   color: 'text-red-700',    bg: 'bg-red-50' },
  { type: 'condition',       label: 'Condition',       icon: GitBranch,     color: 'text-slate-700',  bg: 'bg-slate-50' },
  { type: 'decision',        label: 'Decision',        icon: GitBranch,     color: 'text-indigo-700', bg: 'bg-indigo-50' },
  { type: 'parallel',        label: 'Parallel',        icon: Split,         color: 'text-teal-700',   bg: 'bg-teal-50' },
  { type: 'merge',           label: 'Merge',           icon: Merge,         color: 'text-teal-700',   bg: 'bg-teal-50' },
  { type: 'verification',    label: 'Verification',    icon: TestTube,      color: 'text-emerald-700',bg: 'bg-emerald-50' },
  { type: 'environment',     label: 'Environment',     icon: Server,        color: 'text-cyan-700',   bg: 'bg-cyan-50' },
  { type: 'artifact',        label: 'Artifact',        icon: Package,       color: 'text-violet-700', bg: 'bg-violet-50' },
  { type: 'evidence',        label: 'Evidence',        icon: ScrollText,    color: 'text-rose-700',   bg: 'bg-rose-50' },
  { type: 'human_task',      label: 'Human Task',      icon: UserCheck,     color: 'text-orange-700', bg: 'bg-orange-50' },
  { type: 'retry',           label: 'Retry',           icon: RotateCcw,     color: 'text-yellow-700', bg: 'bg-yellow-50' },
  { type: 'failure_handler', label: 'Failure Handler', icon: AlertOctagon, color: 'text-red-800',    bg: 'bg-red-50' },
  { type: 'escalation',      label: 'Escalation',      icon: ArrowUpCircle, color: 'text-pink-700',   bg: 'bg-pink-50' },
]
