import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Check, X } from 'lucide-react'
import {
  useHarnesses,
  useGraphs,
  useLoops,
  useAgents,
  useSkills,
  useTools,
  useModels,
  useCreateHarness,
} from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Harness } from '../types'

interface FormData {
  name: string
  display_name: string
  purpose: string
  harness_type: string
  graph_id: string
  loop_ids: string[]
  agent_ids: string[]
  skill_ids: string[]
  tool_ids: string[]
  model_config_ids: string[]
  environment: string
  cost_limit_cents: number
  time_limit_seconds: number
  approval_required: boolean
}

const HARNESS_TYPES = ['standard', 'pipeline', 'interactive', 'autonomous', 'supervised']
const ENVIRONMENTS = ['development', 'staging', 'production']

export default function HarnessBuilderPage() {
  const navigate = useNavigate()
  const { data: harnesses, isLoading: harnessesLoading } = useHarnesses()
  const { data: graphs } = useGraphs()
  const { data: loops } = useLoops()
  const { data: agents } = useAgents()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: models } = useModels()
  const createHarness = useCreateHarness()

  const [form, setForm] = useState<FormData>({
    name: '',
    display_name: '',
    purpose: '',
    harness_type: 'standard',
    graph_id: '',
    loop_ids: [],
    agent_ids: [],
    skill_ids: [],
    tool_ids: [],
    model_config_ids: [],
    environment: 'development',
    cost_limit_cents: 1000,
    time_limit_seconds: 300,
    approval_required: false,
  })

  const update = (field: keyof FormData, value: string | number | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleArrayValue = (field: keyof FormData, id: string) => {
    setForm((prev) => {
      const arr = prev[field] as string[]
      return {
        ...prev,
        [field]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createHarness.mutate(form, {
      onSuccess: () => {
        navigate('/harnesses')
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Harness Builder"
        description="Create a new execution harness by composing graphs, loops, agents, skills, and tools"
      />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar: existing harnesses */}
        <div className="w-72 border-r border-slate-200 bg-slate-50 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-semibold text-slate-900">Existing Harnesses</h3>
          </div>
          {harnessesLoading ? (
            <LoadingSpinner />
          ) : !harnesses?.length ? (
            <div className="p-4">
              <EmptyState message="No harnesses yet" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {harnesses.map((h: Harness) => (
                <li
                  key={h.id}
                  onClick={() => navigate(`/harnesses/${h.id}`)}
                  className="px-4 py-2.5 cursor-pointer hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {h.display_name || h.name}
                    </span>
                  </div>
                  <div className="ml-5.5 text-xs text-slate-400 mt-0.5">
                    {h.harness_type} · {h.environment}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
            {/* Basic Info */}
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="fi-input"
                    placeholder="my-harness"
                  />
                </Field>
                <Field label="Display Name">
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => update('display_name', e.target.value)}
                    className="fi-input"
                    placeholder="My Harness"
                  />
                </Field>
                <Field label="Purpose" full>
                  <textarea
                    value={form.purpose}
                    onChange={(e) => update('purpose', e.target.value)}
                    className="fi-input"
                    rows={2}
                    placeholder="Describe the harness purpose..."
                  />
                </Field>
                <Field label="Type">
                  <select
                    value={form.harness_type}
                    onChange={(e) => update('harness_type', e.target.value)}
                    className="fi-input"
                  >
                    {HARNESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Environment">
                  <select
                    value={form.environment}
                    onChange={(e) => update('environment', e.target.value)}
                    className="fi-input"
                  >
                    {ENVIRONMENTS.map((env) => (
                      <option key={env} value={env}>
                        {env}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* Composition */}
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Composition</h3>
              <div className="space-y-4">
                <Field label="Graph">
                  <select
                    value={form.graph_id}
                    onChange={(e) => update('graph_id', e.target.value)}
                    className="fi-input"
                  >
                    <option value="">— Select graph —</option>
                    {(graphs || []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.display_name || g.name} (v{g.version})
                      </option>
                    ))}
                  </select>
                </Field>

                <MultiSelect
                  label="Loops"
                  options={(loops || []).map((l) => ({
                    id: l.id,
                    label: l.display_name || l.name,
                    sub: l.loop_type,
                  }))}
                  selected={form.loop_ids}
                  onToggle={(id) => toggleArrayValue('loop_ids', id)}
                />

                <MultiSelect
                  label="Agents"
                  options={(agents || []).map((a) => ({
                    id: a.id,
                    label: a.display_name || a.name,
                    sub: a.role,
                  }))}
                  selected={form.agent_ids}
                  onToggle={(id) => toggleArrayValue('agent_ids', id)}
                />

                <MultiSelect
                  label="Skills"
                  options={(skills || []).map((s) => ({
                    id: s.id,
                    label: s.display_name || s.name,
                    sub: s.category,
                  }))}
                  selected={form.skill_ids}
                  onToggle={(id) => toggleArrayValue('skill_ids', id)}
                />

                <MultiSelect
                  label="Tools"
                  options={(tools || []).map((t) => ({
                    id: t.id,
                    label: t.display_name || t.name,
                    sub: t.category,
                  }))}
                  selected={form.tool_ids}
                  onToggle={(id) => toggleArrayValue('tool_ids', id)}
                />

                <MultiSelect
                  label="Models"
                  options={(models || []).map((m) => ({
                    id: m.id,
                    label: m.display_name || m.name,
                    sub: `${m.provider} / ${m.model}`,
                  }))}
                  selected={form.model_config_ids}
                  onToggle={(id) => toggleArrayValue('model_config_ids', id)}
                />
              </div>
            </div>

            {/* Limits & Approval */}
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Limits & Approval</h3>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Cost Limit (cents)">
                  <input
                    type="number"
                    min={0}
                    value={form.cost_limit_cents}
                    onChange={(e) => update('cost_limit_cents', Number(e.target.value))}
                    className="fi-input"
                  />
                </Field>
                <Field label="Time Limit (seconds)">
                  <input
                    type="number"
                    min={0}
                    value={form.time_limit_seconds}
                    onChange={(e) => update('time_limit_seconds', Number(e.target.value))}
                    className="fi-input"
                  />
                </Field>
                <Field label="Approval Required">
                  <label className="flex items-center h-9 gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.approval_required}
                      onChange={(e) => update('approval_required', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-forgeiq-600 focus:ring-forgeiq-500"
                    />
                    <span className="text-sm text-slate-700">Require approval</span>
                  </label>
                </Field>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createHarness.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-forgeiq-600 px-4 py-2 text-sm font-medium text-white hover:bg-forgeiq-700 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {createHarness.isPending ? 'Creating...' : 'Create Harness'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/harnesses')}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              {createHarness.isError && (
                <span className="text-sm text-red-600">
                  Error: {(createHarness.error as Error).message}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: { id: string; label: string; sub?: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label} {selected.length > 0 && <span className="text-forgeiq-600">({selected.length})</span>}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 ? (
          <span className="text-sm text-slate-400">None available</span>
        ) : (
          options.map((opt) => {
            const isSelected = selected.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggle(opt.id)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors border ${
                  isSelected
                    ? 'bg-forgeiq-600 text-white border-forgeiq-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {opt.label}
                {opt.sub && <span className="opacity-60">· {opt.sub}</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
