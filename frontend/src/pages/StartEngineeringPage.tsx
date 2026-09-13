import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateEngineeringPlan, useApproveEngineeringPlan, useRejectEngineeringPlan, useExecuteEngineeringPlan, useModifyPlanStage } from '../hooks/useQueries'
import { PageHeader, RiskBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer } from '../components/ui/SideDrawer'
import {
  Rocket, FileText, CheckCircle2, XCircle, Play, Edit3, ChevronDown, ChevronRight,
  Cpu, Shield, GitBranch, Layers, Clock, DollarSign, Hash, AlertTriangle, ArrowRight, Sparkles,
} from 'lucide-react'
import type { EngineeringPlan, PlanStage } from '../types'

const EXAMPLES = [
  'Build a React ecommerce application with product catalog, cart, checkout and authentication.',
  'Build a Python FastAPI microservice for order management with PostgreSQL and Redis caching.',
  'Build a Spring Boot REST API for payment processing with idempotency, retry support, and SCA compliance.',
  'Build a real-time analytics dashboard with React, WebSocket feeds, and ECharts visualization.',
]

export default function StartEngineeringPage() {
  const navigate = useNavigate()
  const [requirementText, setRequirementText] = useState('')
  const [plan, setPlan] = useState<EngineeringPlan | null>(null)
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set())
  const [editingStage, setEditingStage] = useState<PlanStage | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveReason, setApproveReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const createPlan = useCreateEngineeringPlan()
  const approvePlan = useApproveEngineeringPlan()
  const rejectPlan = useRejectEngineeringPlan()
  const executePlan = useExecuteEngineeringPlan()
  const modifyStage = useModifyPlanStage()

  const handleGenerate = () => {
    if (!requirementText.trim()) return
    createPlan.mutate(
      { requirement_text: requirementText },
      {
        onSuccess: (data) => {
          setPlan(data)
          setExpandedStages(new Set([0]))
        },
      },
    )
  }

  const handleApprove = () => {
    if (!plan) return
    approvePlan.mutate(
      { id: plan.id, body: { decided_by: 'Engineering Lead', reason: approveReason || 'Plan approved' } },
      {
        onSuccess: (data) => {
          setPlan(data)
        },
      },
    )
  }

  const handleReject = () => {
    if (!plan) return
    rejectPlan.mutate(
      { id: plan.id, body: { decided_by: 'Engineering Lead', reason: rejectReason || 'Plan rejected' } },
      {
        onSuccess: (data) => {
          setPlan(data)
          setShowRejectInput(false)
        },
      },
    )
  }

  const handleExecute = () => {
    if (!plan) return
    executePlan.mutate(plan.id, {
      onSuccess: (data) => {
        navigate(`/executions/${data.execution_id}`)
      },
    })
  }

  const handleStageEdit = (stage: PlanStage, modifications: Record<string, unknown>) => {
    if (!plan) return
    modifyStage.mutate(
      { planId: plan.id, stageId: stage.id, body: modifications },
      {
        onSuccess: (data) => {
          setPlan(data)
          setEditingStage(null)
        },
      },
    )
  }

  const toggleStage = (order: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order)
      else next.add(order)
      return next
    })
  }

  return (
    <>
      <PageHeader
        title="Start Engineering"
        description="Transform a business requirement into a governed engineering execution plan"
        breadcrumbs={[
          { label: 'Applications', to: '/applications' },
          { label: 'Start Engineering' },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Requirement Input */}
        {!plan && (
          <div className="fi-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-forgeiq-50 rounded-lg">
                <Sparkles className="h-5 w-5 text-forgeiq-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Business Requirement</h2>
                <p className="text-xs text-slate-500">Describe what you want to build. ForgeIQ will analyze it and generate an engineering plan.</p>
              </div>
            </div>

            <textarea
              value={requirementText}
              onChange={(e) => setRequirementText(e.target.value)}
              placeholder="Example: Build a React ecommerce application with product catalog, cart, checkout and authentication."
              className="w-full min-h-[120px] px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forgeiq-500/20 focus:border-forgeiq-400 resize-y text-slate-900 placeholder:text-slate-400"
              disabled={createPlan.isPending}
            />

            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">Quick examples:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setRequirementText(ex)}
                    className="px-3 py-1.5 text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-md hover:bg-white hover:border-forgeiq-300 transition-colors text-left max-w-[280px] truncate"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={!requirementText.trim() || createPlan.isPending}
                className="fi-button-primary"
              >
                {createPlan.isPending ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Generating Plan...</>
                ) : (
                  <><Rocket className="h-4 w-4" /> Generate Engineering Plan</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Plan Display */}
        {plan && (
          <>
            {/* Plan Summary */}
            <div className="fi-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-semibold text-slate-900">{plan.application_name}</h2>
                    <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{plan.application_type}</span>
                    <RiskBadge level={plan.risk_level} />
                  </div>
                  <p className="text-xs text-slate-500">{plan.requirement_text}</p>
                </div>
                <button
                  onClick={() => { setPlan(null); setRequirementText('') }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Start Over
                </button>
              </div>

              {/* Plan metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase">Est. Duration</p>
                    <p className="text-sm font-medium text-slate-900">{Math.ceil(plan.estimated_duration_seconds / 60)} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase">Est. Cost</p>
                    <p className="text-sm font-medium text-slate-900">${(plan.estimated_cost_cents / 100).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                  <Hash className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase">Est. Tokens</p>
                    <p className="text-sm font-medium text-slate-900">{(plan.estimated_tokens / 1000).toFixed(0)}K</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase">Stages</p>
                    <p className="text-sm font-medium text-slate-900">{plan.stages.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            {plan.risk_factors.length > 0 && (
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Risk Assessment</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.risk_factors.map((factor, i) => (
                    <span key={i} className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">{factor}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Architecture */}
            <div className="fi-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="h-4 w-4 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Architecture</h3>
              </div>
              <p className="text-sm text-slate-700 mb-3">{plan.architecture_summary}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {plan.architecture_components.map((comp) => (
                  <div key={comp} className="px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-sm text-slate-700 text-center">{comp}</div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {plan.technologies.map((tech) => (
                  <span key={tech} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{tech}</span>
                ))}
              </div>
            </div>

            {/* Repository Config */}
            <div className="fi-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="h-4 w-4 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Repository Configuration</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">URL</p>
                  <p className="text-sm font-mono text-slate-900 truncate">{plan.repository_config.url as string}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Branch</p>
                  <p className="text-sm text-slate-900">{plan.repository_config.branch as string}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Provider</p>
                  <p className="text-sm text-slate-900">{plan.repository_config.provider as string}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Initialize</p>
                  <p className="text-sm text-slate-900">{plan.repository_config.initialize ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Recommended Harnesses */}
            {plan.recommended_harnesses.length > 0 && (
              <div className="fi-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Recommended Harnesses</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {plan.recommended_harnesses.map((h) => (
                    <div key={h.id} className="px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                      <p className="text-sm font-medium text-slate-900">{h.name}</p>
                      <p className="text-xs text-slate-500">{h.type} / {h.environment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engineering Stages */}
            <div className="fi-card">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-forgeiq-600" /> Engineering Flow
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {plan.stages.map((stage, idx) => {
                  const expanded = expandedStages.has(stage.order)
                  const isLast = idx === plan.stages.length - 1
                  return (
                    <div key={stage.id}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                        onClick={() => toggleStage(stage.order)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forgeiq-100 text-forgeiq-700 text-xs font-semibold">
                            {stage.order + 1}
                          </span>
                          {isLast ? null : <div className="w-px h-4 bg-slate-200" />}
                        </div>
                        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{stage.label}</span>
                            <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200 text-xs">{stage.stage_type}</span>
                            {stage.approval_required && (
                              <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">Approval Required</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{stage.environment}</span>
                          {stage.status === 'modified' && <span className="text-amber-600 font-medium">Modified</span>}
                        </div>
                        {plan.status === 'draft' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingStage(stage) }}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {expanded && (
                        <div className="px-4 pb-3 pl-12 space-y-2">
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-slate-500 uppercase tracking-wide mb-1">Harness</p>
                              <p className="text-slate-700 font-medium">{stage.harness_name || 'Not assigned'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase tracking-wide mb-1">Agents</p>
                              <div className="flex flex-wrap gap-1">
                                {stage.agent_names.length > 0 ? stage.agent_names.map((a) => (
                                  <span key={a} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 text-xs">{a}</span>
                                )) : <span className="text-slate-400">None</span>}
                              </div>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase tracking-wide mb-1">Tools</p>
                              <div className="flex flex-wrap gap-1">
                                {stage.tool_names.length > 0 ? stage.tool_names.map((t) => (
                                  <span key={t} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{t}</span>
                                )) : <span className="text-slate-400">None</span>}
                              </div>
                            </div>
                            {stage.skill_names.length > 0 && (
                              <div className="col-span-3">
                                <p className="text-slate-500 uppercase tracking-wide mb-1">Skills</p>
                                <div className="flex flex-wrap gap-1">
                                  {stage.skill_names.map((s) => (
                                    <span key={s} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Approval / Action Bar */}
            {plan.status === 'draft' && (
              <div className="fi-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Review the plan above, then approve or reject to proceed.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRejectInput(!showRejectInput)}
                      className="fi-button-secondary"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={approvePlan.isPending}
                      className="fi-button-primary"
                    >
                      {approvePlan.isPending ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Approving...</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4" /> Approve Plan</>
                      )}
                    </button>
                  </div>
                </div>
                {showRejectInput && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                    <button onClick={handleReject} disabled={rejectPlan.isPending} className="fi-button-secondary text-red-600 border-red-200 hover:bg-red-50">
                      Confirm Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {plan.status === 'approved' && (
              <div className="fi-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Plan Approved</span>
                      <span className="text-xs text-slate-500 ml-2">by {plan.decided_by} - Application created</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/applications/${plan.application_id}`)}
                      className="fi-button-secondary"
                    >
                      View Application
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={executePlan.isPending}
                      className="fi-button-primary"
                    >
                      {executePlan.isPending ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Starting...</>
                      ) : (
                        <><Play className="h-4 w-4" /> Execute Engineering Plan</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {plan.status === 'rejected' && (
              <div className="fi-card p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <span className="text-sm font-medium text-slate-900">Plan Rejected</span>
                    <span className="text-xs text-slate-500 ml-2">by {plan.decided_by}: {plan.decision_reason}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setPlan(null); setRequirementText('') }}
                  className="mt-3 fi-button-secondary"
                >
                  Start Over
                </button>
              </div>
            )}

            {plan.status === 'executing' && plan.execution_id && (
              <div className="fi-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-forgeiq-600" />
                    <span className="text-sm font-medium text-slate-900">Execution started</span>
                  </div>
                  <button
                    onClick={() => navigate(`/executions/${plan.execution_id}`)}
                    className="fi-button-primary"
                  >
                    View Execution <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stage Edit Drawer */}
      <SideDrawer
        open={!!editingStage}
        onClose={() => setEditingStage(null)}
        title="Modify Stage"
        subtitle={editingStage?.label}
        width="440px"
        footer={
          editingStage && (
            <button
              onClick={() => handleStageEdit(editingStage, {
                approval_required: editingStage.approval_required,
                environment: editingStage.environment,
                description: editingStage.description,
              })}
              className="fi-button-primary"
            >
              Save Changes
            </button>
          )
        }
      >
        {editingStage && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Description</label>
              <textarea
                value={editingStage.description}
                onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forgeiq-500/20 focus:border-forgeiq-400 min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Environment</label>
              <select
                value={editingStage.environment}
                onChange={(e) => setEditingStage({ ...editingStage, environment: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forgeiq-500/20"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="approval-required"
                checked={editingStage.approval_required}
                onChange={(e) => setEditingStage({ ...editingStage, approval_required: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="approval-required" className="text-sm text-slate-700">Approval required for this stage</label>
            </div>
          </div>
        )}
      </SideDrawer>
    </>
  )
}
