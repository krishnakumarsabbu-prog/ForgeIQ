import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Repeat, Zap, AlertTriangle, ArrowUpCircle, Plus, Clock, DollarSign,
  Activity, GitBranch, Shield, RefreshCw, CheckCircle2, XCircle,
  ArrowRight, Settings2,
} from 'lucide-react'
import { useLoops, useDeleteLoop, usePublishLoop } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Loop, LoopStep } from '../types'

const LOOP_TYPE_META: Record<string, { color: string; icon: typeof Repeat }> = {
  retry: { color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: RefreshCw },
  fix: { color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: GitBranch },
  validation: { color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle2 },
  security_remediation: { color: 'bg-red-50 text-red-700 border border-red-200', icon: Shield },
  deployment_verification: { color: 'bg-purple-50 text-purple-700 border border-purple-200', icon: Activity },
  rollback: { color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: ArrowUpCircle },
  incident_remediation: { color: 'bg-rose-50 text-rose-700 border border-rose-200', icon: AlertTriangle },
  human_escalation: { color: 'bg-slate-100 text-slate-700 border border-slate-300', icon: ArrowUpCircle },
  continuous_improvement: { color: 'bg-teal-50 text-teal-700 border border-teal-200', icon: Activity },
}

const STEP_TYPE_ICONS: Record<string, typeof Zap> = {
  trigger: Zap,
  evaluate: Activity,
  condition: GitBranch,
  action: Settings2,
  decision: GitBranch,
  exit: CheckCircle2,
  escalation: ArrowUpCircle,
  failure_handler: XCircle,
}

function formatBackoff(strategy: string, initial: number, max: number): string {
  if (strategy === 'none') return 'No backoff'
  if (strategy === 'fixed') return `Fixed ${initial}ms`
  if (strategy === 'linear') return `Linear ${initial}ms -> ${max}ms`
  return `Exponential ${initial}ms -> ${max}ms`
}

function formatCost(cents: number): string {
  return cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}c`
}

export default function LoopEngineeringPage() {
  const navigate = useNavigate()
  const { data: loops, isLoading } = useLoops()
  const deleteLoop = useDeleteLoop()
  const publishLoop = usePublishLoop()
  const [selectedLoop, setSelectedLoop] = useState<Loop | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = (loop: Loop) => {
    setSelectedLoop(loop)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (selectedLoop) {
      deleteLoop.mutate(selectedLoop.id)
      setShowDeleteConfirm(false)
      setSelectedLoop(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Loop Engineering"
        description="Adaptive execution loops with triggers, evaluation, retry, escalation, and exit conditions"
        actions={
          <button
            onClick={() => navigate('/loop-builder')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 transition-colors"
          >
            <Plus size={15} />
            New Loop
          </button>
        }
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
                  <th className="text-center">Steps</th>
                  <th className="text-right">Max Iter.</th>
                  <th className="text-left">Backoff</th>
                  <th className="text-left">Exit Condition</th>
                  <th className="text-left">Failure Handling</th>
                  <th className="text-left">Escalation</th>
                  <th className="text-right">Cost Limit</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loops.map((l: Loop) => {
                  const meta = LOOP_TYPE_META[l.loop_type] || LOOP_TYPE_META.retry
                  const Icon = meta.icon
                  return (
                    <tr
                      key={l.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedLoop(l)}
                    >
                      <td className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-slate-400" />
                          {l.display_name || l.name}
                        </div>
                      </td>
                      <td>
                        <span className={`fi-badge ${meta.color}`}>
                          <Icon size={12} className="mr-1 inline" />
                          {l.loop_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-slate-400" />
                          {l.trigger.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="text-center text-slate-600 font-mono">{l.steps?.length || 0}</td>
                      <td className="text-right text-slate-600 font-mono">{l.max_iterations}</td>
                      <td className="text-slate-600 text-xs">{formatBackoff(l.backoff_strategy, l.backoff_initial_ms, l.backoff_max_ms)}</td>
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
                          {l.escalation.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="text-right text-slate-600 font-mono text-xs">{formatCost(l.cost_limit_cents)}</td>
                      <td className="text-center">
                        <StatusBadge status={l.published ? 'published' : 'draft'} />
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/loop-builder/${l.id}`) }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Edit in Builder"
                          >
                            <Settings2 size={14} />
                          </button>
                          {!l.published && (
                            <button
                              onClick={(e) => { e.stopPropagation(); publishLoop.mutate(l.id) }}
                              className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                              title="Publish"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(l) }}
                            className="p-1 rounded hover:bg-red-100 text-red-500"
                            title="Delete"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SideDrawer
        open={!!selectedLoop && !showDeleteConfirm}
        onClose={() => setSelectedLoop(null)}
        title={selectedLoop?.display_name || selectedLoop?.name || ''}
        subtitle={selectedLoop?.loop_type.replace(/_/g, ' ')}
        width="560px"
        footer={
          selectedLoop && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/loop-builder/${selectedLoop.id}`)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700"
              >
                Edit in Builder
              </button>
              <button
                onClick={() => setSelectedLoop(null)}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          )
        }
      >
        {selectedLoop && (
          <div className="p-4 space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Configuration</h3>
              <DetailsPanel
                items={[
                  { label: 'Loop Type', value: <span className="capitalize">{selectedLoop.loop_type.replace(/_/g, ' ')}</span> },
                  { label: 'Trigger', value: <span className="capitalize">{selectedLoop.trigger.replace(/_/g, ' ')}</span> },
                  { label: 'Max Iterations', value: selectedLoop.max_iterations },
                  { label: 'Backoff Strategy', value: formatBackoff(selectedLoop.backoff_strategy, selectedLoop.backoff_initial_ms, selectedLoop.backoff_max_ms) },
                  { label: 'Cost Limit', value: formatCost(selectedLoop.cost_limit_cents) },
                  { label: 'Time Limit', value: <span><Clock size={11} className="inline mr-1" />{selectedLoop.time_limit_seconds}s</span> },
                  { label: 'Exit Condition', value: selectedLoop.exit_condition },
                  { label: 'Failure Handling', value: <span className="capitalize">{selectedLoop.failure_handling}</span> },
                  { label: 'Escalation', value: <span className="capitalize">{selectedLoop.escalation.replace(/_/g, ' ')}</span> },
                  { label: 'Version', value: selectedLoop.version },
                ]}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evaluation & Action</h3>
              <div className="space-y-2">
                <div className="bg-slate-50 rounded-md p-3">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Evaluation</div>
                  <div className="text-sm text-slate-900">{selectedLoop.evaluation}</div>
                </div>
                <div className="bg-slate-50 rounded-md p-3">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Action</div>
                  <div className="text-sm text-slate-900">{selectedLoop.action}</div>
                </div>
              </div>
            </div>

            {selectedLoop.steps && selectedLoop.steps.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Flow Steps ({selectedLoop.steps.length})
                </h3>
                <div className="space-y-1.5">
                  {selectedLoop.steps.map((step: LoopStep, i: number) => {
                    const StepIcon = STEP_TYPE_ICONS[step.step_type] || Activity
                    return (
                      <div key={step.id} className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center shrink-0">
                            <StepIcon size={11} className="text-forgeiq-600" />
                          </div>
                          {i < selectedLoop.steps.length - 1 && (
                            <div className="w-px h-4 bg-slate-200" />
                          )}
                        </div>
                        <div className="pb-1">
                          <div className="text-sm font-medium text-slate-900">{step.label}</div>
                          {step.description && (
                            <div className="text-xs text-slate-500 mt-0.5">{step.description}</div>
                          )}
                          <div className="text-[10px] text-slate-400 uppercase mt-0.5">{step.step_type}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence Requirements</h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedLoop.evidence_requirements?.map((req, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded border border-slate-200">
                    {req}
                  </span>
                ))}
              </div>
            </div>

            {selectedLoop.execution_history && selectedLoop.execution_history.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Execution History ({selectedLoop.execution_history.length})
                </h3>
                <div className="space-y-2">
                  {selectedLoop.execution_history.slice(-5).map((rec, i) => (
                    <div key={i} className="bg-slate-50 rounded-md p-2.5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-700">Iteration {rec.iteration}</span>
                        <span className={`px-1.5 py-0.5 rounded ${rec.decision === 'continue' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {rec.decision}
                        </span>
                      </div>
                      {rec.exit_reason && (
                        <div className="text-slate-500">Exit: {rec.exit_reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SideDrawer>

      <SideDrawer
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Loop"
        subtitle={selectedLoop?.display_name}
        width="400px"
        footer={
          <div className="flex items-center gap-2">
            <button
              onClick={confirmDelete}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        }
      >
        <div className="p-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this loop? This action cannot be undone.
            Any harnesses referencing this loop will need to be updated.
          </p>
        </div>
      </SideDrawer>
    </div>
  )
}
