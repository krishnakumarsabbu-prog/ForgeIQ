import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useHarness, useAgents, useSkills, useTools, useModels, useGraphs, useLoops,
  usePolicies, useExecutions, useCloneHarness, usePublishHarness,
  useCreateHarnessVersion, useCompareHarnessVersions, useHarnessExecutions,
} from '../hooks/useQueries'
import { PageHeader, PageTabs, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer } from '../components/ui/SideDrawer'
import type { Agent, Skill, Tool, ModelConfiguration, Graph, Loop, Policy, Execution, HarnessVersionComparison } from '../types'
import {
  ArrowLeft, Layers, GitBranch, Bot, Sparkles, Wrench, Shield, Network,
  Repeat, Cpu, FileText, Clock, Coins, CheckCircle2, Play, Plus,
  AlertCircle, Eye, ArrowLeftRight, Archive, Copy, Lock, Server,
  ListChecks, FileCheck2, Activity,
} from 'lucide-react'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'graph', label: 'Graph' },
  { key: 'loops', label: 'Loops' },
  { key: 'agents', label: 'Agents' },
  { key: 'skills', label: 'Skills' },
  { key: 'tools', label: 'Tools' },
  { key: 'context', label: 'Context' },
  { key: 'models', label: 'Models' },
  { key: 'policies', label: 'Policies' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'environment', label: 'Environment' },
  { key: 'rules', label: 'Execution Rules' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'versions', label: 'Versions' },
  { key: 'executions', label: 'Executions' },
]

const LIFECYCLE_STEPS = ['draft', 'validated', 'published', 'deprecated', 'archived']

const lifecycleConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  draft: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  validated: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  deprecated: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300', dot: 'bg-slate-400' },
}

function formatRelative(iso: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function HarnessDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: harness, isLoading } = useHarness(id!)
  const { data: agents } = useAgents()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: models } = useModels()
  const { data: graphs } = useGraphs()
  const { data: loops } = useLoops()
  const { data: policies } = usePolicies()
  const { data: harnessExecutions } = useHarnessExecutions(id!)
  const publishHarness = usePublishHarness()
  const createVersion = useCreateHarnessVersion()
  const compareVersions = useCompareHarnessVersions()
  const cloneHarness = useCloneHarness()

  const [activeTab, setActiveTab] = useState('overview')
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newVersionChangelog, setNewVersionChangelog] = useState('')
  const [showClone, setShowClone] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [comparison, setComparison] = useState<HarnessVersionComparison | null>(null)

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>()
    ;(agents ?? []).forEach((a) => m.set(a.id, a))
    return m
  }, [agents])

  const skillMap = useMemo(() => {
    const m = new Map<string, Skill>()
    ;(skills ?? []).forEach((s) => m.set(s.id, s))
    return m
  }, [skills])

  const toolMap = useMemo(() => {
    const m = new Map<string, Tool>()
    ;(tools ?? []).forEach((t) => m.set(t.id, t))
    return m
  }, [tools])

  const modelMap = useMemo(() => {
    const m = new Map<string, ModelConfiguration>()
    ;(models ?? []).forEach((mo) => m.set(mo.id, mo))
    return m
  }, [models])

  const graphMap = useMemo(() => {
    const m = new Map<string, Graph>()
    ;(graphs ?? []).forEach((g) => m.set(g.id, g))
    return m
  }, [graphs])

  const loopMap = useMemo(() => {
    const m = new Map<string, Loop>()
    ;(loops ?? []).forEach((l) => m.set(l.id, l))
    return m
  }, [loops])

  const policyMap = useMemo(() => {
    const m = new Map<string, Policy>()
    ;(policies ?? []).forEach((p) => m.set(p.id, p))
    return m
  }, [policies])

  if (isLoading) return (
    <>
      <PageHeader title="Harness Detail" />
      <LoadingSpinner />
    </>
  )
  if (!harness) return (
    <>
      <PageHeader title="Harness Detail" />
      <EmptyState message="Harness not found" />
    </>
  )

  const graph = graphMap.get(harness.graph_id ?? '')
  const execStats = (harnessExecutions ?? []).reduce(
    (acc, e) => {
      acc.total++
      if (e.status === 'COMPLETED') acc.success++
      return acc
    },
    { total: 0, success: 0 }
  )
  const successRate = execStats.total > 0 ? Math.round((execStats.success / execStats.total) * 100) : 0

  const handleCreateVersion = () => {
    createVersion.mutate(
      { id: harness.id, body: { changelog: newVersionChangelog || 'New version' } },
      { onSuccess: () => { setShowNewVersion(false); setNewVersionChangelog('') } }
    )
  }

  const handleCompare = () => {
    if (!compareA || !compareB || compareA === compareB) return
    compareVersions.mutate(
      { id: harness.id, va: compareA, vb: compareB },
      { onSuccess: (data) => setComparison(data) }
    )
  }

  const handleClone = () => {
    cloneHarness.mutate(
      { id: harness.id, body: { display_name: cloneName || `${harness.display_name} (Clone)` } },
      { onSuccess: (newH) => { setShowClone(false); setCloneName(''); navigate(`/harnesses/${newH.id}`) } }
    )
  }

  const lifecycleIdx = LIFECYCLE_STEPS.indexOf(harness.lifecycle)

  return (
    <>
      <PageHeader
        title={harness.display_name}
        description={harness.purpose}
        breadcrumbs={[{ label: 'Harnesses', to: '/harnesses' }, { label: harness.display_name }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowClone(true)} className="fi-button-secondary">
              <Copy className="h-4 w-4" /> Clone
            </button>
            <button onClick={() => navigate('/executions')} className="fi-button-secondary">
              <Play className="h-4 w-4" /> Run
            </button>
            <button onClick={() => navigate('/harnesses')} className="fi-button-secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        }
      />

      <PageTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="p-6 space-y-4">
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Lifecycle progression */}
            <div className="fi-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Lifecycle</h3>
                <span className={`fi-badge text-xs ${(lifecycleConfig[harness.lifecycle] ?? lifecycleConfig['draft']).bg} ${(lifecycleConfig[harness.lifecycle] ?? lifecycleConfig['draft']).text} ${(lifecycleConfig[harness.lifecycle] ?? lifecycleConfig['draft']).border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(lifecycleConfig[harness.lifecycle] ?? lifecycleConfig['draft']).dot} inline-block mr-1`} />
                  {harness.lifecycle}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {LIFECYCLE_STEPS.map((step, i) => {
                  const cfg = lifecycleConfig[step]
                  const isPast = i <= lifecycleIdx
                  const isCurrent = i === lifecycleIdx
                  return (
                    <div key={step} className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${isPast ? cfg.dot : 'bg-slate-200'} ${isCurrent ? 'ring-2 ring-offset-2 ring-forgeiq-400' : ''}`} />
                        <span className={`text-xs capitalize ${isCurrent ? 'font-semibold text-slate-900' : isPast ? 'text-slate-600' : 'text-slate-400'}`}>{step}</span>
                      </div>
                      {i < LIFECYCLE_STEPS.length - 1 && (
                        <div className={`flex-1 h-px ${i < lifecycleIdx ? cfg.dot : 'bg-slate-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Visual summary */}
            <div className="grid grid-cols-5 gap-3">
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Network className="h-3 w-3" /> Graph Nodes</div>
                <div className="text-2xl font-semibold text-slate-900">{graph?.nodes.length ?? 0}</div>
              </div>
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Repeat className="h-3 w-3" /> Loops</div>
                <div className="text-2xl font-semibold text-slate-900">{harness.loop_ids.length}</div>
              </div>
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Bot className="h-3 w-3" /> Agents</div>
                <div className="text-2xl font-semibold text-slate-900">{harness.agent_ids.length}</div>
              </div>
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Wrench className="h-3 w-3" /> Tools</div>
                <div className="text-2xl font-semibold text-slate-900">{harness.tool_ids.length}</div>
              </div>
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Shield className="h-3 w-3" /> Policies</div>
                <div className="text-2xl font-semibold text-slate-900">{harness.policy_ids.length}</div>
              </div>
            </div>

            {/* Key details */}
            <div className="fi-card p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Category</p>
                  <p className="text-sm font-medium text-slate-900 capitalize">{harness.harness_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Current Version</p>
                  <p className="text-sm font-medium text-slate-900 font-mono">{harness.current_version}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Environment</p>
                  <p className="text-sm font-medium text-slate-900">{harness.environment}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Approval Required</p>
                  <p className="text-sm font-medium text-slate-900">{harness.approval_required ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Cost Limit</p>
                  <p className="text-sm font-medium text-slate-900">${(harness.cost_limit_cents / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Time Limit</p>
                  <p className="text-sm font-medium text-slate-900">{harness.time_limit_seconds}s</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Executions</p>
                  <p className="text-sm font-medium text-slate-900">{execStats.total}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Success Rate</p>
                  <p className={`text-sm font-medium ${successRate >= 80 ? 'text-emerald-600' : successRate >= 50 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {execStats.total > 0 ? `${successRate}%` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs / Outputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="fi-card p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Inputs</h4>
                {harness.inputs.length === 0 ? (
                  <p className="text-sm text-slate-400">No inputs defined</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {harness.inputs.map((inp, i) => (
                      <span key={i} className="fi-badge bg-blue-50 text-blue-700 border border-blue-200 text-xs">{inp}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="fi-card p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Outputs</h4>
                {harness.outputs.length === 0 ? (
                  <p className="text-sm text-slate-400">No outputs defined</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {harness.outputs.map((out, i) => (
                      <span key={i} className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">{out}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Graph */}
        {activeTab === 'graph' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Network className="h-4 w-4 text-forgeiq-600" /> Graph</h3>
            </div>
            {graph ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><div className="text-xs text-slate-500 uppercase">Name</div><div className="text-sm font-medium">{graph.display_name}</div></div>
                  <div><div className="text-xs text-slate-500 uppercase">Version</div><div className="text-sm font-medium font-mono">{graph.version}</div></div>
                  <div><div className="text-xs text-slate-500 uppercase">Nodes</div><div className="text-sm font-medium">{graph.nodes.length}</div></div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Nodes ({graph.nodes.length})</div>
                  <div className="space-y-1.5">
                    {graph.nodes.map((node) => (
                      <div key={node.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-md">
                        <div className="h-6 w-6 rounded bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center">
                          <Layers className="h-3 w-3 text-forgeiq-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">{node.label}</div>
                          <div className="text-xs text-slate-500 capitalize">{node.node_type}</div>
                        </div>
                        {node.description && <span className="text-xs text-slate-400 max-w-[200px] truncate">{node.description}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Edges ({graph.edges.length})</div>
                  <div className="space-y-1">
                    {graph.edges.map((edge) => (
                      <div key={edge.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded text-xs">
                        <span className="font-mono text-slate-600">{edge.source_node_id.slice(0, 8)}</span>
                        <ArrowLeftRight className="h-3 w-3 text-slate-400" />
                        <span className="font-mono text-slate-600">{edge.target_node_id.slice(0, 8)}</span>
                        {edge.label && <span className="text-slate-500 ml-2">{edge.label}</span>}
                        {edge.condition && <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs ml-auto">{edge.condition}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="No graph assigned to this harness" />
            )}
          </div>
        )}

        {/* Loops */}
        {activeTab === 'loops' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Repeat className="h-4 w-4 text-forgeiq-600" /> Loops ({harness.loop_ids.length})</h3>
            </div>
            {harness.loop_ids.length === 0 ? (
              <EmptyState message="No loops configured" />
            ) : (
              <div className="divide-y divide-slate-100">
                {harness.loop_ids.map((lid) => {
                  const loop = loopMap.get(lid)
                  return (
                    <div key={lid} className="px-4 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center">
                        <Repeat className="h-4 w-4 text-forgeiq-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{loop?.display_name ?? lid.slice(0, 12)}</div>
                        <div className="text-xs text-slate-500">{loop?.loop_type ?? '—'} | Max iterations: {loop?.max_iterations ?? '—'}</div>
                      </div>
                      <span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{loop?.trigger ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Agents */}
        {activeTab === 'agents' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Bot className="h-4 w-4 text-forgeiq-600" /> Agents ({harness.agent_ids.length})</h3>
            </div>
            {harness.agent_ids.length === 0 ? (
              <EmptyState message="No agents assigned" />
            ) : (
              <div className="divide-y divide-slate-100">
                {harness.agent_ids.map((aid) => {
                  const agent = agentMap.get(aid)
                  return (
                    <div key={aid} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/agents/${aid}`)}>
                      <div className="h-8 w-8 rounded-md bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-forgeiq-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{agent?.display_name ?? aid.slice(0, 12)}</div>
                        <div className="text-xs text-slate-500">{agent?.purpose ?? '—'}</div>
                      </div>
                      <span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{agent?.category ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {activeTab === 'skills' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="h-4 w-4 text-forgeiq-600" /> Skills ({harness.skill_ids.length})</h3>
            </div>
            {harness.skill_ids.length === 0 ? (
              <EmptyState message="No skills assigned" />
            ) : (
              <div className="divide-y divide-slate-100">
                {harness.skill_ids.map((sid) => {
                  const skill = skillMap.get(sid)
                  return (
                    <div key={sid} className="px-4 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-forgeiq-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{skill?.display_name ?? sid.slice(0, 12)}</div>
                        <div className="text-xs text-slate-500">{skill?.description ?? '—'}</div>
                      </div>
                      <span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{skill?.category ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tools */}
        {activeTab === 'tools' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Wrench className="h-4 w-4 text-forgeiq-600" /> Tools ({harness.tool_ids.length})</h3>
            </div>
            {harness.tool_ids.length === 0 ? (
              <EmptyState message="No tools assigned" />
            ) : (
              <div className="divide-y divide-slate-100">
                {harness.tool_ids.map((tid) => {
                  const tool = toolMap.get(tid)
                  return (
                    <div key={tid} className="px-4 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{tool?.display_name ?? tid.slice(0, 12)}</div>
                        <div className="text-xs text-slate-500">{tool?.description ?? '—'}</div>
                      </div>
                      <span className={`fi-badge text-xs ${
                        tool?.risk_level === 'LOW' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        tool?.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        tool?.risk_level === 'HIGH' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>{tool?.risk_level ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Context */}
        {activeTab === 'context' && (
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-forgeiq-600" /> Context</h3>
            {Object.keys(harness.context).length === 0 ? (
              <EmptyState message="No context configured" />
            ) : (
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-4 font-mono max-h-96 overflow-y-auto">{JSON.stringify(harness.context, null, 2)}</pre>
            )}
          </div>
        )}

        {/* Models */}
        {activeTab === 'models' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Cpu className="h-4 w-4 text-forgeiq-600" /> Models ({harness.model_config_ids.length})</h3>
            </div>
            {harness.model_config_ids.length === 0 ? (
              <EmptyState message="No models configured" />
            ) : (
              <div className="divide-y divide-slate-100">
                {harness.model_config_ids.map((mid) => {
                  const model = modelMap.get(mid)
                  return (
                    <div key={mid} className="px-4 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-forgeiq-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{model?.display_name ?? mid.slice(0, 12)}</div>
                        <div className="text-xs text-slate-500">{model?.provider ?? '—'} | {model?.model ?? '—'}</div>
                      </div>
                      <span className="text-xs text-slate-500">{model ? `${model.context_size.toLocaleString()} ctx` : '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Policies */}
        {activeTab === 'policies' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Shield className="h-4 w-4 text-forgeiq-600" /> Policies ({harness.policy_ids.length})</h3>
            </div>
            {harness.policy_ids.length === 0 ? (
              <EmptyState message="No policies assigned" />
            ) : (
              <div className="divide-y divide-slate-100">
                {harness.policy_ids.map((pid) => {
                  const policy = policyMap.get(pid)
                  return (
                    <div key={pid} className="px-4 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-red-50 border border-red-200 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{policy?.display_name ?? pid.slice(0, 12)}</div>
                        <div className="text-xs text-slate-500">{policy?.description ?? '—'}</div>
                      </div>
                      <span className={`fi-badge text-xs ${policy?.enforcement === 'hard' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{policy?.enforcement ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Permissions */}
        {activeTab === 'permissions' && (
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><Lock className="h-4 w-4 text-forgeiq-600" /> Permissions</h3>
            {harness.permissions.length === 0 ? (
              <EmptyState message="No permissions configured" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {harness.permissions.map((p) => (
                  <span key={p} className="fi-badge bg-red-50 text-red-700 border border-red-200 text-xs">{p}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Environment */}
        {activeTab === 'environment' && (
          <div className="fi-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Server className="h-4 w-4 text-forgeiq-600" /> Environment</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 uppercase">Environment</div>
                <div className="text-sm font-medium text-slate-900 capitalize">{harness.environment}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Approval Required</div>
                <div className="text-sm font-medium text-slate-900">{harness.approval_required ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Cost Limit</div>
                <div className="text-sm font-medium text-slate-900">${(harness.cost_limit_cents / 100).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase">Time Limit</div>
                <div className="text-sm font-medium text-slate-900">{harness.time_limit_seconds}s</div>
              </div>
            </div>
            {Object.keys(harness.approval_rules).length > 0 && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Approval Rules</div>
                <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono">{JSON.stringify(harness.approval_rules, null, 2)}</pre>
              </div>
            )}
            {Object.keys(harness.escalation_rules).length > 0 && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Escalation Rules</div>
                <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono">{JSON.stringify(harness.escalation_rules, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Execution Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><ListChecks className="h-4 w-4 text-forgeiq-600" /> Execution Rules</h3>
              {Object.keys(harness.execution_rules).length === 0 ? (
                <p className="text-sm text-slate-400">No execution rules configured</p>
              ) : (
                <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono">{JSON.stringify(harness.execution_rules, null, 2)}</pre>
              )}
            </div>
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><Repeat className="h-4 w-4 text-forgeiq-600" /> Retry Rules</h3>
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono">{JSON.stringify(harness.retry_rules, null, 2)}</pre>
            </div>
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><AlertCircle className="h-4 w-4 text-forgeiq-600" /> Failure Rules</h3>
              {Object.keys(harness.failure_rules).length === 0 ? (
                <p className="text-sm text-slate-400">No failure rules configured</p>
              ) : (
                <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono">{JSON.stringify(harness.failure_rules, null, 2)}</pre>
              )}
            </div>
          </div>
        )}

        {/* Evidence */}
        {activeTab === 'evidence' && (
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><FileCheck2 className="h-4 w-4 text-forgeiq-600" /> Evidence Requirements</h3>
            <p className="text-sm text-slate-500 mb-4">Every execution of this harness must produce the following evidence items. Evidence is immutable and auditable.</p>
            <div className="space-y-1.5">
              {harness.evidence_requirements.map((req) => (
                <div key={req} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-900">{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Versions */}
        {activeTab === 'versions' && (
          <div className="space-y-4">
            <div className="fi-card">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><GitBranch className="h-4 w-4 text-forgeiq-600" /> Versions</h3>
                <button onClick={() => setShowNewVersion(true)} className="fi-button-primary text-xs">
                  <Plus className="h-3.5 w-3.5" /> Create Version
                </button>
              </div>
              {harness.versions.length === 0 ? (
                <EmptyState message="No versions published" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="fi-table">
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Published</th>
                        <th>Default</th>
                        <th>Changelog</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {harness.versions.map((version) => (
                        <tr key={version.id}>
                          <td className="font-medium text-slate-900 font-mono">{version.version}</td>
                          <td><StatusBadge status={version.published ? 'published' : 'draft'} /></td>
                          <td>{version.is_default ? <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span> : <span className="text-slate-400">—</span>}</td>
                          <td className="text-slate-500 max-w-xs truncate">{version.changelog}</td>
                          <td className="text-slate-600 text-xs whitespace-nowrap">{new Date(version.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              {!version.published && (
                                <button onClick={() => publishHarness.mutate({ id: harness.id, version: version.version })} disabled={publishHarness.isPending} className="fi-button-primary text-xs px-2 py-1">Publish</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Compare Versions */}
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><ArrowLeftRight className="h-4 w-4 text-forgeiq-600" /> Compare Versions</h3>
              <div className="flex items-center gap-3 mb-4">
                <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="fi-input w-auto">
                  <option value="">Version A...</option>
                  {harness.versions.map((v) => <option key={v.id} value={v.version}>{v.version}</option>)}
                </select>
                <ArrowLeftRight className="h-4 w-4 text-slate-400" />
                <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="fi-input w-auto">
                  <option value="">Version B...</option>
                  {harness.versions.map((v) => <option key={v.id} value={v.version}>{v.version}</option>)}
                </select>
                <button onClick={handleCompare} disabled={!compareA || !compareB || compareA === compareB || compareVersions.isPending} className="fi-button-primary text-xs">
                  Compare
                </button>
              </div>
              {comparison && (
                <div className="space-y-2">
                  {Object.entries(comparison.differences).map(([field, diff]) => (
                    <div key={field} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md">
                      {diff ? <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                      <span className="text-sm text-slate-700">{field}</span>
                      <span className={`text-xs ml-auto ${diff ? 'text-amber-600' : 'text-emerald-600'}`}>{diff ? 'Changed' : 'Same'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Executions */}
        {activeTab === 'executions' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Activity className="h-4 w-4 text-forgeiq-600" /> Executions</h3>
            </div>
            {!harnessExecutions || harnessExecutions.length === 0 ? (
              <EmptyState message="No executions for this harness" />
            ) : (
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th>Execution ID</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                      <th>Retries</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {harnessExecutions.slice(0, 20).map((ex: Execution) => (
                      <tr key={ex.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/executions/${ex.id}`)}>
                        <td className="font-mono text-xs text-forgeiq-600">{ex.id.slice(0, 12)}</td>
                        <td><StatusBadge status={ex.status} /></td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-forgeiq-500 rounded-full" style={{ width: `${ex.progress}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{ex.progress}%</span>
                          </div>
                        </td>
                        <td className="text-slate-600 text-xs">{(ex.tokens_used / 1000).toFixed(1)}K</td>
                        <td className="text-slate-600 text-xs">${(ex.cost_cents / 100).toFixed(2)}</td>
                        <td className="text-slate-600 text-xs">{ex.retry_count}</td>
                        <td className="text-slate-500 text-xs whitespace-nowrap">{ex.started_at ? new Date(ex.started_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Version Drawer */}
      <SideDrawer
        open={showNewVersion}
        onClose={() => setShowNewVersion(false)}
        title="Create New Version"
        subtitle={harness.display_name}
        footer={
          <>
            <button onClick={() => setShowNewVersion(false)} className="fi-button-secondary">Cancel</button>
            <button onClick={handleCreateVersion} disabled={createVersion.isPending} className="fi-button-primary">
              {createVersion.isPending ? 'Creating...' : 'Create Version'}
            </button>
          </>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Changelog
            </label>
            <textarea
              value={newVersionChangelog}
              onChange={(e) => setNewVersionChangelog(e.target.value)}
              rows={4}
              placeholder="Describe what changed in this version..."
              className="fi-input w-full resize-none"
            />
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
            The new version will copy the current graph, loops, agents, skills, tools, models, and policies as a starting point. It will be created as a draft.
          </div>
        </div>
      </SideDrawer>

      {/* Clone Drawer */}
      <SideDrawer
        open={showClone}
        onClose={() => setShowClone(false)}
        title="Clone Harness"
        subtitle={harness.display_name}
        footer={
          <>
            <button onClick={() => setShowClone(false)} className="fi-button-secondary">Cancel</button>
            <button onClick={handleClone} disabled={cloneHarness.isPending} className="fi-button-primary">
              {cloneHarness.isPending ? 'Cloning...' : 'Clone'}
            </button>
          </>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              New Harness Name
            </label>
            <input
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              className="fi-input w-full"
              placeholder="Enter name for cloned harness"
            />
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
            The cloned harness will copy all configuration: graph, loops, agents, skills, tools, models, policies, permissions, environment, execution rules, and evidence requirements. It will start as a draft lifecycle.
          </div>
        </div>
      </SideDrawer>
    </>
  )
}
