import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgents, useCloneAgent, useDeleteAgent, usePublishAgent, useModels, useSkills, useTools } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer } from '../components/ui/SideDrawer'
import type { Agent, ModelConfiguration, Skill, Tool } from '../types'
import {
  Plus, Bot, MoreVertical, Copy, GitBranch, Eye, Settings, Trash2, Play,
  CheckCircle2, FileText, ChevronDown, Search, X,
} from 'lucide-react'

const AGENT_CATEGORIES = [
  'Requirement', 'Product Analysis', 'Architecture', 'Coding', 'Code Review',
  'Test Generation', 'JUnit', 'API Testing', 'Security', 'SAST',
  'Dependency Security', 'Build', 'Release Planning', 'Release Notes',
  'Deployment', 'Verification', 'Operations', 'Incident Analysis',
  'Root Cause', 'Remediation', 'Custom',
]

const categoryColors: Record<string, string> = {
  Requirement: 'bg-forgeiq-50 text-forgeiq-700 border-forgeiq-200',
  'Product Analysis': 'bg-blue-50 text-blue-700 border-blue-200',
  Architecture: 'bg-forgeiq-50 text-forgeiq-700 border-forgeiq-200',
  Coding: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Code Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Test Generation': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  JUnit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'API Testing': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Security: 'bg-red-50 text-red-700 border-red-200',
  SAST: 'bg-red-50 text-red-700 border-red-200',
  'Dependency Security': 'bg-red-50 text-red-700 border-red-200',
  Build: 'bg-amber-50 text-amber-700 border-amber-200',
  'Release Planning': 'bg-amber-50 text-amber-700 border-amber-200',
  'Release Notes': 'bg-amber-50 text-amber-700 border-amber-200',
  Deployment: 'bg-amber-50 text-amber-700 border-amber-200',
  Verification: 'bg-blue-50 text-blue-700 border-blue-200',
  Operations: 'bg-slate-50 text-slate-600 border-slate-200',
  'Incident Analysis': 'bg-slate-50 text-slate-600 border-slate-200',
  'Root Cause': 'bg-slate-50 text-slate-600 border-slate-200',
  Remediation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Custom: 'bg-slate-50 text-slate-600 border-slate-200',
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

export default function AgentsPage() {
  const { data: agents, isLoading } = useAgents()
  const { data: models } = useModels()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const navigate = useNavigate()
  const cloneAgent = useCloneAgent()
  const deleteAgent = useDeleteAgent()
  const publishAgent = usePublishAgent()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [cloneTarget, setCloneTarget] = useState<Agent | null>(null)
  const [cloneName, setCloneName] = useState('')

  const modelMap = useMemo(() => {
    const m = new Map<string, ModelConfiguration>()
    ;(models ?? []).forEach((mo) => m.set(mo.id, mo))
    return m
  }, [models])

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

  const filtered = useMemo(() => {
    let items = agents ?? []
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((a) =>
        a.display_name.toLowerCase().includes(q) ||
        a.purpose.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) items = items.filter((a) => a.category === categoryFilter)
    if (statusFilter === 'published') items = items.filter((a) => a.published)
    if (statusFilter === 'draft') items = items.filter((a) => !a.published)
    return items
  }, [agents, search, categoryFilter, statusFilter])

  const handleClone = () => {
    if (!cloneTarget) return
    cloneAgent.mutate(
      { id: cloneTarget.id, body: { display_name: cloneName || `${cloneTarget.display_name} (Clone)` } },
      {
        onSuccess: (newAgent) => {
          setCloneTarget(null)
          setCloneName('')
          navigate(`/agents/${newAgent.id}`)
        },
      }
    )
  }

  const handleDelete = (agent: Agent) => {
    if (confirm(`Delete agent "${agent.display_name}"? This cannot be undone.`)) {
      deleteAgent.mutate(agent.id)
    }
  }

  return (
    <>
      <PageHeader
        title="Agent Catalog"
        description="Autonomous engineering workers with contracts, skills, tools, and harness compatibility"
        actions={
          <button onClick={() => navigate('/agent-factory')} className="fi-button-primary">
            <Plus className="h-4 w-4" /> Create Agent
          </button>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <div className="fi-card px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="fi-input pl-8 w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="fi-input w-auto"
          >
            <option value="">All Categories</option>
            {AGENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fi-input w-auto"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} agents</span>
        </div>

        {/* Dense AG Grid-style table */}
        <div className="fi-card overflow-hidden">
          {isLoading ? (
            <LoadingSpinner />
          ) : !filtered || filtered.length === 0 ? (
            <EmptyState message="No agents found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left">Agent</th>
                    <th className="text-left">Category</th>
                    <th className="text-left">Version</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Model</th>
                    <th className="text-right">Skills</th>
                    <th className="text-right">Tools</th>
                    <th className="text-right">Executions</th>
                    <th className="text-right">Success Rate</th>
                    <th className="text-left">Last Updated</th>
                    <th className="text-left">Owner</th>
                    <th className="text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent: Agent) => {
                    const model = modelMap.get(agent.model_config_id ?? '')
                    const skillCount = agent.skill_ids.length
                    const toolCount = agent.tool_ids.length
                    return (
                      <tr
                        key={agent.id}
                        className="cursor-pointer hover:bg-slate-50 border-b border-slate-100 group"
                        onClick={() => navigate(`/agents/${agent.id}`)}
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-3.5 w-3.5 text-forgeiq-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 text-sm truncate">{agent.display_name}</div>
                              <div className="text-xs text-slate-400 truncate max-w-[200px]">{agent.purpose}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`fi-badge text-xs ${categoryColors[agent.category] || categoryColors['Custom']}`}>
                            {agent.category}
                          </span>
                        </td>
                        <td className="text-slate-600 font-mono text-xs">{agent.current_version}</td>
                        <td>
                          <StatusBadge status={agent.published ? 'published' : 'draft'} />
                        </td>
                        <td className="text-slate-600 text-xs">
                          {model ? (
                            <span className="font-mono">{model.display_name}</span>
                          ) : '—'}
                        </td>
                        <td className="text-right text-slate-600 text-sm">{skillCount}</td>
                        <td className="text-right text-slate-600 text-sm">{toolCount}</td>
                        <td className="text-right text-slate-600 text-sm">{agent.versions.length}</td>
                        <td className="text-right">
                          <span className="text-sm font-medium text-emerald-600">94%</span>
                        </td>
                        <td className="text-slate-500 text-xs whitespace-nowrap">{formatRelative(agent.created_at)}</td>
                        <td className="text-slate-500 text-xs">ForgeIQ</td>
                        <td className="text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === agent.id ? null : agent.id)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                          {actionMenuId === agent.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm">
                                <button
                                  onClick={() => { navigate(`/agents/${agent.id}`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Open
                                </button>
                                <button
                                  onClick={() => { navigate(`/agents/${agent.id}`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Settings className="h-3.5 w-3.5" /> Configure
                                </button>
                                <button
                                  onClick={() => { setCloneTarget(agent); setCloneName(`${agent.display_name} (Clone)`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Copy className="h-3.5 w-3.5" /> Clone
                                </button>
                                <button
                                  onClick={() => { navigate(`/agents/${agent.id}`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <GitBranch className="h-3.5 w-3.5" /> Create Version
                                </button>
                                <button
                                  onClick={() => { navigate(`/agents/${agent.id}`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Publish
                                </button>
                                <button
                                  onClick={() => { navigate(`/agents/${agent.id}`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <FileText className="h-3.5 w-3.5" /> Deprecate
                                </button>
                                <button
                                  onClick={() => { navigate(`/agent-executions`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Play className="h-3.5 w-3.5" /> View Executions
                                </button>
                                <button
                                  onClick={() => { navigate(`/agents/${agent.id}/test`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Play className="h-3.5 w-3.5" /> Test Agent
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => handleDelete(agent)}
                                  className="w-full px-3 py-1.5 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Clone Drawer */}
      <SideDrawer
        open={!!cloneTarget}
        onClose={() => setCloneTarget(null)}
        title="Clone Agent"
        subtitle={cloneTarget?.display_name}
        footer={
          <>
            <button onClick={() => setCloneTarget(null)} className="fi-button-secondary">Cancel</button>
            <button onClick={handleClone} disabled={cloneAgent.isPending} className="fi-button-primary">
              {cloneAgent.isPending ? 'Cloning...' : 'Clone'}
            </button>
          </>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              New Agent Name
            </label>
            <input
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              className="fi-input w-full"
              placeholder="Enter name for cloned agent"
            />
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
            The cloned agent will copy all configuration, contract, skills, tools, model, and governance settings.
            It will start as a draft version.
          </div>
        </div>
      </SideDrawer>
    </>
  )
}
