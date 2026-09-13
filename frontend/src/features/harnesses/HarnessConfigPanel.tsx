import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Agent, Skill, Tool, ModelConfiguration, Loop, Policy } from '../../types'
import type { HarnessConfig } from './types'

interface HarnessConfigPanelProps {
  config: HarnessConfig
  agents: Agent[]
  skills: Skill[]
  tools: Tool[]
  models: ModelConfiguration[]
  loops: Loop[]
  policies: Policy[]
  onChange: (patch: Partial<HarnessConfig>) => void
}

const HARNESS_TYPES = [
  'development', 'testing', 'security', 'build', 'release',
  'deployment', 'verification', 'operations', 'remediation',
  'architecture', 'incident', 'brownfield_discovery', 'custom',
]
const ENVIRONMENTS = ['development', 'staging', 'production']

export function HarnessConfigPanel({ config, agents, skills, tools, models, loops, policies, onChange }: HarnessConfigPanelProps) {
  const [openSection, setOpenSection] = useState<string>('basic')

  const toggle = (s: string) => setOpenSection(openSection === s ? '' : s)

  return (
    <div className="space-y-1">
      <Section title="Basic" open={openSection === 'basic'} onToggle={() => toggle('basic')}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Name">
            <input type="text" value={config.name} onChange={(e) => onChange({ name: e.target.value })} className="fi-input" />
          </Field>
          <Field label="Display Name">
            <input type="text" value={config.display_name} onChange={(e) => onChange({ display_name: e.target.value })} className="fi-input" />
          </Field>
          <Field label="Type" full>
            <select value={config.harness_type} onChange={(e) => onChange({ harness_type: e.target.value })} className="fi-input">
              {HARNESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Environment">
            <select value={config.environment} onChange={(e) => onChange({ environment: e.target.value })} className="fi-input">
              {ENVIRONMENTS.map((env) => <option key={env} value={env}>{env}</option>)}
            </select>
          </Field>
          <Field label="Approval Required">
            <label className="flex items-center h-9 gap-2 cursor-pointer">
              <input type="checkbox" checked={config.approval_required} onChange={(e) => onChange({ approval_required: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-forgeiq-600" />
              <span className="text-sm text-slate-700">Required</span>
            </label>
          </Field>
          <Field label="Purpose" full>
            <textarea value={config.purpose} onChange={(e) => onChange({ purpose: e.target.value })} className="fi-input" rows={2} />
          </Field>
        </div>
      </Section>

      <Section title="Inputs / Outputs" open={openSection === 'io'} onToggle={() => toggle('io')}>
        <Field label="Inputs (comma-separated)">
          <input type="text" value={config.inputs.join(', ')} onChange={(e) => onChange({ inputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="fi-input" />
        </Field>
        <Field label="Outputs (comma-separated)">
          <input type="text" value={config.outputs.join(', ')} onChange={(e) => onChange({ outputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="fi-input" />
        </Field>
      </Section>

      <Section title="Composition" open={openSection === 'composition'} onToggle={() => toggle('composition')}>
        <MultiSelect label="Agents" options={agents.map((a) => ({ id: a.id, label: a.display_name, sub: a.role }))} selected={config.agent_ids} onToggle={(id) => toggleArray(config, 'agent_ids', id, onChange)} />
        <MultiSelect label="Skills" options={skills.map((s) => ({ id: s.id, label: s.display_name, sub: s.category }))} selected={config.skill_ids} onToggle={(id) => toggleArray(config, 'skill_ids', id, onChange)} />
        <MultiSelect label="Tools" options={tools.map((t) => ({ id: t.id, label: t.display_name, sub: t.risk_level }))} selected={config.tool_ids} onToggle={(id) => toggleArray(config, 'tool_ids', id, onChange)} />
        <MultiSelect label="Models" options={models.map((m) => ({ id: m.id, label: m.display_name, sub: m.provider }))} selected={config.model_config_ids} onToggle={(id) => toggleArray(config, 'model_config_ids', id, onChange)} />
        <MultiSelect label="Loops" options={loops.map((l) => ({ id: l.id, label: l.display_name, sub: l.loop_type }))} selected={config.loop_ids} onToggle={(id) => toggleArray(config, 'loop_ids', id, onChange)} />
        <MultiSelect label="Policies" options={policies.map((p) => ({ id: p.id, label: p.display_name, sub: p.policy_type }))} selected={config.policy_ids} onToggle={(id) => toggleArray(config, 'policy_ids', id, onChange)} />
      </Section>

      <Section title="Limits" open={openSection === 'limits'} onToggle={() => toggle('limits')}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Cost Limit (cents)">
            <input type="number" value={config.cost_limit_cents} onChange={(e) => onChange({ cost_limit_cents: Number(e.target.value) })} className="fi-input" />
          </Field>
          <Field label="Time Limit (seconds)">
            <input type="number" value={config.time_limit_seconds} onChange={(e) => onChange({ time_limit_seconds: Number(e.target.value) })} className="fi-input" />
          </Field>
        </div>
      </Section>

      <Section title="Retry / Failure / Escalation" open={openSection === 'rules'} onToggle={() => toggle('rules')}>
        <Field label="Max Retries">
          <input type="number" value={(config.retry_rules.max_retries as number) || 3} onChange={(e) => onChange({ retry_rules: { ...config.retry_rules, max_retries: Number(e.target.value) } })} className="fi-input" />
        </Field>
        <Field label="Failure Action">
          <select value={(config.failure_rules.action as string) || 'diagnose'} onChange={(e) => onChange({ failure_rules: { ...config.failure_rules, action: e.target.value } })} className="fi-input">
            <option value="diagnose">Diagnose</option>
            <option value="rollback">Rollback</option>
            <option value="remediate">Remediate</option>
            <option value="escalate">Escalate</option>
          </select>
        </Field>
        <Field label="Escalation Target">
          <input type="text" value={(config.escalation_rules.target as string) || ''} onChange={(e) => onChange({ escalation_rules: { ...config.escalation_rules, target: e.target.value } })} className="fi-input" placeholder="Engineering Lead" />
        </Field>
      </Section>

      <Section title="Permissions & Evidence" open={openSection === 'perms'} onToggle={() => toggle('perms')}>
        <Field label="Permissions (comma-separated)">
          <input type="text" value={config.permissions.join(', ')} onChange={(e) => onChange({ permissions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="fi-input" />
        </Field>
        <Field label="Evidence Requirements (comma-separated)">
          <input type="text" value={config.evidence_requirements.join(', ')} onChange={(e) => onChange({ evidence_requirements: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="fi-input" />
        </Field>
      </Section>
    </div>
  )
}

function toggleArray(config: HarnessConfig, field: string, id: string, onChange: (patch: Partial<HarnessConfig>) => void) {
  const arr = (config as unknown as Record<string, string[]>)[field]
  const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
  onChange({ [field]: next } as unknown as Partial<HarnessConfig>)
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="fi-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50">
    <span className="text-sm font-semibold text-slate-800">{title}</span>
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function MultiSelect({ label, options, selected, onToggle }: { label: string; options: { id: string; label: string; sub?: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label} {selected.length > 0 && <span className="text-forgeiq-600">({selected.length})</span>}</label>
      <div className="flex flex-wrap gap-1">
        {options.length === 0 ? <span className="text-xs text-slate-400">None available</span> : options.map((opt) => {
          const isSel = selected.includes(opt.id)
          return (
            <button key={opt.id} type="button" onClick={() => onToggle(opt.id)} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border transition-colors ${isSel ? 'bg-forgeiq-600 text-white border-forgeiq-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {opt.label}
              {opt.sub && <span className="opacity-60">{opt.sub}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
