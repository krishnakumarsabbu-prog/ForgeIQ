import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Bot, Wrench, ShieldCheck, CheckSquare, FileCheck, GitBranch,
  Split, Merge, TestTube, Server, Package, ScrollText, UserCheck,
  RotateCcw, AlertOctagon, ArrowUpCircle, Loader2, CheckCircle2, XCircle, Clock,
} from 'lucide-react'

export type ExecutionNodeData = {
  node_type: string
  label: string
  ref_id?: string
  execution_status?: string
  is_entry?: boolean
  is_terminal?: boolean
}

const NODE_ICON: Record<string, typeof Bot> = {
  agent: Bot,
  skill: FileCheck,
  tool: Wrench,
  approval: CheckSquare,
  policy: ShieldCheck,
  condition: GitBranch,
  decision: GitBranch,
  parallel: Split,
  merge: Merge,
  verification: TestTube,
  environment: Server,
  artifact: Package,
  evidence: ScrollText,
  human_task: UserCheck,
  retry: RotateCcw,
  failure_handler: AlertOctagon,
  escalation: ArrowUpCircle,
}

const STATUS_CONFIG: Record<string, { ring: string; badge: string; badgeText: string; icon: typeof Loader2 | null }> = {
  pending: { ring: '', badge: 'bg-slate-100', badgeText: 'text-slate-500', icon: Clock },
  ready: { ring: 'ring-2 ring-amber-300', badge: 'bg-amber-100', badgeText: 'text-amber-600', icon: Clock },
  running: { ring: 'ring-2 ring-blue-400 animate-pulse', badge: 'bg-blue-100', badgeText: 'text-blue-600', icon: Loader2 },
  succeeded: { ring: 'ring-2 ring-emerald-400', badge: 'bg-emerald-100', badgeText: 'text-emerald-600', icon: CheckCircle2 },
  failed: { ring: 'ring-2 ring-red-400', badge: 'bg-red-100', badgeText: 'text-red-600', icon: XCircle },
  retrying: { ring: 'ring-2 ring-yellow-400 animate-pulse', badge: 'bg-yellow-100', badgeText: 'text-yellow-600', icon: RotateCcw },
  blocked: { ring: 'ring-2 ring-red-300', badge: 'bg-red-100', badgeText: 'text-red-500', icon: AlertOctagon },
  waiting: { ring: 'ring-2 ring-amber-400', badge: 'bg-amber-100', badgeText: 'text-amber-600', icon: Clock },
  skipped: { ring: '', badge: 'bg-slate-50', badgeText: 'text-slate-400', icon: null },
}

function ExecutionGraphNodeBase({ data, selected }: NodeProps) {
  const d = data as unknown as ExecutionNodeData
  const Icon = NODE_ICON[d.node_type] || GitBranch
  const statusCfg = STATUS_CONFIG[d.execution_status || 'pending'] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  return (
    <div
      className={`relative rounded-lg border-2 bg-white shadow-sm transition-all min-w-[160px] ${
        selected ? 'border-forgeiq-500 shadow-md' : 'border-slate-200'
      } ${statusCfg.ring}`}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-400 !border-slate-500" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <Icon size={14} className="text-slate-600" />
        <span className="text-xs font-semibold text-slate-700 uppercase">{d.node_type}</span>
        {d.is_entry && <span className="ml-auto text-[9px] font-bold text-forgeiq-600 uppercase">Entry</span>}
        {d.is_terminal && <span className="ml-auto text-[9px] font-bold text-rose-600 uppercase">Exit</span>}
      </div>
      <div className="px-3 py-2">
        <div className="text-sm font-medium text-slate-900 truncate">{d.label}</div>
        {d.execution_status && d.execution_status !== 'pending' && (
          <div className="mt-1 flex items-center gap-1">
            {StatusIcon && <StatusIcon size={11} className={`${statusCfg.badgeText} ${d.execution_status === 'running' ? 'animate-spin' : ''}`} />}
            <span className={`text-[11px] font-medium ${statusCfg.badgeText}`}>{d.execution_status}</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-400 !border-slate-500" />
    </div>
  )
}

export const executionNodeTypes = {
  execNode: memo(ExecutionGraphNodeBase),
} as unknown as Record<string, typeof ExecutionGraphNodeBase>
