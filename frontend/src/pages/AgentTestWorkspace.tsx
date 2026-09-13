import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAgent, useTestAgent, useSkills, useTools, useModels } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { AgentTestResult, AgentTestEvent, Skill, Tool, ModelConfiguration } from '../types'
import {
  ArrowLeft, Play, Bot, CheckCircle2, XCircle, Clock, Cpu, Wrench,
  Settings, Shield, FileText, ChevronRight, Loader2, AlertCircle,
} from 'lucide-react'

const phaseIcons: Record<string, typeof Play> = {
  validation: CheckCircle2,
  context_preparation: Settings,
  permission_check: Shield,
  policy_check: Shield,
  skill_binding: Settings,
  tool_binding: Wrench,
  model_invocation: Cpu,
  model_completion: CheckCircle2,
}

const statusIcons: Record<string, typeof CheckCircle2> = {
  passed: CheckCircle2,
  completed: CheckCircle2,
  running: Loader2,
  failed: XCircle,
}

const statusColors: Record<string, string> = {
  passed: 'text-emerald-600',
  completed: 'text-emerald-600',
  running: 'text-blue-600',
  failed: 'text-red-600',
}

export default function AgentTestWorkspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agent, isLoading } = useAgent(id!)
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: models } = useModels()
  const testAgent = useTestAgent()

  const [inputs, setInputs] = useState('{\n  "task": "Analyze the codebase for API breaking changes",\n  "context": {\n    "repository": "payment-gateway",\n    "branch": "main"\n  }\n}')
  const [context, setContext] = useState('{\n  "relevant_files": ["src/main/java/PaymentService.java"],\n  "engineering_state": {"version": "5.1.0"},\n  "git_diff": "abc123"\n}')
  const [result, setResult] = useState<AgentTestResult | null>(null)

  const skillMap = new Map<string, Skill>()
  ;(skills ?? []).forEach((s) => skillMap.set(s.id, s))
  const toolMap = new Map<string, Tool>()
  ;(tools ?? []).forEach((t) => toolMap.set(t.id, t))
  const modelMap = new Map<string, ModelConfiguration>()
  ;(models ?? []).forEach((m) => modelMap.set(m.id, m))

  const handleTest = () => {
    let parsedInputs = {}
    let parsedContext = {}
    try { parsedInputs = JSON.parse(inputs) } catch { /* */ }
    try { parsedContext = JSON.parse(context) } catch { /* */ }
    testAgent.mutate(
      { id: agent!.id, body: { inputs: parsedInputs, context: parsedContext } },
      { onSuccess: (data) => setResult(data) }
    )
  }

  if (isLoading) return (
    <>
      <PageHeader title="Agent Test Workspace" />
      <LoadingSpinner />
    </>
  )
  if (!agent) return (
    <>
      <PageHeader title="Agent Test Workspace" />
      <EmptyState message="Agent not found" />
    </>
  )

  const model = modelMap.get(agent.model_config_id ?? '')

  return (
    <>
      <PageHeader
        title="Agent Test Workspace"
        description={`Execute and trace ${agent.display_name} v${agent.current_version}`}
        breadcrumbs={[{ label: 'Agents', to: '/agents' }, { label: agent.display_name, to: `/agents/${agent.id}` }, { label: 'Test' }]}
        actions={
          <button onClick={() => navigate(`/agents/${agent.id}`)} className="fi-button-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input + Context */}
        <div className="space-y-4">
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-forgeiq-600" /> Agent Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500 uppercase">Category</div>
                <div className="text-sm font-medium text-slate-900">{agent.category}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Model</div>
                <div className="text-sm font-medium text-slate-900">{model?.display_name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Skills</div>
                <div className="text-sm font-medium text-slate-900">{agent.skill_ids.length}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Tools</div>
                <div className="text-sm font-medium text-slate-900">{agent.tool_ids.length}</div>
              </div>
            </div>
          </div>

          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Input (Contract Input Schema)</h3>
            <textarea
              value={inputs}
              onChange={(e) => setInputs(e.target.value)}
              rows={8}
              className="fi-input w-full resize-none font-mono text-xs"
            />
          </div>

          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Context (Context Contract)</h3>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={6}
              className="fi-input w-full resize-none font-mono text-xs"
            />
          </div>

          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Bound Tools</h3>
            {agent.tool_ids.length === 0 ? (
              <p className="text-sm text-slate-400">No tools bound</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {agent.tool_ids.map((tid) => {
                  const t = toolMap.get(tid)
                  return (
                    <span key={tid} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">
                      <Wrench className="h-3 w-3 mr-0.5" /> {t?.display_name ?? tid.slice(0, 8)}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleTest}
            disabled={testAgent.isPending}
            className="fi-button-primary w-full"
          >
            <Play className="h-4 w-4" />
            {testAgent.isPending ? 'Executing...' : 'Execute Agent'}
          </button>
          {testAgent.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" /> Failed to execute agent
            </div>
          )}
        </div>

        {/* Right: Execution Trace + Output + Evidence */}
        <div className="space-y-4">
          {testAgent.isPending && !result && <LoadingSpinner />}

          {!result && !testAgent.isPending && (
            <div className="fi-card p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Play className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-400">Execute the agent to see the full execution lifecycle</p>
            </div>
          )}

          {result && (
            <>
              {/* Execution Trace */}
              <div className="fi-card">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-forgeiq-600" /> Execution Trace
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-0">
                    {result.events.map((evt: AgentTestEvent, i: number) => {
                      const PhaseIcon = phaseIcons[evt.phase] || Play
                      const StatusIcon = statusIcons[evt.status] || CheckCircle2
                      const isLast = i === result.events.length - 1
                      return (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center border-2 ${
                              evt.status === 'passed' || evt.status === 'completed'
                                ? 'bg-emerald-50 border-emerald-200'
                                : evt.status === 'running'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}>
                              <PhaseIcon className={`h-3.5 w-3.5 ${statusColors[evt.status] || 'text-slate-600'} ${evt.status === 'running' ? 'animate-spin' : ''}`} />
                            </div>
                            {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-400">#{evt.step}</span>
                              <span className="text-sm font-medium text-slate-900">{evt.event_type}</span>
                              <StatusIcon className={`h-3.5 w-3.5 ${statusColors[evt.status] || 'text-emerald-600'}`} />
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">{evt.message}</p>
                            {Object.keys(evt.data).length > 0 && (
                              <pre className="text-xs text-slate-500 bg-slate-50 rounded p-2 mt-1.5 max-h-32 overflow-y-auto font-mono">{JSON.stringify(evt.data, null, 2)}</pre>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Output */}
              <div className="fi-card">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Output
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 bg-slate-50 rounded-md">
                      <div className="text-xs text-slate-500">Tokens Used</div>
                      <div className="text-sm font-semibold text-slate-900">{(result.output as Record<string, unknown>).tokens_used as number}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-md">
                      <div className="text-xs text-slate-500">Cost</div>
                      <div className="text-sm font-semibold text-slate-900">${((result.output as Record<string, unknown>).cost_cents as number / 100).toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-md">
                      <div className="text-xs text-slate-500">Turns</div>
                      <div className="text-sm font-semibold text-slate-900">{(result.output as Record<string, unknown>).turns_used as number}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Result</div>
                    <pre className="text-sm text-slate-600 bg-slate-50 rounded-md p-3 font-mono max-h-48 overflow-y-auto">{JSON.stringify(result.output, null, 2)}</pre>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div className="fi-card">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-forgeiq-600" /> Evidence
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Evidence Type</div>
                      <div className="text-sm font-medium text-slate-900">{(result.evidence as Record<string, unknown>).evidence_type as string}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Agent Version</div>
                      <div className="text-sm font-medium text-slate-900 font-mono">{(result.evidence as Record<string, unknown>).agent_version as string}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Model Used</div>
                      <div className="text-sm font-medium text-slate-900">{(result.evidence as Record<string, unknown>).model_used as string}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Hash</div>
                      <div className="text-sm font-mono text-slate-900 text-xs">{((result.evidence as Record<string, unknown>).hash as string).slice(0, 20)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Policies Applied</div>
                    <div className="flex flex-wrap gap-1.5">
                      {((result.evidence as Record<string, unknown>).permissions_applied as string[]).map((p) => (
                        <span key={p} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 text-xs">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Full Evidence Record</div>
                    <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono max-h-48 overflow-y-auto">{JSON.stringify(result.evidence, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
