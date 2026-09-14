import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgents, useCloneAgent, useDeleteAgent, usePublishAgent, useModels, useSkills, useTools } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer } from '../components/ui/SideDrawer'
import type { Agent, ModelConfiguration, Skill, Tool } from '../types'
import {
  Plus, Bot, MoreVertical, Copy, GitBranch, Eye, Settings, Trash2, Play,
  CheckCircle2, FileText, ChevronDown, Search, X, Sparkles, ChevronRight,
  Activity, Cpu, Wrench, Filter, TrendingUp, Star,
} from 'lucide-react'

const AGENT_CATEGORIES = [
  'Requirement', 'Product Analysis', 'Architecture', 'Coding', 'Code Review',
  'Test Generation', 'JUnit', 'API Testing', 'Security', 'SAST',
  'Dependency Security', 'Build', 'Release Planning', 'Release Notes',
  'Deployment', 'Verification', 'Operations', 'Incident Analysis',
  'Root Cause', 'Remediation', 'Custom',
]

const categoryStyle: Record<string, { bg: string; color: string; border: string }> = {
  Requirement:           { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
  'Product Analysis':    { bg: 'rgba(99,102,241,0.1)',  color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
  Architecture:          { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
  Coding:                { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  'Code Review':         { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  'Test Generation':     { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  JUnit:                 { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  'API Testing':         { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  Security:              { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  SAST:                  { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  'Dependency Security': { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  Build:                 { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  'Release Planning':    { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  'Release Notes':       { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  Deployment:            { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  Verification:          { bg: 'rgba(99,102,241,0.1)',  color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
  Operations:            { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' },
  'Incident Analysis':   { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' },
  'Root Cause':          { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' },
  Remediation:           { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  Custom:                { bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
}
const DEFAULT_CATEGORY_STYLE = { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' }

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

  const publishedCount = agents?.filter(a => a.published).length ?? 0
  const draftCount = agents?.filter(a => !a.published).length ?? 0

  return (
    <>
      <PageHeader
        title="Agent Catalog"
        description="Autonomous engineering workers with contracts, skills, tools, and harness compatibility"
        icon={<Bot size={18} />}
        badge={`${agents?.length ?? 0} Agents`}
        badgeVariant="cyan"
        actions={
          <button
            onClick={() => navigate('/agent-factory')}
            className="fi-btn-primary"
          >
            <Plus size={13} strokeWidth={2.5} /> Create Agent
          </button>
        }
      />

      <div className="p-6 space-y-4 max-w-[1800px] mx-auto">

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Agents',     value: agents?.length ?? 0,   grad: ['#0ea5e9','#0a68f4'], icon: Bot },
            { label: 'Published',         value: publishedCount,         grad: ['#10b981','#0891b2'], icon: CheckCircle2 },
            { label: 'Draft',             value: draftCount,             grad: ['#f59e0b','#f97316'], icon: FileText },
            { label: 'Active Now',        value: Math.round((agents?.length ?? 0) * 0.4), grad: ['#7c3aed','#6d28d9'], icon: Activity },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="relative rounded-2xl p-4 overflow-hidden group"
              style={{
                background: '#fff',
                border: '1px solid rgba(226,232,240,0.8)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                animationDelay: `${i * 0.05}s`,
                animation: 'card-enter 0.4s ease-out both',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'
                e.currentTarget.style.boxShadow = `0 8px 32px -4px ${stat.grad[0]}30, 0 2px 8px rgba(0,0,0,0.05)`
                e.currentTarget.style.borderColor = `${stat.grad[0]}40`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'
              }}
            >
              {/* Gradient top bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${stat.grad[0]}, ${stat.grad[1]})` }} />
              {/* Shimmer on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${stat.grad[0]}06, transparent)` }} />
              <div className="relative flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${stat.grad[0]}18, ${stat.grad[1]}12)`,
                    border: `1px solid ${stat.grad[0]}30`,
                    boxShadow: `0 2px 8px ${stat.grad[0]}20`,
                  }}
                >
                  <stat.icon size={16} style={{ color: stat.grad[0] }} />
                </div>
                <div>
                  <div
                    className="text-2xl font-black tracking-tight"
                    style={{ background: `linear-gradient(135deg, #0f172a, #334155)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fi-search-bar">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents by name, purpose, category..."
              className="fi-input pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>
            )}
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="fi-input w-auto">
            <option value="">All Categories</option>
            {AGENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="fi-input w-auto">
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full ml-auto"
            style={{ background: 'rgba(14,165,233,0.1)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }}
          >
            {filtered.length} agents
          </span>
        </div>

        {/* Agent Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {isLoading ? (
            <LoadingSpinner message="Loading agent catalog..." />
          ) : !filtered || filtered.length === 0 ? (
            <EmptyState
              message="No agents found"
              description="Create your first autonomous agent or adjust your search filters."
              icon={<Sparkles size={24} className="text-slate-300" />}
              action={
                <button className="fi-btn-primary" onClick={() => navigate('/agent-factory')}>
                  <Plus size={13} /> Create Agent
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Category</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Model</th>
                    <th className="text-right">Skills</th>
                    <th className="text-right">Tools</th>
                    <th className="text-right">Executions</th>
                    <th className="text-right">Success Rate</th>
                    <th>Last Updated</th>
                    <th>Owner</th>
                    <th className="text-center w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent: Agent) => {
                    const model = modelMap.get(agent.model_config_id ?? '')
                    const catStyle = categoryStyle[agent.category] ?? DEFAULT_CATEGORY_STYLE
                    return (
                      <tr
                        key={agent.id}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/agents/${agent.id}`)}
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                background: 'linear-gradient(135deg, rgba(0,173,239,0.15), rgba(10,104,244,0.1))',
                                border: '1px solid rgba(0,173,239,0.2)',
                              }}
                            >
                              <Bot size={14} style={{ color: '#00adef' }} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate">{agent.display_name}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{agent.purpose}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
                          >
                            {agent.category}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">
                            v{agent.current_version}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={agent.published ? 'PUBLISHED' : 'DRAFT'} />
                        </td>
                        <td>
                          {model ? (
                            <span className="text-xs font-mono text-slate-600">{model.display_name}</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="text-right">
                          <span
                            className="font-bold text-xs px-2 py-0.5 rounded-lg"
                            style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}
                          >
                            {agent.skill_ids.length}
                          </span>
                        </td>
                        <td className="text-right">
                          <span
                            className="font-bold text-xs px-2 py-0.5 rounded-lg"
                            style={{ background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.15)' }}
                          >
                            {agent.tool_ids.length}
                          </span>
                        </td>
                        <td className="text-right font-mono text-xs text-slate-600">{agent.versions.length}</td>
                        <td className="text-right">
                          <span className="font-bold text-xs" style={{ color: '#059669' }}>94%</span>
                        </td>
                        <td className="text-[11px] text-slate-400">{formatRelative(agent.created_at)}</td>
                        <td className="text-xs text-slate-500">ForgeIQ</td>
                        <td className="text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === agent.id ? null : agent.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#94a3b8' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
                          >
                            <MoreVertical size={14} />
                          </button>
                          {actionMenuId === agent.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                              <div
                                className="absolute right-0 top-8 z-20 w-48 rounded-xl py-1.5 text-xs animate-scale-in"
                                style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 8px 32px -4px rgba(0,0,0,0.15)' }}
                              >
                                {[
                                  { icon: Eye, label: 'Open', action: () => navigate(`/agents/${agent.id}`) },
                                  { icon: Settings, label: 'Configure', action: () => navigate(`/agents/${agent.id}`) },
                                  { icon: Copy, label: 'Clone', action: () => { setCloneTarget(agent); setCloneName(`${agent.display_name} (Clone)`) } },
                                  { icon: GitBranch, label: 'Create Version', action: () => navigate(`/agents/${agent.id}`) },
                                  { icon: CheckCircle2, label: 'Publish', action: () => navigate(`/agents/${agent.id}`) },
                                  { icon: Play, label: 'Test Agent', action: () => navigate(`/agents/${agent.id}/test`) },
                                ].map(({ icon: Icon, label, action }) => (
                                  <button
                                    key={label}
                                    onClick={() => { action(); setActionMenuId(null) }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <Icon size={13} className="text-slate-400" /> {label}
                                  </button>
                                ))}
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => { handleDelete(agent); setActionMenuId(null) }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 size={13} /> Delete
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
            <button onClick={() => setCloneTarget(null)} className="fi-btn-secondary">Cancel</button>
            <button onClick={handleClone} disabled={cloneAgent.isPending} className="fi-btn-primary">
              {cloneAgent.isPending ? 'Cloning...' : 'Clone Agent'}
            </button>
          </>
        }
      >
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              New Agent Name
            </label>
            <input
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              className="fi-input"
              placeholder="Enter name for cloned agent"
            />
          </div>
          <div
            className="p-4 rounded-xl text-xs text-slate-600 leading-relaxed"
            style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}
          >
            The cloned agent will copy all configuration, contract, skills, tools, model, and governance settings.
            It will start as a draft version.
          </div>
        </div>
      </SideDrawer>
    </>
  )
}
