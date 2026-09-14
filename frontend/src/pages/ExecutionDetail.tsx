import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Clock, Coins, DollarSign, RotateCcw,
  AlertCircle, CheckCircle2, XCircle, Server, Hash,
  Workflow, Network, Activity, Wifi, WifiOff, Loader2,
  ChevronRight, ChevronDown, GitBranch, ScrollText, Wrench,
  ShieldCheck, ArrowUpCircle, FileCheck,
} from 'lucide-react'
import { useExecution, useExecutionEvents, useEvidenceTimeline, useApprovals, useDecideExecutionApproval, useEscalationTargets, useResumeExecution } from '../hooks/useQueries'
import { useExecutionSSE, type SSEConnectionState } from '../hooks/useExecutionSSE'
import { useHarness, useGraph } from '../hooks/useQueries'
import { PageHeader, StatusBadge, RiskBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Approval } from '../types'
import { ExecutionTree } from '../features/executions/ExecutionTree'
import { LiveExecutionGraph } from '../features/executions/LiveExecutionGraph'
import { CurrentNodePanel } from '../features/executions/CurrentNodePanel'
import { EventStream } from '../features/executions/EventStream'
import { LoopVisualization } from '../features/executions/LoopVisualization'
import { ToolCallInspector } from '../features/executions/ToolCallInspector'
import type { TreeNode } from '../features/executions/executionTreeUtils'
import type { ExecutionEvent } from '../types'

type BottomTab = 'events' | 'loops' | 'tools' | 'approvals'

const CONNECTION_LABEL: Record<SSEConnectionState, { text: string; color: string; icon: typeof Wifi }> = {
  connecting: { text: 'Connecting...', color: 'text-amber-600', icon: Loader2 },
  connected: { text: 'Live', color: 'text-emerald-600', icon: Wifi },
  disconnected: { text: 'Reconnecting...', color: 'text-amber-600', icon: WifiOff },
  error: { text: 'Connection Error', color: 'text-red-600', icon: WifiOff },
}

export default function ExecutionDetail() {
  const { id } = useParams<{ id: string }>()
  const executionId = id || ''

  const { data: execution, isLoading } = useExecution(executionId)
  const { data: polledEvents } = useExecutionEvents(executionId)
  const { data: evidence } = useEvidenceTimeline(executionId)
  const { events: sseEvents, connectionState, reconnect } = useExecutionSSE(executionId)

  // Use SSE events when connected, fall back to polled events
  const events: ExecutionEvent[] = useMemo(() => {
    if (sseEvents.length > 0) return sseEvents
    return polledEvents || []
  }, [sseEvents, polledEvents])

  // Resolve harness and graph
  const harnessId = execution?.harness_id
  const { data: harness } = useHarness(harnessId || '')
  const graphId = harness?.graph_id
  const { data: graph } = useGraph(graphId || '')

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | undefined>()
  const [bottomTab, setBottomTab] = useState<BottomTab>('events')
  const [treeCollapsed, setTreeCollapsed] = useState(false)

  const { data: approvals } = useApprovals()
  const { data: escalationTargets } = useEscalationTargets()
  const decideApprovalMutation = useDecideExecutionApproval()
  const resumeMutation = useResumeExecution()
  const [approvalDrawer, setApprovalDrawer] = useState<Approval | null>(null)
  const [decidedBy, setDecidedBy] = useState('')
  const [reason, setReason] = useState('')
  const [escalateTo, setEscalateTo] = useState('')

  const executionApprovals = (approvals ?? []).filter(a => a.execution_id === executionId)
  const pendingApprovals = executionApprovals.filter(a => a.status === 'pending')
  const isWaiting = execution?.status === 'WAITING_FOR_APPROVAL' || execution?.status === 'AWAITING_APPROVAL'

  // Auto-select current node from execution
  useEffect(() => {
    if (!selectedNode && execution?.current_node) {
      setSelectedGraphNodeId(execution.current_node)
    }
  }, [execution?.current_node, selectedNode])

  const handleTreeNodeSelect = (node: TreeNode) => {
    setSelectedNode(node)
    if (node.type === 'node' && node.refId) {
      setSelectedGraphNodeId(node.refId)
    }
  }

  const handleGraphNodeClick = (nodeId: string) => {
    setSelectedGraphNodeId(nodeId)
    // Try to find matching tree node
    if (selectedNode?.refId !== nodeId) {
      // The tree node will be selected via the tree itself
    }
  }

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

  const conn = CONNECTION_LABEL[connectionState]
  const ConnIcon = conn.icon
  const duration = execution.started_at && execution.completed_at
    ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()
    : execution.started_at
    ? Date.now() - new Date(execution.started_at).getTime()
    : 0

  const hasLoopEvents = events.some(e =>
    e.event_type === 'LOOP_TRIGGERED' || e.event_type === 'RETRY_STARTED' ||
    e.event_type === 'EVALUATION_STARTED' || e.event_type === 'EVALUATION_COMPLETED'
  )
  const hasToolEvents = events.some(e => e.tool_id)
  const hasApprovalEvents = events.some(e =>
    e.event_type === 'ApprovalRequested' || e.event_type === 'ApprovalGranted' ||
    e.event_type === 'ApprovalRejected' || e.event_type === 'ApprovalEscalated' ||
    e.event_type === 'ExecutionWaitingForApproval'
  )

  const handleDecide = (decision: string) => {
    if (!approvalDrawer || !decidedBy) return
    if (decision === 'escalated') {
      decideApprovalMutation.mutate(
        { executionId, approvalId: approvalDrawer.id, body: { decided_by: decidedBy, decision, reason, escalate_to: escalateTo || undefined } },
        { onSuccess: () => { setApprovalDrawer(null); setDecidedBy(''); setReason(''); setEscalateTo('') } },
      )
    } else {
      decideApprovalMutation.mutate(
        { executionId, approvalId: approvalDrawer.id, body: { decided_by: decidedBy, decision, reason } },
        { onSuccess: () => { setApprovalDrawer(null); setDecidedBy(''); setReason('') } },
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: execution metadata */}
      <div className="border-b border-slate-200 bg-white px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link
              to="/executions"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            <h1 className="text-base font-semibold text-slate-900">
              Execution {execution.id.slice(0, 12)}
            </h1>
            <StatusBadge status={execution.status} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reconnect}
              className={`flex items-center gap-1.5 text-xs font-medium ${conn.color}`}
              title="Reconnect SSE stream"
            >
              <ConnIcon size={13} className={connectionState === 'connecting' ? 'animate-spin' : ''} />
              {conn.text}
            </button>
          </div>
        </div>

        {/* Metric strip */}
        <div className="flex items-center gap-5 text-xs">
          <MetricItem icon={<Workflow size={12} className="text-slate-400" />} label="Pipeline" value={execution.pipeline_id?.slice(0, 12) || '—'} />
          <MetricItem icon={<Server size={12} className="text-slate-400" />} label="Application" value={execution.application_id?.slice(0, 12) || '—'} />
          <MetricItem icon={<Clock size={12} className="text-slate-400" />} label="Duration" value={duration > 0 ? formatDuration(duration) : '—'} />
          <MetricItem icon={<DollarSign size={12} className="text-slate-400" />} label="Cost" value={`$${(execution.cost_cents / 100).toFixed(4)}`} />
          <MetricItem icon={<Coins size={12} className="text-slate-400" />} label="Tokens" value={execution.tokens_used.toLocaleString()} />
          <MetricItem icon={<RotateCcw size={12} className="text-slate-400" />} label="Retries" value={String(execution.retry_count)} />
          <MetricItem icon={<Hash size={12} className="text-slate-400" />} label="Progress" value={`${execution.progress}%`} />
          <MetricItem icon={<Activity size={12} className="text-slate-400" />} label="Events" value={String(events.length)} />
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              execution.status === 'FAILED' ? 'bg-red-500' :
              execution.status === 'COMPLETED' ? 'bg-emerald-500' :
              'bg-forgeiq-600'
            }`}
            style={{ width: `${execution.progress}%` }}
          />
        </div>
      </div>

      {/* Error banner */}
      {execution.error_message && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex-shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-sm font-semibold text-red-900">Execution Failed</span>
              <p className="text-sm text-red-700">{execution.error_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Approval waiting banner */}
      {isWaiting && pendingApprovals.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-amber-900">Waiting for Approval</span>
                <p className="text-sm text-amber-700">
                  {pendingApprovals.length} approval{pendingApprovals.length > 1 ? 's' : ''} pending
                  {pendingApprovals[0] && ` — ${pendingApprovals[0].approval_type.replace(/_/g, ' ')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingApprovals.map(a => (
                <button
                  key={a.id}
                  onClick={() => setApprovalDrawer(a)}
                  className="fi-btn-primary bg-amber-600 hover:bg-amber-700 text-xs"
                >
                  Review {a.approval_type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Changes requested banner */}
      {execution.status === 'CHANGES_REQUESTED' && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-blue-900">Changes Requested</span>
                <p className="text-sm text-blue-700">The execution was paused with requested changes. You can resume it when ready.</p>
              </div>
            </div>
            <button
              onClick={() => resumeMutation.mutate(executionId)}
              disabled={resumeMutation.isPending}
              className="fi-btn-primary text-xs"
            >
              <Play size={12} className="inline mr-1" />
              Resume Execution
            </button>
          </div>
        </div>
      )}

      {/* Main content: tree | graph | right panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Execution Tree */}
        <div className={`border-r border-slate-200 bg-white flex flex-col ${treeCollapsed ? 'w-10' : 'w-64'} flex-shrink-0 transition-all`}>
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2 py-1.5">
            {!treeCollapsed && (
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tree</span>
            )}
            <button
              onClick={() => setTreeCollapsed(!treeCollapsed)}
              className="p-1 rounded hover:bg-slate-200 text-slate-400"
            >
              {treeCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          {!treeCollapsed && (
            <div className="flex-1 min-h-0">
              <ExecutionTree
                events={events}
                selectedNodeId={selectedNode?.id}
                onSelectNode={handleTreeNodeSelect}
              />
            </div>
          )}
        </div>

        {/* Center: Live Graph */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative">
            <LiveExecutionGraph
              graph={graph}
              events={events}
              onNodeClick={handleGraphNodeClick}
              selectedNodeId={selectedGraphNodeId}
            />
          </div>

          {/* Bottom: Tabbed panel */}
          <div className="h-64 flex-shrink-0 border-t border-slate-200 bg-white flex flex-col">
            <div className="flex items-center gap-1 px-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
              <BottomTabButton
                active={bottomTab === 'events'}
                onClick={() => setBottomTab('events')}
                icon={<Activity size={13} />}
                label="Event Stream"
                count={events.length}
              />
              <BottomTabButton
                active={bottomTab === 'loops'}
                onClick={() => setBottomTab('loops')}
                icon={<RotateCcw size={13} />}
                label="Loops"
                count={hasLoopEvents ? undefined : 0}
              />
              <BottomTabButton
                active={bottomTab === 'tools'}
                onClick={() => setBottomTab('tools')}
                icon={<Wrench size={13} />}
                label="Tool Calls"
                count={hasToolEvents ? undefined : 0}
              />
              <BottomTabButton
                active={bottomTab === 'approvals'}
                onClick={() => setBottomTab('approvals')}
                icon={<ShieldCheck size={13} />}
                label="Approvals"
                count={executionApprovals.length || undefined}
              />
            </div>
            <div className="flex-1 min-h-0">
              {bottomTab === 'events' && <EventStream events={events} />}
              {bottomTab === 'loops' && <LoopVisualization events={events} />}
              {bottomTab === 'tools' && <ToolCallInspector events={events} evidence={evidence || []} />}
              {bottomTab === 'approvals' && (
                <div className="h-full overflow-y-auto p-3 space-y-2">
                  {executionApprovals.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">No approvals for this execution</div>
                  ) : executionApprovals.map(a => (
                    <div
                      key={a.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        a.status === 'pending' ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' :
                        a.status === 'approved' ? 'border-emerald-200 bg-emerald-50' :
                        a.status === 'rejected' ? 'border-red-200 bg-red-50' :
                        a.status === 'escalated' ? 'border-orange-200 bg-orange-50' :
                        'border-slate-200 bg-slate-50'
                      }`}
                      onClick={() => a.status === 'pending' ? setApprovalDrawer(a) : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{a.approval_type.replace(/_/g, ' ')}</span>
                          <StatusBadge status={a.status} />
                          <RiskBadge level={a.risk_level} />
                        </div>
                        {a.status === 'pending' && (
                          <span className="text-xs text-amber-600 font-medium">Click to review</span>
                        )}
                      </div>
                      {a.requested_action && <p className="text-xs text-slate-600 mt-1">{a.requested_action}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>By: {a.requested_by}</span>
                        <span>{new Date(a.requested_at).toLocaleString()}</span>
                        {a.decided_by && <span>Decided by: {a.decided_by}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Current Node Panel */}
        <div className="w-80 border-l border-slate-200 bg-white flex-shrink-0 flex flex-col min-h-0">
          <CurrentNodePanel
            node={selectedNode}
            events={events}
            evidence={evidence || []}
          />
        </div>
      </div>

      {/* Approval Decision Drawer */}
      <SideDrawer
        open={!!approvalDrawer}
        onClose={() => { setApprovalDrawer(null); setDecidedBy(''); setReason(''); setEscalateTo('') }}
        title="Review Approval"
        subtitle={approvalDrawer?.approval_type.replace(/_/g, ' ')}
        width="480px"
        footer={
          approvalDrawer?.status === 'pending' ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={decidedBy}
                onChange={e => setDecidedBy(e.target.value)}
                placeholder="Your name"
                className="fi-input flex-1 py-1.5 text-sm"
              />
              <button
                disabled={!decidedBy || decideApprovalMutation.isPending}
                onClick={() => handleDecide('approved')}
                className="fi-btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                Approve
              </button>
              <button
                disabled={!decidedBy || decideApprovalMutation.isPending}
                onClick={() => handleDecide('rejected')}
                className="fi-btn-secondary bg-red-50 text-red-700 border-red-200 hover:bg-red-100 text-xs"
              >
                Reject
              </button>
              <button
                disabled={!decidedBy || decideApprovalMutation.isPending}
                onClick={() => handleDecide('changes_requested')}
                className="fi-btn-secondary text-xs"
              >
                Changes
              </button>
            </div>
          ) : undefined
        }
      >
        {approvalDrawer && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={approvalDrawer.status} />
              <RiskBadge level={approvalDrawer.risk_level} />
            </div>
            <DetailsPanel
              items={[
                { label: 'Type', value: approvalDrawer.approval_type.replace(/_/g, ' ') },
                { label: 'Requested By', value: approvalDrawer.requested_by },
                { label: 'Requested At', value: new Date(approvalDrawer.requested_at).toLocaleString() },
                { label: 'Requested Action', value: approvalDrawer.requested_action || '—' },
                { label: 'Reason', value: approvalDrawer.reason || '—' },
                { label: 'Impact', value: approvalDrawer.impact || '—' },
                { label: 'Node', value: approvalDrawer.node_id || '—' },
                { label: 'Harness', value: approvalDrawer.harness_id || '—' },
              ]}
              columns={2}
            />
            {approvalDrawer.status === 'pending' && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-xs font-medium text-slate-600">Decision Reason</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Provide a reason for your decision..."
                    className="fi-input min-h-[60px] text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Escalate To (if escalating)</label>
                  <select
                    value={escalateTo}
                    onChange={e => setEscalateTo(e.target.value)}
                    className="fi-input py-1.5 text-sm"
                  >
                    <option value="">Select target...</option>
                    {(escalationTargets ?? []).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <button
                  disabled={!decidedBy || decideApprovalMutation.isPending}
                  onClick={() => handleDecide('escalated')}
                  className="fi-btn-secondary bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs w-full"
                >
                  <ArrowUpCircle size={14} className="inline mr-1" />
                  Escalate Approval
                </button>
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </div>
  )
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-slate-400 font-medium">{label}:</span>
      <span className="text-slate-700 font-mono">{value}</span>
    </div>
  )
}

function BottomTabButton({
  active, onClick, icon, label, count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
        active
          ? 'border-forgeiq-600 text-forgeiq-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-0.5 text-[10px] text-slate-400">{count}</span>
      )}
      {count === 0 && (
        <span className="ml-0.5 text-[10px] text-slate-300">0</span>
      )}
    </button>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}m ${sec}s`
}
