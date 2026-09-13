import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Zap, Activity, GitBranch, Settings2, CheckCircle2, ArrowUpCircle,
  XCircle, Plus, Save, Play, ArrowDown, Sparkles, Trash2, Clock,
  DollarSign, Repeat, AlertTriangle,
} from 'lucide-react'
import { useLoop, useCreateLoop, useUpdateLoop, useLoopTypes, useLoopTriggers, useLoopBackoffStrategies, useLoopFailureHandling, useLoopEscalationTypes, useGenerateLoopSteps, useGenerateLoopStepsForType, useExecuteLoop } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { LoopStep, Loop } from '../types'

const STEP_TYPE_META: Record<string, { icon: typeof Zap; color: string; bg: string; border: string }> = {
  trigger: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300' },
  evaluate: { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300' },
  condition: { icon: GitBranch, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-300' },
  action: { icon: Settings2, color: 'text-forgeiq-600', bg: 'bg-forgeiq-50', border: 'border-forgeiq-300' },
  decision: { icon: GitBranch, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  exit: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  escalation: { icon: ArrowUpCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-300' },
  failure_handler: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300' },
}

const STEP_TYPES = Object.keys(STEP_TYPE_META)

interface StepDraft {
  id: string
  step_type: string
  label: string
  description: string
  position_x: number
  position_y: number
}

export default function LoopBuilderPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { data: existingLoop, isLoading } = useLoop(id || '')
  const createLoop = useCreateLoop()
  const updateLoop = useUpdateLoop()
  const generateSteps = useGenerateLoopSteps()
  const generateStepsForType = useGenerateLoopStepsForType()
  const executeLoop = useExecuteLoop()

  const { data: loopTypes } = useLoopTypes()
  const { data: triggers } = useLoopTriggers()
  const { data: backoffStrategies } = useLoopBackoffStrategies()
  const { data: failureHandlingOpts } = useLoopFailureHandling()
  const { data: escalationTypes } = useLoopEscalationTypes()

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loopType, setLoopType] = useState('retry')
  const [trigger, setTrigger] = useState('on_failure')
  const [evaluation, setEvaluation] = useState('')
  const [action, setAction] = useState('')
  const [maxIterations, setMaxIterations] = useState(3)
  const [backoffStrategy, setBackoffStrategy] = useState('exponential')
  const [backoffInitialMs, setBackoffInitialMs] = useState(1000)
  const [backoffMaxMs, setBackoffMaxMs] = useState(30000)
  const [costLimitCents, setCostLimitCents] = useState(10000)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(3600)
  const [exitCondition, setExitCondition] = useState('success')
  const [failureHandling, setFailureHandling] = useState('escalate')
  const [escalation, setEscalation] = useState('human_approval')
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [evidenceRequirements, setEvidenceRequirements] = useState<string[]>(['iteration_log', 'evaluation_result', 'exit_reason'])
  const [evidenceInput, setEvidenceInput] = useState('')
  const [activeTab, setActiveTab] = useState<'flow' | 'config'>('flow')
  const [selectedStep, setSelectedStep] = useState<StepDraft | null>(null)
  const [execResult, setExecResult] = useState<Record<string, unknown> | null>(null)
  const [showExecDrawer, setShowExecDrawer] = useState(false)

  useEffect(() => {
    if (isEdit && existingLoop) {
      setName(existingLoop.name)
      setDisplayName(existingLoop.display_name)
      setLoopType(existingLoop.loop_type)
      setTrigger(existingLoop.trigger)
      setEvaluation(existingLoop.evaluation)
      setAction(existingLoop.action)
      setMaxIterations(existingLoop.max_iterations)
      setBackoffStrategy(existingLoop.backoff_strategy)
      setBackoffInitialMs(existingLoop.backoff_initial_ms)
      setBackoffMaxMs(existingLoop.backoff_max_ms)
      setCostLimitCents(existingLoop.cost_limit_cents)
      setTimeLimitSeconds(existingLoop.time_limit_seconds)
      setExitCondition(existingLoop.exit_condition)
      setFailureHandling(existingLoop.failure_handling)
      setEscalation(existingLoop.escalation)
      setEvidenceRequirements(existingLoop.evidence_requirements || [])
      setSteps((existingLoop.steps || []).map(s => ({
        id: s.id,
        step_type: s.step_type,
        label: s.label,
        description: s.description,
        position_x: s.position_x,
        position_y: s.position_y,
      })))
    }
  }, [isEdit, existingLoop])

  const handleGenerateSteps = useCallback(() => {
    if (isEdit && id) {
      generateSteps.mutate(id, {
        onSuccess: (loop: Loop) => {
          setSteps((loop.steps || []).map(s => ({
            id: s.id, step_type: s.step_type, label: s.label,
            description: s.description, position_x: s.position_x, position_y: s.position_y,
          })))
        },
      })
    } else {
      generateStepsForType.mutate(loopType, {
        onSuccess: (generatedSteps: LoopStep[]) => {
          setSteps(generatedSteps.map(s => ({
            id: s.id, step_type: s.step_type, label: s.label,
            description: s.description, position_x: s.position_x, position_y: s.position_y,
          })))
        },
      })
    }
  }, [isEdit, id, loopType, generateSteps, generateStepsForType])

  const addStep = () => {
    const newStep: StepDraft = {
      id: `lstep_${Date.now()}`,
      step_type: 'action',
      label: 'New Step',
      description: '',
      position_x: 300,
      position_y: steps.length * 100 + 50,
    }
    setSteps([...steps, newStep])
  }

  const updateStep = (stepId: string, patch: Partial<StepDraft>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...patch } : s))
    if (selectedStep?.id === stepId) {
      setSelectedStep({ ...selectedStep, ...patch })
    }
  }

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId))
    if (selectedStep?.id === stepId) setSelectedStep(null)
  }

  const addEvidence = () => {
    if (evidenceInput.trim() && !evidenceRequirements.includes(evidenceInput.trim())) {
      setEvidenceRequirements([...evidenceRequirements, evidenceInput.trim()])
      setEvidenceInput('')
    }
  }

  const removeEvidence = (req: string) => {
    setEvidenceRequirements(evidenceRequirements.filter(e => e !== req))
  }

  const handleSave = () => {
    const body = {
      name: name || displayName.toLowerCase().replace(/\s+/g, '-'),
      display_name: displayName || name,
      loop_type: loopType,
      trigger,
      evaluation,
      action,
      max_iterations: maxIterations,
      backoff_strategy: backoffStrategy,
      backoff_initial_ms: backoffInitialMs,
      backoff_max_ms: backoffMaxMs,
      cost_limit_cents: costLimitCents,
      time_limit_seconds: timeLimitSeconds,
      retry_policy: { retry_on: 'transient', max_retries: maxIterations },
      exit_condition: exitCondition,
      failure_handling: failureHandling,
      escalation,
      steps: steps.map(s => ({
        step_type: s.step_type,
        label: s.label,
        description: s.description,
        position_x: s.position_x,
        position_y: s.position_y,
      })),
      evidence_requirements: evidenceRequirements,
    }

    if (isEdit && id) {
      updateLoop.mutate({ id, body }, { onSuccess: () => navigate('/loop-engineering') })
    } else {
      createLoop.mutate(body, { onSuccess: () => navigate('/loop-engineering') })
    }
  }

  const handleExecute = () => {
    if (!id) return
    executeLoop.mutate(
      { id, body: { execution_id: '', evaluate_result: { success: false }, action_result: { success: false } } },
      { onSuccess: (result) => { setExecResult(result); setShowExecDrawer(true) } },
    )
  }

  if (isEdit && isLoading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Loop Builder' : 'New Loop'}
        description={isEdit ? displayName || name : 'Design an adaptive execution loop with triggers, evaluation, retry, and escalation'}
        breadcrumbs={[
          { label: 'Loop Engineering', to: '/loop-engineering' },
          { label: isEdit ? 'Edit' : 'Create' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                onClick={handleExecute}
                disabled={executeLoop.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <Play size={15} />
                Test Execute
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={createLoop.isPending || updateLoop.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 transition-colors disabled:opacity-50"
            >
              <Save size={15} />
              Save
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('flow')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'flow' ? 'border-forgeiq-600 text-forgeiq-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Flow
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'config' ? 'border-forgeiq-600 text-forgeiq-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Configuration
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'flow' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateSteps}
                  disabled={generateSteps.isPending || generateStepsForType.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-forgeiq-700 bg-forgeiq-50 rounded-md hover:bg-forgeiq-100 transition-colors border border-forgeiq-200 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  Auto-Generate Steps for {loopType.replace(/_/g, ' ')}
                </button>
                <button
                  onClick={addStep}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                >
                  <Plus size={14} />
                  Add Step
                </button>
              </div>
              <span className="text-xs text-slate-500">{steps.length} steps</span>
            </div>

            {steps.length === 0 ? (
              <div className="fi-card flex flex-col items-center justify-center h-64 text-slate-400">
                <Repeat className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm mb-2">No steps defined</p>
                <p className="text-xs">Auto-generate steps for this loop type or add manually</p>
              </div>
            ) : (
              <div className="fi-card p-6">
                <div className="space-y-0">
                  {steps.map((step, i) => {
                    const meta = STEP_TYPE_META[step.step_type] || STEP_TYPE_META.action
                    const Icon = meta.icon
                    return (
                      <div key={step.id}>
                        <div
                          className={`relative flex items-start gap-3 p-3 rounded-md border ${meta.border} ${meta.bg} cursor-pointer hover:shadow-sm transition-shadow`}
                          onClick={() => setSelectedStep(step)}
                        >
                          <div className={`w-8 h-8 rounded-full ${meta.bg} border-2 ${meta.border} flex items-center justify-center shrink-0`}>
                            <Icon size={14} className={meta.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">{step.label}</span>
                              <span className="text-[10px] uppercase text-slate-400 font-medium px-1.5 py-0.5 bg-white rounded border border-slate-200">
                                {step.step_type}
                              </span>
                            </div>
                            {step.description && (
                              <div className="text-xs text-slate-600 mt-0.5">{step.description}</div>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeStep(step.id) }}
                            className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[10px] font-mono text-slate-500">
                            {i + 1}
                          </div>
                        </div>
                        {i < steps.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown size={16} className="text-slate-300" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Basic Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="my-loop"
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Display Name</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="My Loop"
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Loop Type</label>
                  <select
                    value={loopType}
                    onChange={e => setLoopType(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  >
                    {loopTypes?.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Trigger</label>
                  <select
                    value={trigger}
                    onChange={e => setTrigger(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  >
                    {triggers?.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Evaluation & Action</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Evaluation Logic</label>
                  <textarea
                    value={evaluation}
                    onChange={e => setEvaluation(e.target.value)}
                    placeholder="Describe what the loop evaluates on each iteration"
                    rows={2}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Action</label>
                  <textarea
                    value={action}
                    onChange={e => setAction(e.target.value)}
                    placeholder="Describe the action taken when evaluation fails"
                    rows={2}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
              </div>
            </div>

            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Execution Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max Iterations</label>
                  <input
                    type="number"
                    value={maxIterations}
                    onChange={e => setMaxIterations(parseInt(e.target.value) || 1)}
                    min={1}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Backoff Strategy</label>
                  <select
                    value={backoffStrategy}
                    onChange={e => setBackoffStrategy(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  >
                    {backoffStrategies?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Backoff Initial (ms)</label>
                  <input
                    type="number"
                    value={backoffInitialMs}
                    onChange={e => setBackoffInitialMs(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Backoff Max (ms)</label>
                  <input
                    type="number"
                    value={backoffMaxMs}
                    onChange={e => setBackoffMaxMs(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <DollarSign size={11} /> Cost Limit (cents)
                  </label>
                  <input
                    type="number"
                    value={costLimitCents}
                    onChange={e => setCostLimitCents(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Clock size={11} /> Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    value={timeLimitSeconds}
                    onChange={e => setTimeLimitSeconds(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
              </div>
            </div>

            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Exit & Failure Handling</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Exit Condition</label>
                  <input
                    value={exitCondition}
                    onChange={e => setExitCondition(e.target.value)}
                    placeholder="success"
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Failure Handling</label>
                  <select
                    value={failureHandling}
                    onChange={e => setFailureHandling(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  >
                    {failureHandlingOpts?.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Escalation</label>
                  <select
                    value={escalation}
                    onChange={e => setEscalation(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                  >
                    {escalationTypes?.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Evidence Requirements</h3>
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={evidenceInput}
                  onChange={e => setEvidenceInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEvidence() } }}
                  placeholder="e.g. iteration_log"
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                />
                <button
                  onClick={addEvidence}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evidenceRequirements.map(req => (
                  <span key={req} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {req}
                    <button onClick={() => removeEvidence(req)} className="text-slate-400 hover:text-red-500">
                      <XCircle size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <SideDrawer
        open={!!selectedStep}
        onClose={() => setSelectedStep(null)}
        title="Edit Step"
        subtitle={selectedStep?.step_type}
        width="420px"
        footer={
          <button
            onClick={() => setSelectedStep(null)}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
          >
            Done
          </button>
        }
      >
        {selectedStep && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Step Type</label>
              <select
                value={selectedStep.step_type}
                onChange={e => updateStep(selectedStep.id, { step_type: e.target.value })}
                className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
              >
                {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Label</label>
              <input
                value={selectedStep.label}
                onChange={e => updateStep(selectedStep.id, { label: e.target.value })}
                className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</label>
              <textarea
                value={selectedStep.description}
                onChange={e => updateStep(selectedStep.id, { description: e.target.value })}
                rows={3}
                className="mt-1 w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
              />
            </div>
          </div>
        )}
      </SideDrawer>

      <SideDrawer
        open={showExecDrawer}
        onClose={() => setShowExecDrawer(false)}
        title="Execution Result"
        width="480px"
        footer={
          <button
            onClick={() => setShowExecDrawer(false)}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
          >
            Close
          </button>
        }
      >
        {execResult && (
          <div className="p-4 space-y-4">
            <DetailsPanel
              items={[
                { label: 'Status', value: <span className="font-medium">{String(execResult.status)}</span> },
                { label: 'Iterations', value: String(execResult.iterations) },
                { label: 'Exit Reason', value: String(execResult.exit_reason || 'N/A') },
                { label: 'Cost (cents)', value: String(execResult.cost_cents || 0) },
                { label: 'Duration (s)', value: String(Number(execResult.duration_seconds || 0).toFixed(2)) },
                { label: 'Escalation', value: String(execResult.escalation || 'N/A') },
              ]}
            />
            {Array.isArray(execResult.results) && execResult.results.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Iteration Log</h3>
                <div className="space-y-2">
                  {(execResult.results as Array<Record<string, unknown>>).map((r, i) => (
                    <div key={i} className="bg-slate-50 rounded-md p-2.5 text-xs">
                      <div className="font-medium text-slate-700">Iteration {String(r.iteration)}</div>
                      <div className="text-slate-500 mt-0.5">Decision: {String(r.decision)}</div>
                      {r.exit_reason ? <div className="text-slate-500">Exit: {String(r.exit_reason)}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </div>
  )
}
