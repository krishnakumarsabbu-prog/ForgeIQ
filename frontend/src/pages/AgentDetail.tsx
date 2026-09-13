import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useAgent, useSkills, useTools, useModels, usePublishAgent, useRollbackAgent,
  useDeprecateAgent, useCreateAgentVersion, useAgentExecutions, useCompareAgentVersions,
} from '../hooks/useQueries'
import { PageHeader, PageTabs, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer } from '../components/ui/SideDrawer'
import type { Agent, Skill, Tool, ModelConfiguration, Execution, AgentVersionComparison } from '../types'
import {
  ArrowLeft, Bot, Settings, GitBranch, Sparkles, Wrench, Shield, Clock, Coins,
  Hash, CheckCircle2, XCircle, Play, FileText, Plus, AlertCircle, Cpu, Eye,
  ChevronRight, ArrowLeftRight,
} from 'lucide-react'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'contract', label: 'Contract' },
  { key: 'skills', label: 'Skills' },
  { key: 'tools', label: 'Tools' },
  { key: 'model', label: 'Model' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'limits', label: 'Execution Limits' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'versions', label: 'Versions' },
  { key: 'executions', label: 'Executions' },
]

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agent, isLoading } = useAgent(id!)
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: models } = useModels()
  const { data: agentExecutions } = useAgentExecutions(id!)
  const publishAgent = usePublishAgent()
  const rollbackAgent = useRollbackAgent()
  const deprecateAgent = useDeprecateAgent()
  const createVersion = useCreateAgentVersion()
  const compareVersions = useCompareAgentVersions()

  const [activeTab, setActiveTab] = useState('overview')
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newVersionChangelog, setNewVersionChangelog] = useState('')
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [comparison, setComparison] = useState<AgentVersionComparison | null>(null)

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

  if (isLoading) return (
    <>
      <PageHeader title="Agent Detail" />
      <LoadingSpinner />
    </>
  )
  if (!agent) return (
    <>
      <PageHeader title="Agent Detail" />
      <EmptyState message="Agent not found" />
    </>
  )

  const model = modelMap.get(agent.model_config_id ?? '')

  const handleCreateVersion = () => {
    createVersion.mutate(
      { id: agent.id, body: { changelog: newVersionChangelog || 'New version' } },
      { onSuccess: () => { setShowNewVersion(false); setNewVersionChangelog('') } }
    )
  }

  const handleCompare = () => {
    if (!compareA || !compareB || compareA === compareB) return
    compareVersions.mutate(
      { id: agent.id, va: compareA, vb: compareB },
      { onSuccess: (data) => setComparison(data) }
    )
  }

  return (
    <>
      <PageHeader
        title={agent.display_name || agent.name}
        description={agent.purpose}
        breadcrumbs={[{ label: 'Agents', to: '/agents' }, { label: agent.display_name }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/agents/${agent.id}/test`)} className="fi-button-secondary">
              <Play className="h-4 w-4" /> Test
            </button>
            <button onClick={() => navigate('/agents')} className="fi-button-secondary">
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
            <div className="fi-card p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-forgeiq-50 rounded-lg">
                  <Bot className="h-6 w-6 text-forgeiq-600" />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Category</p>
                    <p className="text-sm font-medium text-slate-900">{agent.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Role</p>
                    <p className="text-sm font-medium text-slate-900">{agent.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Current Version</p>
                    <p className="text-sm font-medium text-slate-900 font-mono">{agent.current_version}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                    <StatusBadge status={agent.published ? 'published' : 'draft'} />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Settings className="h-3 w-3" /> Skills</div>
                <div className="text-2xl font-semibold text-slate-900">{agent.skill_ids.length}</div>
              </div>
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Wrench className="h-3 w-3" /> Tools</div>
                <div className="text-2xl font-semibold text-slate-900">{agent.tool_ids.length}</div>
              </div>
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><GitBranch className="h-3 w-3" /> Versions</div>
                <div className="text-2xl font-semibold text-slate-900">{agent.versions.length}</div>
              </div>
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Cpu className="h-3 w-3" /> Model</div>
                <div className="text-sm font-semibold text-slate-900">{model?.display_name ?? '—'}</div>
              </div>
            </div>
            <div className="fi-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-900">Harness Compatible</span>
              </div>
              <p className="text-sm text-slate-500">
                This agent has a valid contract and can be referenced by harness graph nodes. Harnesses use the agent contract rather than hardcoding implementation details.
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {activeTab === 'instructions' && (
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">System Instructions</h3>
            <pre className="text-sm text-slate-600 bg-slate-50 rounded-md p-4 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{agent.system_instructions}</pre>
          </div>
        )}

        {/* Contract */}
        {activeTab === 'contract' && (
          <div className="fi-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Settings className="h-4 w-4 text-forgeiq-600" /> Agent Contract</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-slate-400" /><div><div className="text-xs text-slate-500 uppercase">Max Turns</div><div className="text-sm font-medium">{agent.contract.max_turns}</div></div></div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><div><div className="text-xs text-slate-500 uppercase">Timeout</div><div className="text-sm font-medium">{agent.contract.timeout_seconds}s</div></div></div>
              <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-slate-400" /><div><div className="text-xs text-slate-500 uppercase">Token Budget</div><div className="text-sm font-medium">{agent.contract.token_budget.toLocaleString()}</div></div></div>
              <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-slate-400" /><div><div className="text-xs text-slate-500 uppercase">Cost Budget</div><div className="text-sm font-medium">${(agent.contract.cost_budget_cents / 100).toFixed(2)}</div></div></div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Input Schema</div>
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono max-h-48 overflow-y-auto">{JSON.stringify(agent.contract.input_schema, null, 2)}</pre>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Output Schema</div>
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono max-h-48 overflow-y-auto">{JSON.stringify(agent.contract.output_schema, null, 2)}</pre>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Context Contract</div>
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono max-h-48 overflow-y-auto">{JSON.stringify(agent.contract.context_contract, null, 2)}</pre>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Retry Policy</div>
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono">{JSON.stringify(agent.contract.retry_policy, null, 2)}</pre>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Failure Behavior:</div>
              <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">{agent.contract.failure_behavior}</span>
            </div>
          </div>
        )}

        {/* Skills */}
        {activeTab === 'skills' && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="h-4 w-4 text-forgeiq-600" /> Skills ({agent.skill_ids.length})</h3>
            </div>
            {agent.skill_ids.length === 0 ? (
              <EmptyState message="No skills assigned" />
            ) : (
              <div className="divide-y divide-slate-100">
                {agent.skill_ids.map((sid) => {
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
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Wrench className="h-4 w-4 text-forgeiq-600" /> Tools ({agent.tool_ids.length})</h3>
            </div>
            {agent.tool_ids.length === 0 ? (
              <EmptyState message="No tools assigned" />
            ) : (
              <div className="divide-y divide-slate-100">
                {agent.tool_ids.map((tid) => {
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

        {/* Model */}
        {activeTab === 'model' && (
          <div className="fi-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Cpu className="h-4 w-4 text-forgeiq-600" /> Model Configuration</h3>
            {model ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-xs text-slate-500 uppercase">Provider</div><div className="text-sm font-medium">{model.provider}</div></div>
                <div><div className="text-xs text-slate-500 uppercase">Model</div><div className="text-sm font-medium font-mono">{model.model}</div></div>
                <div><div className="text-xs text-slate-500 uppercase">Context Size</div><div className="text-sm font-medium">{model.context_size.toLocaleString()}</div></div>
                <div><div className="text-xs text-slate-500 uppercase">Token Limit</div><div className="text-sm font-medium">{model.token_limit.toLocaleString()}</div></div>
                <div><div className="text-xs text-slate-500 uppercase">Temperature</div><div className="text-sm font-medium">{model.temperature}</div></div>
                <div><div className="text-xs text-slate-500 uppercase">Structured Output</div><div className="text-sm font-medium">{model.structured_output ? 'Yes' : 'No'}</div></div>
                <div><div className="text-xs text-slate-500 uppercase">Input Cost</div><div className="text-sm font-medium">${(model.cost_per_1k_input_cents / 100).toFixed(3)}/1K</div></div>
                <div><div className="text-xs text-slate-500 uppercase">Output Cost</div><div className="text-sm font-medium">${(model.cost_per_1k_output_cents / 100).toFixed(3)}/1K</div></div>
              </div>
            ) : (
              <EmptyState message="No model configured" />
            )}
          </div>
        )}

        {/* Permissions */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-forgeiq-600" /> Permissions</h3>
              {agent.permissions.length === 0 ? (
                <EmptyState message="No permissions configured" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {agent.permissions.map((p) => (
                    <span key={p} className="fi-badge bg-red-50 text-red-700 border border-red-200 text-xs">{p}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-slate-600" /> Security Restrictions</h3>
              {agent.security_restrictions.length === 0 ? (
                <EmptyState message="No security restrictions configured" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {agent.security_restrictions.map((s) => (
                    <span key={s} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution Limits */}
        {activeTab === 'limits' && (
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-forgeiq-600" /> Execution Limits</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-md">
                <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><Hash className="h-3 w-3" /> Max Turns</div>
                <div className="text-lg font-semibold text-slate-900">{agent.max_turns}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-md">
                <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Timeout</div>
                <div className="text-lg font-semibold text-slate-900">{agent.timeout_seconds}s</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-md">
                <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><Coins className="h-3 w-3" /> Token Budget</div>
                <div className="text-lg font-semibold text-slate-900">{agent.token_budget.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-md">
                <div className="text-xs text-slate-500 uppercase flex items-center gap-1"><Coins className="h-3 w-3" /> Cost Budget</div>
                <div className="text-lg font-semibold text-slate-900">${(agent.cost_budget_cents / 100).toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Retry Policy</div>
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 font-mono">{JSON.stringify(agent.retry_policy, null, 2)}</pre>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Failure Behavior:</div>
              <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">{agent.contract.failure_behavior}</span>
            </div>
          </div>
        )}

        {/* Evidence */}
        {activeTab === 'evidence' && (
          <div className="fi-card p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3"><CheckCircle2 className="h-4 w-4 text-forgeiq-600" /> Evidence Requirements</h3>
            <p className="text-sm text-slate-500 mb-4">Every execution of this agent must produce the following evidence items. Evidence is immutable and auditable.</p>
            <div className="space-y-1.5">
              {agent.evidence_requirements.map((req) => (
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
              {agent.versions.length === 0 ? (
                <EmptyState message="No versions published" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="fi-table">
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Published</th>
                        <th>Default</th>
                        <th>Deprecated</th>
                        <th>Changelog</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agent.versions.map((version) => (
                        <tr key={version.id}>
                          <td className="font-medium text-slate-900 font-mono">{version.version}</td>
                          <td><StatusBadge status={version.published ? 'published' : 'draft'} /></td>
                          <td>{version.is_default ? <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span> : <span className="text-slate-400">—</span>}</td>
                          <td>{version.deprecated ? <span className="fi-badge bg-red-50 text-red-700 border border-red-200 text-xs">deprecated</span> : <span className="text-slate-400">—</span>}</td>
                          <td className="text-slate-500 max-w-xs truncate">{version.changelog}</td>
                          <td className="text-slate-600 text-xs whitespace-nowrap">{new Date(version.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              {!version.published && (
                                <button onClick={() => publishAgent.mutate({ id: agent.id, version: version.version })} disabled={publishAgent.isPending} className="fi-button-primary text-xs px-2 py-1">Publish</button>
                              )}
                              {version.published && !version.is_default && !version.deprecated && (
                                <button onClick={() => rollbackAgent.mutate({ id: agent.id, version: version.version })} disabled={rollbackAgent.isPending} className="fi-button-secondary text-xs px-2 py-1">Set Default</button>
                              )}
                              {version.published && !version.deprecated && (
                                <button onClick={() => deprecateAgent.mutate({ id: agent.id, version: version.version })} disabled={deprecateAgent.isPending} className="fi-button-secondary text-xs px-2 py-1 text-red-600">Deprecate</button>
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
                  {agent.versions.map((v) => <option key={v.id} value={v.version}>{v.version}</option>)}
                </select>
                <ArrowLeftRight className="h-4 w-4 text-slate-400" />
                <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="fi-input w-auto">
                  <option value="">Version B...</option>
                  {agent.versions.map((v) => <option key={v.id} value={v.version}>{v.version}</option>)}
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
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Play className="h-4 w-4 text-forgeiq-600" /> Executions</h3>
            </div>
            {!agentExecutions || agentExecutions.length === 0 ? (
              <EmptyState message="No executions for this agent" />
            ) : (
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th>Execution ID</th>
                      <th>Status</th>
                      <th>Pipeline</th>
                      <th>Progress</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                      <th>Retries</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentExecutions.slice(0, 20).map((ex: Execution) => (
                      <tr key={ex.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/executions/${ex.id}`)}>
                        <td className="font-mono text-xs text-forgeiq-600">{ex.id.slice(0, 12)}</td>
                        <td><StatusBadge status={ex.status} /></td>
                        <td className="text-slate-600 text-xs">{ex.pipeline_id?.slice(0, 8) ?? '—'}</td>
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
        subtitle={agent.display_name}
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
            The new version will copy the current contract and system instructions as a starting point.
            It will be created as a draft and can be published after review.
          </div>
        </div>
      </SideDrawer>
    </>
  )
}
