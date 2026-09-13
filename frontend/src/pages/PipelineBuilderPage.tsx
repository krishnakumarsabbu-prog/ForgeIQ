import { useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Save, Play, Plus, Trash2, ChevronDown, ChevronRight,
  Layers, GitBranch, Shield, CheckCircle2, Package, Rocket,
  Server, Eye, AlertTriangle, Settings, ArrowUp, ArrowDown,
  FileCheck, GitMerge, Boxes,
} from 'lucide-react'
import {
  useHarnesses, usePipelines, useApplications,
  useCreatePipeline, useUpdatePipeline, useCreateExecution,
} from '../hooks/useQueries'
import { Spinner } from '../components/ui/StatusBadge'
import type { PipelineStage, StageConfig } from '../types'

interface StageDraft {
  id: string
  name: string
  stage_type: string
  harness_id?: string
  order: number
  required: boolean
  condition?: string
  parallel_with: string[]
  config: StageConfig
}

let stageIdCounter = 0
function genStageId() {
  stageIdCounter += 1
  return `draft_stage_${Date.now().toString(36)}_${stageIdCounter}`
}

const STAGE_TYPE_META: Record<string, { icon: typeof Layers; color: string; bg: string; border: string }> = {
  harness: { icon: Layers, color: 'text-forgeiq-700', bg: 'bg-forgeiq-50', border: 'border-forgeiq-200' },
  development: { icon: Layers, color: 'text-forgeiq-700', bg: 'bg-forgeiq-50', border: 'border-forgeiq-200' },
  testing: { icon: CheckCircle2, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  security: { icon: Shield, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  build: { icon: Package, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  release: { icon: Rocket, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  deployment: { icon: Server, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  verification: { icon: Eye, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  approval: { icon: FileCheck, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  condition: { icon: GitMerge, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
  parallel: { icon: Boxes, color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  environment: { icon: Server, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  artifact: { icon: Package, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
}

const FAILURE_STRATEGIES = [
  { value: 'abort', label: 'Abort' },
  { value: 'continue', label: 'Continue' },
  { value: 'retry', label: 'Retry' },
  { value: 'skip', label: 'Skip' },
  { value: 'rollback', label: 'Rollback' },
  { value: 'escalate', label: 'Escalate' },
]

const STAGE_TYPES = [
  { value: 'harness', label: 'Harness' },
  { value: 'development', label: 'Development' },
  { value: 'testing', label: 'Testing' },
  { value: 'security', label: 'Security' },
  { value: 'build', label: 'Build' },
  { value: 'release', label: 'Release' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'verification', label: 'Verification' },
  { value: 'approval', label: 'Approval' },
  { value: 'condition', label: 'Condition' },
  { value: 'parallel', label: 'Parallel' },
  { value: 'environment', label: 'Environment' },
  { value: 'artifact', label: 'Artifact' },
]

const ENVIRONMENTS = ['development', 'staging', 'production']

function defaultConfig(): StageConfig {
  return {
    harness_version: undefined,
    input_mapping: {},
    output_mapping: {},
    environment: undefined,
    conditions: [],
    failure_strategy: 'abort',
    approval_required: false,
    timeout_seconds: undefined,
    parallel_stage_ids: [],
  }
}

export default function PipelineBuilderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editingPipelineId = searchParams.get('pipeline')

  const { data: harnesses, isLoading: harnessesLoading } = useHarnesses()
  const { data: pipelines } = usePipelines()
  const { data: applications } = useApplications()
  const createPipeline = useCreatePipeline()
  const updatePipeline = useUpdatePipeline()
  const createExecution = useCreateExecution()

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [applicationId, setApplicationId] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [stages, setStages] = useState<StageDraft[]>([])
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pipelineId, setPipelineId] = useState<string | null>(editingPipelineId)

  // Load existing pipeline for editing
  useMemo(() => {
    if (editingPipelineId && pipelines) {
      const p = pipelines.find((x) => x.id === editingPipelineId)
      if (p) {
        setPipelineId(p.id)
        setName(p.name)
        setDisplayName(p.display_name)
        setDescription(p.description)
        setApplicationId(p.application_id || '')
        setTags(p.tags || [])
        setStages(p.stages.map((s: PipelineStage) => ({
          id: s.id,
          name: s.name,
          stage_type: s.stage_type,
          harness_id: s.harness_id,
          order: s.order,
          required: s.required,
          condition: s.condition,
          parallel_with: s.parallel_with || [],
          config: s.config || defaultConfig(),
        })))
      }
    }
  }, [editingPipelineId, pipelines])

  const selectedStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId) || null,
    [stages, selectedStageId],
  )

  const addStage = useCallback((stageType: string) => {
    const meta = STAGE_TYPE_META[stageType] || STAGE_TYPE_META.harness
    const newStage: StageDraft = {
      id: genStageId(),
      name: `${stageType.charAt(0).toUpperCase() + stageType.slice(1)} Stage`,
      stage_type: stageType,
      order: stages.length,
      required: true,
      parallel_with: [],
      config: defaultConfig(),
    }
    setStages((prev) => [...prev, newStage])
    setSelectedStageId(newStage.id)
  }, [stages.length])

  const removeStage = useCallback((id: string) => {
    setStages((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      return filtered.map((s, i) => ({ ...s, order: i }))
    })
    if (selectedStageId === id) setSelectedStageId(null)
  }, [selectedStageId])

  const moveStage = useCallback((id: string, dir: 'up' | 'down') => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const swap = dir === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= prev.length) return prev
      const arr = [...prev]
      const tmp = arr[idx]
      arr[idx] = arr[swap]
      arr[swap] = tmp
      return arr.map((s, i) => ({ ...s, order: i }))
    })
  }, [])

  const updateStage = useCallback((id: string, patch: Partial<StageDraft>) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
  }, [])

  const updateStageConfig = useCallback((id: string, patch: Partial<StageConfig>) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, config: { ...s.config, ...patch } } : s))
  }, [])

  const handleSave = useCallback(async () => {
    if (!name || !displayName) {
      setMsg({ type: 'error', text: 'Name and display name are required' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const body = {
        name,
        display_name: displayName,
        description,
        application_id: applicationId || null,
        tags,
        stages: stages.map((s) => ({
          name: s.name,
          stage_type: s.stage_type,
          harness_id: s.harness_id || null,
          order: s.order,
          required: s.required,
          condition: s.condition || null,
          parallel_with: s.parallel_with,
          config: {
            harness_version: s.config.harness_version || null,
            input_mapping: s.config.input_mapping,
            output_mapping: s.config.output_mapping,
            environment: s.config.environment || null,
            conditions: s.config.conditions,
            failure_strategy: s.config.failure_strategy,
            approval_required: s.config.approval_required,
            timeout_seconds: s.config.timeout_seconds || null,
            parallel_stage_ids: s.config.parallel_stage_ids,
          },
        })),
      }
      if (pipelineId) {
        await updatePipeline.mutateAsync({ id: pipelineId, body })
        setMsg({ type: 'success', text: 'Pipeline updated successfully' })
      } else {
        const created = await createPipeline.mutateAsync(body)
        setPipelineId(created.id)
        setMsg({ type: 'success', text: 'Pipeline created successfully' })
      }
    } catch (e) {
      setMsg({ type: 'error', text: `Failed to save: ${(e as Error).message}` })
    } finally {
      setSaving(false)
    }
  }, [name, displayName, description, applicationId, tags, stages, pipelineId, createPipeline, updatePipeline])

  const handleRun = useCallback(async () => {
    if (!pipelineId) {
      setMsg({ type: 'error', text: 'Save the pipeline before running' })
      return
    }
    setRunning(true)
    setMsg(null)
    try {
      await createExecution.mutateAsync({
        pipeline_id: pipelineId,
        application_id: applicationId || null,
        trigger: 'manual',
        trigger_reason: 'Manual trigger from Pipeline Builder',
      })
      navigate(`/executions`)
    } catch (e) {
      setMsg({ type: 'error', text: `Failed to start execution: ${(e as Error).message}` })
    } finally {
      setRunning(false)
    }
  }, [pipelineId, applicationId, createExecution, navigate])

  const harnessName = useCallback((id?: string) => {
    if (!id || !harnesses) return '—'
    const h = harnesses.find((x) => x.id === id)
    return h ? h.display_name || h.name : id
  }, [harnesses])

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-forgeiq-600" />
          <h1 className="text-base font-semibold text-slate-900">
            {pipelineId ? 'Edit Pipeline' : 'Pipeline Builder'}
          </h1>
          {displayName && (
            <span className="text-sm text-slate-500">— {displayName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className={`text-xs font-medium ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {msg.text}
            </span>
          )}
          <button
            onClick={() => navigate('/pipelines')}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-forgeiq-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forgeiq-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Spinner /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <button
            onClick={handleRun}
            disabled={running || !pipelineId}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {running ? <Spinner /> : <Play className="h-4 w-4" />}
            Run
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Available Harnesses */}
        <div className="w-72 border-r border-slate-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline Metadata</h2>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="My Pipeline"
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-pipeline"
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pipeline description..."
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Application</label>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
              >
                <option value="">No application</option>
                {(applications || []).map((app) => (
                  <option key={app.id} value={app.id}>{app.display_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-t border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add Stage</h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-1.5">
            {STAGE_TYPES.map((t) => {
              const meta = STAGE_TYPE_META[t.value] || STAGE_TYPE_META.harness
              const Icon = meta.icon
              return (
                <button
                  key={t.value}
                  onClick={() => addStage(t.value)}
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="px-4 py-3 border-b border-t border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Harnesses</h2>
          </div>
          <div className="p-3 space-y-1">
            {harnessesLoading ? (
              <Spinner />
            ) : (harnesses || []).map((h) => (
              <div
                key={h.id}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-2 hover:border-slate-300 transition-colors cursor-grab"
                title={`Drag to add ${h.display_name} as a stage`}
                onClick={() => {
                  const newStage: StageDraft = {
                    id: genStageId(),
                    name: h.display_name || h.name,
                    stage_type: 'harness',
                    harness_id: h.id,
                    order: stages.length,
                    required: true,
                    parallel_with: [],
                    config: { ...defaultConfig(), environment: h.environment },
                  }
                  setStages((prev) => [...prev, newStage])
                  setSelectedStageId(newStage.id)
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-forgeiq-600" />
                  <span className="text-xs font-medium text-slate-900 truncate">{h.display_name}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400 truncate">{h.harness_type} · {h.environment}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center panel: Pipeline topology */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Pipeline Topology</h2>
              <span className="text-xs text-slate-500">{stages.length} stages</span>
            </div>

            {stages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <GitBranch className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No stages yet. Add stages from the left panel.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stages.map((stage, idx) => {
                  const meta = STAGE_TYPE_META[stage.stage_type] || STAGE_TYPE_META.harness
                  const Icon = meta.icon
                  const isSelected = stage.id === selectedStageId
                  return (
                    <div key={stage.id}>
                      {/* Connector arrow */}
                      {idx > 0 && (
                        <div className="flex justify-center py-1">
                          <div className="h-6 w-px bg-slate-300" />
                        </div>
                      )}
                      <div
                        onClick={() => setSelectedStageId(stage.id)}
                        className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-forgeiq-400 ring-1 ring-forgeiq-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Order number */}
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                          {idx + 1}
                        </div>

                        {/* Stage icon */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-md ${meta.bg} ${meta.border} border flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                        </div>

                        {/* Stage info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{stage.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${meta.color} font-medium`}>{stage.stage_type}</span>
                            {stage.harness_id && (
                              <span className="text-xs text-slate-400">· {harnessName(stage.harness_id)}</span>
                            )}
                            {stage.config.environment && (
                              <span className="text-xs text-slate-400">· {stage.config.environment}</span>
                            )}
                            {stage.config.approval_required && (
                              <span className="text-xs text-amber-600 font-medium">· approval</span>
                            )}
                            {stage.config.failure_strategy !== 'abort' && (
                              <span className="text-xs text-slate-400">· {stage.config.failure_strategy}</span>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStage(stage.id, 'up') }}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStage(stage.id, 'down') }}
                            disabled={idx === stages.length - 1}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeStage(stage.id) }}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Stage configuration */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage Configuration</h2>
          </div>
          {!selectedStage ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Settings className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Select a stage to configure</p>
            </div>
          ) : (
            <StageConfigEditor
              stage={selectedStage}
              harnesses={harnesses || []}
              onUpdate={updateStage}
              onUpdateConfig={updateStageConfig}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function StageConfigEditor({
  stage,
  harnesses,
  onUpdate,
  onUpdateConfig,
}: {
  stage: StageDraft
  harnesses: { id: string; display_name: string; name: string; environment: string; harness_type: string }[]
  onUpdate: (id: string, patch: Partial<StageDraft>) => void
  onUpdateConfig: (id: string, patch: Partial<StageConfig>) => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const meta = STAGE_TYPE_META[stage.stage_type] || STAGE_TYPE_META.harness
  const Icon = meta.icon

  return (
    <div className="p-4 space-y-4">
      {/* Stage header */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-md ${meta.bg} ${meta.border} border flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${meta.color}`} />
        </div>
        <span className="text-sm font-semibold text-slate-900">{stage.stage_type}</span>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stage Name</label>
        <input
          value={stage.name}
          onChange={(e) => onUpdate(stage.id, { name: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        />
      </div>

      {/* Stage type */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stage Type</label>
        <select
          value={stage.stage_type}
          onChange={(e) => onUpdate(stage.id, { stage_type: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        >
          {STAGE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Harness binding */}
      {stage.stage_type !== 'approval' && stage.stage_type !== 'condition' && (
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Harness</label>
          <select
            value={stage.harness_id || ''}
            onChange={(e) => onUpdate(stage.id, { harness_id: e.target.value || undefined })}
            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
          >
            <option value="">No harness</option>
            {harnesses.map((h) => (
              <option key={h.id} value={h.id}>{h.display_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Harness version */}
      {stage.harness_id && (
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Harness Version</label>
          <input
            value={stage.config.harness_version || ''}
            onChange={(e) => onUpdateConfig(stage.id, { harness_version: e.target.value || undefined })}
            placeholder="latest"
            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
          />
        </div>
      )}

      {/* Environment */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Environment</label>
        <select
          value={stage.config.environment || ''}
          onChange={(e) => onUpdateConfig(stage.id, { environment: e.target.value || undefined })}
          className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        >
          <option value="">Inherit</option>
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>{env}</option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Condition</label>
        <input
          value={stage.condition || ''}
          onChange={(e) => onUpdate(stage.id, { condition: e.target.value || undefined })}
          placeholder="e.g. prev_stage:completed"
          className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        />
      </div>

      {/* Failure strategy */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Failure Strategy</label>
        <select
          value={stage.config.failure_strategy}
          onChange={(e) => onUpdateConfig(stage.id, { failure_strategy: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        >
          {FAILURE_STRATEGIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Approval required */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Approval Required</label>
        <button
          onClick={() => onUpdateConfig(stage.id, { approval_required: !stage.config.approval_required })}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            stage.config.approval_required ? 'bg-forgeiq-600' : 'bg-slate-200'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            stage.config.approval_required ? 'translate-x-4' : ''
          }`} />
        </button>
      </div>

      {/* Required */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Required Stage</label>
        <button
          onClick={() => onUpdate(stage.id, { required: !stage.required })}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            stage.required ? 'bg-forgeiq-600' : 'bg-slate-200'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            stage.required ? 'translate-x-4' : ''
          }`} />
        </button>
      </div>

      {/* Timeout */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Timeout (seconds)</label>
        <input
          type="number"
          value={stage.config.timeout_seconds ?? ''}
          onChange={(e) => onUpdateConfig(stage.id, { timeout_seconds: e.target.value ? parseInt(e.target.value) : undefined })}
          placeholder="No limit"
          className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        />
      </div>

      {/* Advanced settings */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Advanced
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3 pl-2 border-l border-slate-100">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Input Mapping (JSON)</label>
              <textarea
                value={JSON.stringify(stage.config.input_mapping, null, 2)}
                onChange={(e) => {
                  try {
                    onUpdateConfig(stage.id, { input_mapping: JSON.parse(e.target.value) })
                  } catch { /* ignore parse errors */ }
                }}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Output Mapping (JSON)</label>
              <textarea
                value={JSON.stringify(stage.config.output_mapping, null, 2)}
                onChange={(e) => {
                  try {
                    onUpdateConfig(stage.id, { output_mapping: JSON.parse(e.target.value) })
                  } catch { /* ignore parse errors */ }
                  }
                }
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Conditions (comma-separated)</label>
              <input
                value={stage.config.conditions.join(', ')}
                onChange={(e) => onUpdateConfig(stage.id, { conditions: e.target.value.split(',').map((c) => c.trim()).filter(Boolean) })}
                placeholder="condition1, condition2"
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
