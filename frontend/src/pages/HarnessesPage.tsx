import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHarnesses, useCloneHarness, useArchiveHarness, usePublishHarness, useCreateHarnessVersion, useAgents, useSkills, useTools, useGraphs, useLoops, usePolicies, useExecutions } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer } from '../components/ui/SideDrawer'
import type { Harness, Agent, Skill, Tool, Graph, Loop, Policy, Execution } from '../types'
import {
  Plus, Layers, MoreVertical, Copy, GitBranch, Eye, Play, Archive,
  CheckCircle2, FileText, Search, X, Shield, Wrench, Bot, Network,
  Repeat, Clock, DollarSign, TrendingUp, ArrowLeftRight,
} from 'lucide-react'

const HARNESS_CATEGORIES = [
  'Development', 'Testing', 'Security', 'Build', 'Release',
  'Deployment', 'Verification', 'Operations', 'Remediation', 'Custom',
]

const categoryColors: Record<string, string> = {
  development: 'bg-forgeiq-50 text-forgeiq-700 border-forgeiq-200',
  testing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  security: 'bg-red-50 text-red-700 border-red-200',
  build: 'bg-amber-50 text-amber-700 border-amber-200',
  release: 'bg-amber-50 text-amber-700 border-amber-200',
  deployment: 'bg-orange-50 text-orange-700 border-orange-200',
  verification: 'bg-blue-50 text-blue-700 border-blue-200',
  operations: 'bg-slate-50 text-slate-600 border-slate-200',
  remediation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  architecture: 'bg-forgeiq-50 text-forgeiq-700 border-forgeiq-200',
  incident: 'bg-red-50 text-red-700 border-red-200',
  brownfield_discovery: 'bg-slate-50 text-slate-600 border-slate-200',
  custom: 'bg-slate-50 text-slate-600 border-slate-200',
}

const lifecycleConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  draft: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  validated: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  deprecated: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300', dot: 'bg-slate-400' },
}

const LIFECYCLE_STEPS = ['draft', 'validated', 'published', 'deprecated', 'archived']

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

function LifecycleBadge({ lifecycle }: { lifecycle: string }) {
  const cfg = lifecycleConfig[lifecycle] ?? lifecycleConfig['draft']
  return (
    <span className={`fi-badge ${cfg.bg} ${cfg.text} ${cfg.border} text-xs`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} inline-block mr-1`} />
      {lifecycle}
    </span>
  )
}

function LifecycleProgression({ lifecycle }: { lifecycle: string }) {
  const currentIdx = LIFECYCLE_STEPS.indexOf(lifecycle)
  return (
    <div className="flex items-center gap-1">
      {LIFECYCLE_STEPS.map((step, i) => {
        const isPast = i <= currentIdx
        const isCurrent = i === currentIdx
        const cfg = lifecycleConfig[step]
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && <div className={`w-4 h-px ${isPast ? cfg.dot : 'bg-slate-200'}`} />}
            <div
              className={`w-2 h-2 rounded-full ${isCurrent ? cfg.dot : isPast ? cfg.dot : 'bg-slate-200'} ${isCurrent ? 'ring-2 ring-offset-1 ring-' + step : ''}`}
              title={step}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function HarnessesPage() {
  const { data: harnesses, isLoading } = useHarnesses()
  const { data: agents } = useAgents()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: graphs } = useGraphs()
  const { data: loops } = useLoops()
  const { data: policies } = usePolicies()
  const { data: executions } = useExecutions()
  const navigate = useNavigate()
  const cloneHarness = useCloneHarness()
  const archiveHarness = useArchiveHarness()
  const publishHarness = usePublishHarness()
  const createVersion = useCreateHarnessVersion()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('')
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [cloneTarget, setCloneTarget] = useState<Harness | null>(null)
  const [cloneName, setCloneName] = useState('')

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

  const execByHarness = useMemo(() => {
    const m = new Map<string, { total: number; success: number }>()
    ;(executions ?? []).forEach((e: Execution) => {
      if (!e.harness_id) return
      const cur = m.get(e.harness_id) ?? { total: 0, success: 0 }
      cur.total++
      if (e.status === 'COMPLETED') cur.success++
      m.set(e.harness_id, cur)
    })
    return m
  }, [executions])

  const filtered = useMemo(() => {
    let items = harnesses ?? []
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((h) =>
        h.display_name.toLowerCase().includes(q) ||
        h.purpose.toLowerCase().includes(q) ||
        h.harness_type.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) items = items.filter((h) => h.harness_type === categoryFilter)
    if (lifecycleFilter) items = items.filter((h) => h.lifecycle === lifecycleFilter)
    return items
  }, [harnesses, search, categoryFilter, lifecycleFilter])

  const stats = useMemo(() => {
    const all = harnesses ?? []
    return {
      total: all.length,
      published: all.filter((h) => h.lifecycle === 'published').length,
      draft: all.filter((h) => h.lifecycle === 'draft' || h.lifecycle === 'validated').length,
      deprecated: all.filter((h) => h.lifecycle === 'deprecated').length,
      archived: all.filter((h) => h.lifecycle === 'archived').length,
    }
  }, [harnesses])

  const handleClone = () => {
    if (!cloneTarget) return
    cloneHarness.mutate(
      { id: cloneTarget.id, body: { display_name: cloneName || `${cloneTarget.display_name} (Clone)` } },
      {
        onSuccess: (newHarness) => {
          setCloneTarget(null)
          setCloneName('')
          navigate(`/harnesses/${newHarness.id}`)
        },
      }
    )
  }

  const handleArchive = (harness: Harness) => {
    if (confirm(`Archive harness "${harness.display_name}"? This will mark it as archived.`)) {
      archiveHarness.mutate(harness.id)
    }
  }

  return (
    <>
      <PageHeader
        title="Harness Catalog"
        description="Governed engineering execution contracts — graph, loops, agents, skills, tools, policies, and evidence"
        actions={
          <button onClick={() => navigate('/harness-builder')} className="fi-button-primary">
            <Plus className="h-4 w-4" /> Create Harness
          </button>
        }
      />

      <div className="p-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="fi-card p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
            <div className="text-xl font-semibold text-slate-900 mt-0.5">{stats.total}</div>
          </div>
          <div className="fi-card p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Published</div>
            <div className="text-xl font-semibold text-emerald-600 mt-0.5">{stats.published}</div>
          </div>
          <div className="fi-card p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Draft / Validated</div>
            <div className="text-xl font-semibold text-blue-600 mt-0.5">{stats.draft}</div>
          </div>
          <div className="fi-card p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Deprecated</div>
            <div className="text-xl font-semibold text-amber-600 mt-0.5">{stats.deprecated}</div>
          </div>
          <div className="fi-card p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Archived</div>
            <div className="text-xl font-semibold text-slate-500 mt-0.5">{stats.archived}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="fi-card px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search harnesses..."
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
            {HARNESS_CATEGORIES.map((c) => (
              <option key={c} value={c.toLowerCase()}>{c}</option>
            ))}
          </select>
          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value)}
            className="fi-input w-auto"
          >
            <option value="">All Lifecycles</option>
            <option value="draft">Draft</option>
            <option value="validated">Validated</option>
            <option value="published">Published</option>
            <option value="deprecated">Deprecated</option>
            <option value="archived">Archived</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} harnesses</span>
        </div>

        {/* Dense enterprise table */}
        <div className="fi-card overflow-hidden">
          {isLoading ? (
            <LoadingSpinner />
          ) : !filtered || filtered.length === 0 ? (
            <EmptyState message="No harnesses found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left">Harness</th>
                    <th className="text-left">Purpose</th>
                    <th className="text-left">Version</th>
                    <th className="text-left">Lifecycle</th>
                    <th className="text-left">Category</th>
                    <th className="text-right">Agents</th>
                    <th className="text-right">Skills</th>
                    <th className="text-right">Tools</th>
                    <th className="text-right">Graph Nodes</th>
                    <th className="text-right">Loops</th>
                    <th className="text-right">Policies</th>
                    <th className="text-left">Environment</th>
                    <th className="text-right">Executions</th>
                    <th className="text-right">Success Rate</th>
                    <th className="text-left">Last Published</th>
                    <th className="text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((harness: Harness) => {
                    const graph = graphMap.get(harness.graph_id ?? '')
                    const nodeCount = graph?.nodes.length ?? 0
                    const execStats = execByHarness.get(harness.id) ?? { total: 0, success: 0 }
                    const successRate = execStats.total > 0 ? Math.round((execStats.success / execStats.total) * 100) : 0
                    return (
                      <tr
                        key={harness.id}
                        className="cursor-pointer hover:bg-slate-50 border-b border-slate-100 group"
                        onClick={() => navigate(`/harnesses/${harness.id}`)}
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center flex-shrink-0">
                              <Layers className="h-3.5 w-3.5 text-forgeiq-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 text-sm truncate">{harness.display_name}</div>
                              <div className="text-xs text-slate-400 truncate max-w-[180px]">{harness.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs text-slate-500 max-w-[200px] truncate">{harness.purpose}</td>
                        <td className="text-slate-600 font-mono text-xs">{harness.current_version}</td>
                        <td><LifecycleBadge lifecycle={harness.lifecycle} /></td>
                        <td>
                          <span className={`fi-badge text-xs ${categoryColors[harness.harness_type] || categoryColors['custom']}`}>
                            {harness.harness_type}
                          </span>
                        </td>
                        <td className="text-right text-slate-600 text-sm">{harness.agent_ids.length}</td>
                        <td className="text-right text-slate-600 text-sm">{harness.skill_ids.length}</td>
                        <td className="text-right text-slate-600 text-sm">{harness.tool_ids.length}</td>
                        <td className="text-right text-slate-600 text-sm">{nodeCount}</td>
                        <td className="text-right text-slate-600 text-sm">{harness.loop_ids.length}</td>
                        <td className="text-right text-slate-600 text-sm">{harness.policy_ids.length}</td>
                        <td className="text-xs text-slate-600 whitespace-nowrap">{harness.environment}</td>
                        <td className="text-right text-slate-600 text-sm">{execStats.total}</td>
                        <td className="text-right">
                          <span className={`text-sm font-medium ${successRate >= 80 ? 'text-emerald-600' : successRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {execStats.total > 0 ? `${successRate}%` : '—'}
                          </span>
                        </td>
                        <td className="text-slate-500 text-xs whitespace-nowrap">{formatRelative(harness.last_published_at ?? harness.created_at)}</td>
                        <td className="text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === harness.id ? null : harness.id)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                          {actionMenuId === harness.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm">
                                <button
                                  onClick={() => { navigate(`/harnesses/${harness.id}`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Open
                                </button>
                                <button
                                  onClick={() => { navigate('/executions'); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Play className="h-3.5 w-3.5" /> Run
                                </button>
                                <button
                                  onClick={() => { setCloneTarget(harness); setCloneName(`${harness.display_name} (Clone)`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Copy className="h-3.5 w-3.5" /> Clone
                                </button>
                                <button
                                  onClick={() => { createVersion.mutate({ id: harness.id, body: { changelog: 'New version from catalog' } }); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <GitBranch className="h-3.5 w-3.5" /> Create Version
                                </button>
                                <button
                                  onClick={() => { navigate(`/harnesses/${harness.id}`); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <ArrowLeftRight className="h-3.5 w-3.5" /> Compare
                                </button>
                                <button
                                  onClick={() => { publishHarness.mutate({ id: harness.id, version: harness.current_version }); setActionMenuId(null) }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Publish
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => handleArchive(harness)}
                                  className="w-full px-3 py-1.5 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                                >
                                  <Archive className="h-3.5 w-3.5" /> Archive
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
        title="Clone Harness"
        subtitle={cloneTarget?.display_name}
        footer={
          <>
            <button onClick={() => setCloneTarget(null)} className="fi-button-secondary">Cancel</button>
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
