import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSkills, useTools, useModels, useAgentFactoryFull } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader'
import type { AgentFactoryFullBody, Skill, Tool, ModelConfiguration } from '../types'
import {
  Wand2, Sparkles, Wrench, Settings, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, FileJson, Shield, Clock, Coins, Eye, Cpu, Bot, ChevronRight,
} from 'lucide-react'

const AGENT_CATEGORIES = [
  'Requirement', 'Product Analysis', 'Architecture', 'Coding', 'Code Review',
  'Test Generation', 'JUnit', 'API Testing', 'Security', 'SAST',
  'Dependency Security', 'Build', 'Release Planning', 'Release Notes',
  'Deployment', 'Verification', 'Operations', 'Incident Analysis',
  'Root Cause', 'Remediation', 'Custom',
]

const STEPS = [
  { num: 1, label: 'Describe', icon: Wand2 },
  { num: 2, label: 'Definition', icon: Sparkles },
  { num: 3, label: 'Contract', icon: FileJson },
  { num: 4, label: 'Skills', icon: Settings },
  { num: 5, label: 'Tools', icon: Wrench },
  { num: 6, label: 'Model', icon: Cpu },
  { num: 7, label: 'Governance', icon: Shield },
  { num: 8, label: 'Evidence', icon: CheckCircle2 },
  { num: 9, label: 'Review', icon: Eye },
  { num: 10, label: 'Publish', icon: CheckCircle2 },
]

export default function AgentFactoryPage() {
  const navigate = useNavigate()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: models } = useModels()
  const factoryFull = useAgentFactoryFull()

  const [step, setStep] = useState(1)

  // Step 1
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Custom')

  // Step 2 - generated definition
  const [displayName, setDisplayName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [role, setRole] = useState('')
  const [systemInstructions, setSystemInstructions] = useState('')
  const [contextRequirements, setContextRequirements] = useState<string[]>([])

  // Step 3 - contract
  const [inputSchema, setInputSchema] = useState('{}')
  const [outputSchema, setOutputSchema] = useState('{}')
  const [contextContract, setContextContract] = useState('{}')

  // Step 4 - skills
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])

  // Step 5 - tools
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])

  // Step 6 - model
  const [modelId, setModelId] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [tokenLimit, setTokenLimit] = useState(200000)

  // Step 7 - governance
  const [permissions, setPermissions] = useState<string[]>([])
  const [securityRestrictions, setSecurityRestrictions] = useState<string[]>([])
  const [maxTurns, setMaxTurns] = useState(15)
  const [timeoutSeconds, setTimeoutSeconds] = useState(600)
  const [costBudgetCents, setCostBudgetCents] = useState(500)
  const [retryMaxRetries, setRetryMaxRetries] = useState(3)
  const [failureBehavior, setFailureBehavior] = useState('escalate')

  // Step 8 - evidence
  const [evidenceRequirements, setEvidenceRequirements] = useState<string[]>([
    'input', 'output', 'model_used', 'tokens',
  ])

  const skillList = useMemo(() => skills ?? [], [skills])
  const toolList = useMemo(() => tools ?? [], [tools])
  const modelList = useMemo(() => models ?? [], [models])

  const generateDefinition = () => {
    const name = description.slice(0, 50).trim()
    setDisplayName(name ? name.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Custom Agent')
    setPurpose(description)
    setRole('Engineering Agent')
    setSystemInstructions(
      `You are a ${displayName || 'Custom Agent'}. ${description}\n\n` +
      `Your responsibility is to perform engineering work following your contract.\n` +
      `Always produce evidence of your work.\n` +
      `Follow all governance policies and security restrictions.\n` +
      `Produce structured output matching your output schema.`
    )
    setContextRequirements(['repository', 'relevant_files', 'engineering_state'])

    const matchingSkills = skillList
      .filter((s) => {
        const desc = description.toLowerCase()
        return s.language.toLowerCase().split(' ').some((w) => w && desc.includes(w)) ||
               s.framework.toLowerCase().split(' ').some((w) => w && desc.includes(w)) ||
               s.display_name.toLowerCase().split(' ').some((w) => w.length > 3 && desc.includes(w.toLowerCase()))
      })
      .slice(0, 5)
    setSelectedSkillIds(matchingSkills.map((s) => s.id))

    const matchingTools = toolList
      .filter((t) => {
        const desc = description.toLowerCase()
        return t.display_name.toLowerCase().split(' ').some((w) => w.length > 2 && desc.includes(w.toLowerCase())) ||
               t.name.toLowerCase().split(' ').some((w) => w.length > 2 && desc.includes(w))
      })
      .slice(0, 5)
    setSelectedToolIds(matchingTools.map((t) => t.id))

    if (modelList.length > 0) setModelId(modelList[0].id)

    setInputSchema(JSON.stringify({
      type: 'object',
      required: ['task', 'context'],
      properties: {
        task: { type: 'string', description: 'The engineering task to perform' },
        context: { type: 'object', description: 'Engineering context including files, APIs, and dependencies' },
      },
    }, null, 2))

    setOutputSchema(JSON.stringify({
      type: 'object',
      required: ['result', 'evidence'],
      properties: {
        result: { type: 'string', description: 'Engineering output' },
        evidence: { type: 'object', description: 'Proof of work performed' },
        files_changed: { type: 'array', description: 'List of files modified' },
      },
    }, null, 2))

    setContextContract(JSON.stringify({
      required_context: ['repository', 'relevant_files'],
      optional_context: ['engineering_state', 'previous_evidence', 'git_diff'],
      max_context_tokens: 50000,
    }, null, 2))

    setPermissions([`agent:${(displayName || 'custom').toLowerCase().replace(/\s+/g, '-')}:execute`])
    setSecurityRestrictions(['sandboxed_execution', 'no_network_egress', 'no_secret_access'])
  }

  const handlePublish = () => {
    let parsedInput = {}
    let parsedOutput = {}
    let parsedContext = {}
    try { parsedInput = JSON.parse(inputSchema) } catch { /* */ }
    try { parsedOutput = JSON.parse(outputSchema) } catch { /* */ }
    try { parsedContext = JSON.parse(contextContract) } catch { /* */ }

    const body: AgentFactoryFullBody = {
      display_name: displayName,
      purpose,
      role,
      category,
      system_instructions: systemInstructions,
      skill_ids: selectedSkillIds,
      tool_ids: selectedToolIds,
      model_config_id: modelId || undefined,
      context_requirements: contextRequirements,
      permissions,
      security_restrictions: securityRestrictions,
      evidence_requirements: evidenceRequirements,
      max_turns: maxTurns,
      timeout_seconds: timeoutSeconds,
      token_budget: tokenLimit,
      cost_budget_cents: costBudgetCents,
      retry_policy: { max_retries: retryMaxRetries, backoff: 'exponential' },
      failure_behavior: failureBehavior,
      input_schema: parsedInput,
      output_schema: parsedOutput,
      context_contract: parsedContext,
    }

    factoryFull.mutate(body, {
      onSuccess: (agent) => {
        navigate(`/agents/${agent.id}`)
      },
    })
  }

  const canProceed = () => {
    switch (step) {
      case 1: return description.trim().length > 0
      case 2: return displayName.trim().length > 0
      case 3: return true
      case 4: return true
      case 5: return true
      case 6: return !!modelId
      case 7: return true
      case 8: return evidenceRequirements.length > 0
      case 9: return true
      case 10: return true
      default: return true
    }
  }

  const nextStep = () => {
    if (step === 1) generateDefinition()
    if (step < 10) setStep(step + 1)
  }
  const prevStep = () => { if (step > 1) setStep(step - 1) }

  return (
    <>
      <PageHeader
        title="Agent Factory"
        description="Generate a harness-compatible engineering agent from a natural language description"
        breadcrumbs={[{ label: 'Agents', to: '/agents' }, { label: 'Agent Factory' }]}
      />

      {/* Stepper */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.num
            const isDone = step > s.num
            return (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200'
                      : isDone
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-400'
                  }`}
                >
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                    isActive ? 'bg-forgeiq-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : s.num}
                  </div>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300 mx-0.5" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-6">
        <div className="fi-card">
          {/* Step 1: Describe */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Describe the Agent</h3>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  Agent Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="e.g. Create an agent that analyzes Spring Boot applications and identifies API breaking changes"
                  className="fi-input w-full resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  Category
                </label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="fi-input w-auto">
                  {AGENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
                ForgeIQ will generate an Agent Definition with Purpose, Role, System Instructions, Capabilities, Required Skills, Required Tools, Context Requirements, Input Contract, Output Contract, Permissions, Execution Limits, and Evidence Requirements.
              </div>
            </div>
          )}

          {/* Step 2: Definition */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">AI-Generated Agent Definition</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Display Name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="fi-input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                  <input value={role} onChange={(e) => setRole(e.target.value)} className="fi-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Purpose</label>
                <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className="fi-input w-full resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">System Instructions</label>
                <textarea value={systemInstructions} onChange={(e) => setSystemInstructions(e.target.value)} rows={8} className="fi-input w-full resize-none font-mono text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Context Requirements</label>
                <div className="flex flex-wrap gap-1.5">
                  {contextRequirements.map((req, i) => (
                    <span key={i} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 text-xs">
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contract */}
          {step === 3 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Agent Contract</h3>
              </div>
              <p className="text-sm text-slate-500">The agent contract defines input/output schemas and context requirements. Harnesses reference contracts rather than relying on arbitrary prompts.</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Input Schema (JSON)</label>
                  <textarea value={inputSchema} onChange={(e) => setInputSchema(e.target.value)} rows={12} className="fi-input w-full resize-none font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Output Schema (JSON)</label>
                  <textarea value={outputSchema} onChange={(e) => setOutputSchema(e.target.value)} rows={12} className="fi-input w-full resize-none font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Context Contract (JSON)</label>
                  <textarea value={contextContract} onChange={(e) => setContextContract(e.target.value)} rows={12} className="fi-input w-full resize-none font-mono text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Harness Compatible: This agent can be referenced by any harness graph node.</span>
              </div>
            </div>
          )}

          {/* Step 4: Skills */}
          {step === 4 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Select Required Skills</h3>
              </div>
              <p className="text-sm text-slate-500">Skills are reusable engineering capabilities attached to the agent.</p>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {skillList.map((skill: Skill) => {
                  const selected = selectedSkillIds.includes(skill.id)
                  return (
                    <button
                      key={skill.id}
                      onClick={() => {
                        setSelectedSkillIds(selected
                          ? selectedSkillIds.filter((id) => id !== skill.id)
                          : [...selectedSkillIds, skill.id])
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-colors text-left ${
                        selected ? 'border-forgeiq-300 bg-forgeiq-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-forgeiq-600 border-forgeiq-600' : 'border-slate-300'
                      }`}>
                        {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{skill.display_name}</div>
                        <div className="text-xs text-slate-500 truncate">{skill.description}</div>
                      </div>
                      <span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{skill.category}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-xs text-slate-500">{selectedSkillIds.length} skills selected</div>
            </div>
          )}

          {/* Step 5: Tools */}
          {step === 5 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Select Tools</h3>
              </div>
              <p className="text-sm text-slate-500">Tools are controlled execution capabilities. Every tool has permissions, risk level, and evidence requirements.</p>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {toolList.map((tool: Tool) => {
                  const selected = selectedToolIds.includes(tool.id)
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setSelectedToolIds(selected
                          ? selectedToolIds.filter((id) => id !== tool.id)
                          : [...selectedToolIds, tool.id])
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-colors text-left ${
                        selected ? 'border-forgeiq-300 bg-forgeiq-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-forgeiq-600 border-forgeiq-600' : 'border-slate-300'
                      }`}>
                        {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{tool.display_name}</div>
                        <div className="text-xs text-slate-500 truncate">{tool.description}</div>
                      </div>
                      <span className={`fi-badge text-xs ${
                        tool.risk_level === 'LOW' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        tool.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        tool.risk_level === 'HIGH' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>{tool.risk_level}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-xs text-slate-500">{selectedToolIds.length} tools selected</div>
            </div>
          )}

          {/* Step 6: Model */}
          {step === 6 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Model Configuration</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Provider / Model</label>
                  <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="fi-input w-full">
                    <option value="">Select model...</option>
                    {modelList.map((m: ModelConfiguration) => (
                      <option key={m.id} value={m.id}>{m.display_name} ({m.provider})</option>
                    ))}
                  </select>
                </div>
                {modelId && (() => {
                  const m = modelList.find((mo) => mo.id === modelId)
                  if (!m) return null
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-md">
                      <div>
                        <div className="text-xs text-slate-500">Context Size</div>
                        <div className="text-sm font-medium text-slate-900">{m.context_size.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Token Limit</div>
                        <div className="text-sm font-medium text-slate-900">{m.token_limit.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Input Cost</div>
                        <div className="text-sm font-medium text-slate-900">${(m.cost_per_1k_input_cents / 100).toFixed(3)}/1K</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Output Cost</div>
                        <div className="text-sm font-medium text-slate-900">${(m.cost_per_1k_output_cents / 100).toFixed(3)}/1K</div>
                      </div>
                    </div>
                  )
                })()}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Temperature: {temperature}</label>
                    <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Token Limit</label>
                    <input type="number" value={tokenLimit} onChange={(e) => setTokenLimit(parseInt(e.target.value) || 0)} className="fi-input w-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Governance */}
          {step === 7 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Governance & Execution Limits</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Permissions</label>
                  <div className="flex flex-wrap gap-1.5">
                    {permissions.map((p, i) => (
                      <span key={i} className="fi-badge bg-red-50 text-red-700 border border-red-200 text-xs">{p}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Security Restrictions</label>
                  <div className="flex flex-wrap gap-1.5">
                    {securityRestrictions.map((s, i) => (
                      <span key={i} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Clock className="h-3 w-3" /> Max Turns</label>
                    <input type="number" value={maxTurns} onChange={(e) => setMaxTurns(parseInt(e.target.value) || 0)} className="fi-input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Clock className="h-3 w-3" /> Timeout (s)</label>
                    <input type="number" value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 0)} className="fi-input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Coins className="h-3 w-3" /> Cost Budget ($)</label>
                    <input type="number" step="0.01" value={costBudgetCents / 100} onChange={(e) => setCostBudgetCents(Math.round(parseFloat(e.target.value) * 100))} className="fi-input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Max Retries</label>
                    <input type="number" value={retryMaxRetries} onChange={(e) => setRetryMaxRetries(parseInt(e.target.value) || 0)} className="fi-input w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Failure Behavior</label>
                  <select value={failureBehavior} onChange={(e) => setFailureBehavior(e.target.value)} className="fi-input w-auto">
                    <option value="escalate">Escalate to Human</option>
                    <option value="retry">Retry with Backoff</option>
                    <option value="abort">Abort Execution</option>
                    <option value="rollback">Trigger Rollback</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Evidence */}
          {step === 8 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Evidence Requirements</h3>
              </div>
              <p className="text-sm text-slate-500">Define what evidence the agent must produce for every execution. Evidence is immutable and auditable.</p>
              <div className="space-y-1.5">
                {['input', 'output', 'model_used', 'tokens', 'cost', 'tool_calls', 'permissions_checked', 'policies_applied', 'code_changes', 'test_results'].map((req) => {
                  const selected = evidenceRequirements.includes(req)
                  return (
                    <button
                      key={req}
                      onClick={() => {
                        setEvidenceRequirements(selected
                          ? evidenceRequirements.filter((r) => r !== req)
                          : [...evidenceRequirements, req])
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-colors text-left ${
                        selected ? 'border-forgeiq-300 bg-forgeiq-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-forgeiq-600 border-forgeiq-600' : 'border-slate-300'
                      }`}>
                        {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{req}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-xs text-slate-500">{evidenceRequirements.length} evidence requirements selected</div>
            </div>
          )}

          {/* Step 9: Review */}
          {step === 9 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Review Complete Agent</h3>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-md">
                  <div>
                    <div className="text-xs text-slate-500">Name</div>
                    <div className="text-sm font-medium text-slate-900">{displayName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Category</div>
                    <div className="text-sm font-medium text-slate-900">{category}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Role</div>
                    <div className="text-sm font-medium text-slate-900">{role}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Model</div>
                    <div className="text-sm font-medium text-slate-900">{modelList.find((m) => m.id === modelId)?.display_name ?? '—'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-md">
                  <div><div className="text-xs text-slate-500">Skills</div><div className="text-sm font-medium text-slate-900">{selectedSkillIds.length}</div></div>
                  <div><div className="text-xs text-slate-500">Tools</div><div className="text-sm font-medium text-slate-900">{selectedToolIds.length}</div></div>
                  <div><div className="text-xs text-slate-500">Max Turns</div><div className="text-sm font-medium text-slate-900">{maxTurns}</div></div>
                  <div><div className="text-xs text-slate-500">Timeout</div><div className="text-sm font-medium text-slate-900">{timeoutSeconds}s</div></div>
                  <div><div className="text-xs text-slate-500">Token Budget</div><div className="text-sm font-medium text-slate-900">{tokenLimit.toLocaleString()}</div></div>
                  <div><div className="text-xs text-slate-500">Cost Budget</div><div className="text-sm font-medium text-slate-900">${(costBudgetCents / 100).toFixed(2)}</div></div>
                  <div><div className="text-xs text-slate-500">Max Retries</div><div className="text-sm font-medium text-slate-900">{retryMaxRetries}</div></div>
                  <div><div className="text-xs text-slate-500">Failure Behavior</div><div className="text-sm font-medium text-slate-900">{failureBehavior}</div></div>
                </div>
                <div className="p-4 bg-slate-50 rounded-md">
                  <div className="text-xs text-slate-500 mb-1">System Instructions</div>
                  <div className="text-sm text-slate-600 max-h-32 overflow-y-auto font-mono">{systemInstructions}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-md">
                  <div className="text-xs text-slate-500 mb-2">Evidence Requirements</div>
                  <div className="flex flex-wrap gap-1.5">
                    {evidenceRequirements.map((r) => (
                      <span key={r} className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">{r}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-600 p-3 bg-emerald-50 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Harness Compatible: This agent will be automatically available for harness graph nodes.</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Publish */}
          {step === 10 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-forgeiq-600" />
                <h3 className="text-sm font-semibold text-slate-900">Publish Agent</h3>
              </div>
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-forgeiq-600" />
                </div>
                <h4 className="text-base font-semibold text-slate-900 mb-1">{displayName}</h4>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  The agent will be created with a v1 draft version. You can publish the version from the agent detail page to make it available for harnesses.
                </p>
                {factoryFull.isError && (
                  <div className="flex items-center justify-center gap-2 text-sm text-red-600 mb-4">
                    <AlertCircle className="h-4 w-4" /> Failed to create agent
                  </div>
                )}
                <button
                  onClick={handlePublish}
                  disabled={factoryFull.isPending}
                  className="fi-button-primary"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {factoryFull.isPending ? 'Creating Agent...' : 'Create Agent'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < 10 && (
            <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className="fi-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <span className="text-xs text-slate-500">Step {step} of 10</span>
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="fi-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 1 ? 'Generate Definition' : 'Next'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
