import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, X, Hash, Cpu, Code2, ShieldCheck, TestTube2, BookCheck,
  ArrowRightLeft, Lock, Filter, Clock, GitBranch, Package, Rocket,
  CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, Search,
  Layers, Server, Wrench, Eye, FileCheck, ShieldAlert, GitCommit,
} from 'lucide-react'
import { useEvidence, useEvidenceStats, useEvidenceTypes } from '../hooks/useQueries'
import { useApplications, useAgents, useHarnesses, usePipelines, useTools, useExecutions, useEnvironments } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Evidence } from '../types'

const typeIconMap: Record<string, typeof FileText> = {
  requirement: FileText,
  pipeline: Layers,
  harness: Package,
  graph: GitBranch,
  loop: ArrowRightLeft,
  agent: Cpu,
  model: Cpu,
  context: Eye,
  tool: Wrench,
  action: Wrench,
  code_change: Code2,
  test: TestTube2,
  security: ShieldCheck,
  build: Server,
  release: Rocket,
  deployment: Rocket,
  verification: FileCheck,
  approval: BookCheck,
  policy: ShieldAlert,
}

const typeColorMap: Record<string, string> = {
  requirement: 'bg-slate-100 text-slate-700 border border-slate-300',
  pipeline: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  harness: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  graph: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  loop: 'bg-amber-50 text-amber-700 border border-amber-200',
  agent: 'bg-violet-50 text-violet-700 border border-violet-200',
  model: 'bg-purple-50 text-purple-700 border border-purple-200',
  context: 'bg-blue-50 text-blue-700 border border-blue-200',
  tool: 'bg-teal-50 text-teal-700 border border-teal-200',
  action: 'bg-teal-50 text-teal-700 border border-teal-200',
  code_change: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  test: 'bg-blue-50 text-blue-700 border border-blue-200',
  security: 'bg-red-50 text-red-700 border border-red-200',
  build: 'bg-orange-50 text-orange-700 border border-orange-200',
  release: 'bg-pink-50 text-pink-700 border border-pink-200',
  deployment: 'bg-rose-50 text-rose-700 border border-rose-200',
  verification: 'bg-green-50 text-green-700 border border-green-200',
  approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  policy: 'bg-red-50 text-red-700 border border-red-200',
}

const statusIconMap: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  failed: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const statusColorMap: Record<string, string> = {
  success: 'text-emerald-600',
  failed: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}

function truncateId(id: string, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—'
}

function formatTimestamp(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function timeAgo(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function EvidenceTypeBadge({ type }: { type: string }) {
  const Icon = typeIconMap[type] || FileText
  const color = typeColorMap[type] || 'bg-slate-50 text-slate-600 border border-slate-200'
  return (
    <span className={`fi-badge ${color} inline-flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {type.replace('_', ' ')}
    </span>
  )
}

function StatusIcon({ status }: { status: string }) {
  const Icon = statusIconMap[status] || Info
  return <Icon className={`h-4 w-4 ${statusColorMap[status] || 'text-slate-500'}`} />
}

function JsonBlock({ label, icon: Icon, data }: { label: string; icon: typeof FileText; data: unknown }) {
  const isEmpty = !data || (typeof data === 'object' && Object.keys(data as object).length === 0)
  if (isEmpty) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto max-h-48 text-slate-700">
{JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

interface FilterState {
  application_id: string
  execution_id: string
  agent_id: string
  harness_id: string
  pipeline_id: string
  tool_id: string
  model_used: string
  environment: string
  evidence_type: string
  status: string
}

const emptyFilters: FilterState = {
  application_id: '', execution_id: '', agent_id: '', harness_id: '',
  pipeline_id: '', tool_id: '', model_used: '', environment: '',
  evidence_type: '', status: '',
}

export default function EvidencePage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [selected, setSelected] = useState<Evidence | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table')
  const [showFilters, setShowFilters] = useState(true)

  const { data: allEvidence, isLoading } = useEvidence()
  const { data: stats } = useEvidenceStats()
  const { data: evidenceTypes } = useEvidenceTypes()
  const { data: applications } = useApplications()
  const { data: agents } = useAgents()
  const { data: harnesses } = useHarnesses()
  const { data: pipelines } = usePipelines()
  const { data: tools } = useTools()
  const { data: executions } = useExecutions()
  const { data: environments } = useEnvironments()

  const appMap = useMemo(() => {
    const m: Record<string, string> = {}
    applications?.forEach(a => { m[a.id] = a.display_name })
    return m
  }, [applications])

  const agentMap = useMemo(() => {
    const m: Record<string, string> = {}
    agents?.forEach(a => { m[a.id] = a.display_name })
    return m
  }, [agents])

  const harnessMap = useMemo(() => {
    const m: Record<string, string> = {}
    harnesses?.forEach(h => { m[h.id] = h.display_name })
    return m
  }, [harnesses])

  const pipelineMap = useMemo(() => {
    const m: Record<string, string> = {}
    pipelines?.forEach(p => { m[p.id] = p.display_name })
    return m
  }, [pipelines])

  const toolMap = useMemo(() => {
    const m: Record<string, string> = {}
    tools?.forEach(t => { m[t.id] = t.display_name })
    return m
  }, [tools])

  const filteredEvidence = useMemo(() => {
    if (!allEvidence) return []
    return allEvidence.filter(e => {
      if (filters.application_id && e.application_id !== filters.application_id) return false
      if (filters.execution_id && e.execution_id !== filters.execution_id) return false
      if (filters.agent_id && e.agent_id !== filters.agent_id) return false
      if (filters.harness_id && e.harness_id !== filters.harness_id) return false
      if (filters.pipeline_id && e.pipeline_id !== filters.pipeline_id) return false
      if (filters.tool_id && e.tool_id !== filters.tool_id) return false
      if (filters.model_used && (!e.model_used || !e.model_used.toLowerCase().includes(filters.model_used.toLowerCase()))) return false
      if (filters.environment && (!e.environment || !e.environment.toLowerCase().includes(filters.environment.toLowerCase()))) return false
      if (filters.evidence_type && e.evidence_type !== filters.evidence_type) return false
      if (filters.status && e.status !== filters.status) return false
      return true
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [allEvidence, filters])

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== '').length
  }, [filters])

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters)
  }, [])

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Evidence Explorer" description="Immutable proof of engineering activity" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = filteredEvidence

  return (
    <div className="fi-card">
      <PageHeader
        title="Evidence Explorer"
        description="Immutable proof of engineering activity — every action in the engineering chain is recorded"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{items.length} records</span>
            <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Timeline
              </button>
            </div>
          </div>
        }
      />

      {/* Stats strip */}
      {stats && (
        <div className="flex items-center gap-4 px-6 py-2.5 border-b border-slate-200 bg-slate-50 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500">Total:</span>
            <span className="font-semibold text-slate-700">{stats.total}</span>
          </div>
          {Object.entries(stats.by_type).slice(0, 6).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1 text-xs">
              <span className={`fi-badge ${typeColorMap[type] || 'bg-slate-50 text-slate-600 border border-slate-200'} text-[10px] py-0.5`}>
                {type.replace('_', ' ')}
              </span>
              <span className="font-semibold text-slate-600">{count}</span>
            </div>
          ))}
          {Object.entries(stats.by_status).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1 text-xs">
              <StatusIcon status={status} />
              <span className="font-semibold text-slate-600">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-slate-200 bg-white">
        <div
          className="flex items-center gap-2 px-6 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 w-full"
        >
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 text-[10px] py-0.5">
                {activeFilterCount} active
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 ${showFilters ? 'rotate-180' : ''} transition-transform`} />
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-slate-400 hover:text-red-500 ml-auto"
            >
              Clear all
            </button>
          )}
        </div>
        {showFilters && (
          <div className="px-6 pb-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <FilterSelect
              label="Application"
              value={filters.application_id}
              onChange={v => handleFilterChange('application_id', v)}
              options={applications?.map(a => ({ value: a.id, label: a.display_name })) || []}
            />
            <FilterSelect
              label="Execution"
              value={filters.execution_id}
              onChange={v => handleFilterChange('execution_id', v)}
              options={executions?.slice(0, 20).map(e => ({ value: e.id, label: `${e.id.slice(0, 12)}…` })) || []}
            />
            <FilterSelect
              label="Agent"
              value={filters.agent_id}
              onChange={v => handleFilterChange('agent_id', v)}
              options={agents?.map(a => ({ value: a.id, label: a.display_name })) || []}
            />
            <FilterSelect
              label="Harness"
              value={filters.harness_id}
              onChange={v => handleFilterChange('harness_id', v)}
              options={harnesses?.map(h => ({ value: h.id, label: h.display_name })) || []}
            />
            <FilterSelect
              label="Pipeline"
              value={filters.pipeline_id}
              onChange={v => handleFilterChange('pipeline_id', v)}
              options={pipelines?.map(p => ({ value: p.id, label: p.display_name })) || []}
            />
            <FilterSelect
              label="Tool"
              value={filters.tool_id}
              onChange={v => handleFilterChange('tool_id', v)}
              options={tools?.map(t => ({ value: t.id, label: t.display_name })) || []}
            />
            <FilterInput
              label="Model"
              value={filters.model_used}
              onChange={v => handleFilterChange('model_used', v)}
              placeholder="Search model..."
            />
            <FilterSelect
              label="Environment"
              value={filters.environment}
              onChange={v => handleFilterChange('environment', v)}
              options={environments?.map(e => ({ value: e.name, label: e.display_name })) || []}
            />
            <FilterSelect
              label="Type"
              value={filters.evidence_type}
              onChange={v => handleFilterChange('evidence_type', v)}
              options={evidenceTypes?.types || []}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={v => handleFilterChange('status', v)}
              options={evidenceTypes?.statuses || []}
            />
          </div>
        )}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <EmptyState message="No evidence records match the current filters" icon={<FileText className="h-10 w-10" />} />
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Summary</th>
                <th>Agent</th>
                <th>Model</th>
                <th>Tool</th>
                <th>Environment</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => (
                <tr
                  key={ev.id}
                  onClick={() => setSelected(ev)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td><EvidenceTypeBadge type={ev.evidence_type} /></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={ev.status} />
                      <span className="text-xs text-slate-600">{ev.status}</span>
                    </div>
                  </td>
                  <td className="text-slate-700 max-w-xs truncate text-sm">{ev.summary || '—'}</td>
                  <td className="text-slate-700 text-xs">
                    {ev.agent_id ? (agentMap[ev.agent_id] || truncateId(ev.agent_id)) : '—'}
                  </td>
                  <td className="text-slate-700 text-xs">{ev.model_used || '—'}</td>
                  <td className="text-slate-700 text-xs">
                    {ev.tool_id ? (
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3 text-slate-400" />
                        {toolMap[ev.tool_id] || truncateId(ev.tool_id)}
                        {ev.tool_operation && <span className="text-slate-400">/{ev.tool_operation}</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-slate-600 text-xs">{ev.environment || '—'}</td>
                  <td className="text-slate-500 whitespace-nowrap text-xs">
                    <div>{formatTimestamp(ev.timestamp)}</div>
                    <div className="text-slate-400">{timeAgo(ev.timestamp)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TimelineView evidence={items} onSelect={setSelected} appMap={appMap} agentMap={agentMap} toolMap={toolMap} />
      )}

      {/* Detail drawer */}
      {selected && (
        <EvidenceDetailDrawer
          evidence={selected}
          onClose={() => setSelected(null)}
          navigate={navigate}
          appMap={appMap}
          agentMap={agentMap}
          harnessMap={harnessMap}
          pipelineMap={pipelineMap}
          toolMap={toolMap}
        />
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-forgeiq-400"
      >
        <option value="">All</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</label>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs border border-slate-200 rounded pl-7 pr-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-forgeiq-400"
        />
      </div>
    </div>
  )
}

function TimelineView({ evidence, onSelect, appMap, agentMap, toolMap }: {
  evidence: Evidence[]
  onSelect: (e: Evidence) => void
  appMap: Record<string, string>
  agentMap: Record<string, string>
  toolMap: Record<string, string>
}) {
  const sorted = [...evidence].sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return (
    <div className="px-6 py-4">
      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-1">
          {sorted.map((ev, idx) => {
            const Icon = typeIconMap[ev.evidence_type] || FileText
            const color = typeColorMap[ev.evidence_type] || 'bg-slate-50 text-slate-600 border border-slate-200'
            return (
              <div
                key={ev.id}
                onClick={() => onSelect(ev)}
                className="relative flex items-start gap-3 cursor-pointer hover:bg-slate-50 rounded-md p-1.5 -ml-1.5"
              >
                <div className={`relative z-10 flex items-center justify-center h-8 w-8 rounded-full ${color} shrink-0`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{ev.evidence_type.replace('_', ' ')}</span>
                    <StatusIcon status={ev.status} />
                    {ev.environment && (
                      <span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200 text-[10px] py-0">
                        {ev.environment}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">{timeAgo(ev.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{ev.summary}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                    {ev.agent_id && <span>Agent: {agentMap[ev.agent_id] || truncateId(ev.agent_id)}</span>}
                    {ev.model_used && <span>Model: {ev.model_used}</span>}
                    {ev.tool_id && <span>Tool: {toolMap[ev.tool_id] || truncateId(ev.tool_id)}{ev.tool_operation ? `/${ev.tool_operation}` : ''}</span>}
                    {ev.application_id && <span>App: {appMap[ev.application_id] || truncateId(ev.application_id)}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EvidenceDetailDrawer({ evidence: ev, onClose, navigate, appMap, agentMap, harnessMap, pipelineMap, toolMap }: {
  evidence: Evidence
  onClose: () => void
  navigate: (path: string) => void
  appMap: Record<string, string>
  agentMap: Record<string, string>
  harnessMap: Record<string, string>
  pipelineMap: Record<string, string>
  toolMap: Record<string, string>
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-xl h-full overflow-y-auto border-l border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <EvidenceTypeBadge type={ev.evidence_type} />
                <StatusIcon status={ev.status} />
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Immutable</span>
              </div>
              <h2 className="text-base font-semibold text-slate-900 mt-1.5">{ev.summary}</h2>
              <p className="font-mono text-xs text-slate-500 mt-0.5">{ev.id}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Chain context */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailField label="Timestamp" value={formatTimestamp(ev.timestamp)} />
            <DetailField label="Environment" value={ev.environment || '—'} />
            <DetailField
              label="Application"
              value={ev.application_id ? (appMap[ev.application_id] || truncateId(ev.application_id)) : '—'}
              link={ev.application_id ? `/applications/${ev.application_id}` : undefined}
              navigate={navigate}
            />
            <DetailField
              label="Execution"
              value={truncateId(ev.execution_id)}
              link={`/executions/${ev.execution_id}`}
              navigate={navigate}
            />
            <DetailField
              label="Agent"
              value={ev.agent_id ? (agentMap[ev.agent_id] || truncateId(ev.agent_id)) : '—'}
            />
            <DetailField label="Agent Version" value={ev.agent_version || '—'} mono />
            <DetailField label="Model" value={ev.model_used || '—'} />
            <DetailField label="Model Provider" value={ev.model_provider || '—'} />
            <DetailField
              label="Harness"
              value={ev.harness_id ? (harnessMap[ev.harness_id] || truncateId(ev.harness_id)) : '—'}
            />
            <DetailField label="Harness Version" value={ev.harness_version || '—'} mono />
            <DetailField
              label="Pipeline"
              value={ev.pipeline_id ? (pipelineMap[ev.pipeline_id] || truncateId(ev.pipeline_id)) : '—'}
            />
            <DetailField
              label="Tool"
              value={ev.tool_id ? `${toolMap[ev.tool_id] || truncateId(ev.tool_id)}${ev.tool_operation ? ` / ${ev.tool_operation}` : ''}` : '—'}
            />
            {ev.loop_iteration !== null && ev.loop_iteration !== undefined && (
              <DetailField label="Loop Iteration" value={String(ev.loop_iteration)} />
            )}
            {ev.node_id && <DetailField label="Graph Node" value={ev.node_id} mono />}
            {ev.context_reference && <DetailField label="Context Ref" value={ev.context_reference} mono />}
            {ev.requirement_id && <DetailField label="Requirement" value={truncateId(ev.requirement_id)} />}
          </div>

          {/* Integrity */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <Hash className="h-3.5 w-3.5" />
                Integrity Hash
              </div>
              <code className="block text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 break-all text-slate-700">
                {ev.hash}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Input Hash</div>
                <code className="block text-[10px] font-mono bg-slate-50 border border-slate-200 rounded p-1.5 break-all text-slate-600">
                  {ev.input_hash || '—'}
                </code>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Output Hash</div>
                <code className="block text-[10px] font-mono bg-slate-50 border border-slate-200 rounded p-1.5 break-all text-slate-600">
                  {ev.output_reference || '—'}
                </code>
              </div>
            </div>
            {ev.previous_evidence_id && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <GitCommit className="h-3.5 w-3.5" />
                Chain linked to: <code className="font-mono text-slate-600">{truncateId(ev.previous_evidence_id)}</code>
              </div>
            )}
          </div>

          {/* Engineering artifacts */}
          <JsonBlock label="Inputs" icon={ArrowRightLeft} data={ev.inputs} />
          <JsonBlock label="Outputs" icon={FileText} data={ev.outputs} />
          <JsonBlock label="Code Changes" icon={Code2} data={ev.code_changes} />
          <JsonBlock label="Test Results" icon={TestTube2} data={ev.test_results} />
          <JsonBlock label="Security Results" icon={ShieldCheck} data={ev.security_results} />
          <JsonBlock label="Build Results" icon={Server} data={ev.build_results} />
          <JsonBlock label="Release Results" icon={Rocket} data={ev.release_results} />
          <JsonBlock label="Deployment" icon={Rocket} data={ev.deployment} />
          <JsonBlock label="Verification" icon={FileCheck} data={ev.verification} />

          {/* Approvals */}
          {ev.approvals && ev.approvals.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <BookCheck className="h-3.5 w-3.5" />
                Approvals
              </div>
              <div className="space-y-1">
                {ev.approvals.map((a, i) => (
                  <div key={i} className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-amber-800">{String(a.approver ?? 'Unknown')}</span>
                      <StatusBadge status={String(a.decision ?? '').toUpperCase()} />
                    </div>
                    {Boolean(a.reason) && <p className="text-amber-700 mt-0.5">{String(a.reason)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policies */}
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <ShieldAlert className="h-3.5 w-3.5" />
              Policies Applied
            </div>
            {ev.policies_applied && ev.policies_applied.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {ev.policies_applied.map((p, i) => (
                  <span key={i} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate-400">None</span>
            )}
          </div>

          {/* Policy decisions */}
          {ev.policy_decisions && ev.policy_decisions.length > 0 && (
            <JsonBlock label="Policy Decisions" icon={ShieldAlert} data={ev.policy_decisions} />
          )}
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value, link, navigate, mono }: {
  label: string
  value: string
  link?: string
  navigate?: (path: string) => void
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      {link && navigate ? (
        <button
          onClick={() => navigate(link)}
          className={`text-forgeiq-600 hover:underline flex items-center gap-1 ${mono ? 'font-mono text-xs' : 'text-sm'}`}
        >
          {value}
          <ArrowRightLeft className="h-3 w-3" />
        </button>
      ) : (
        <div className={mono ? 'font-mono text-xs text-slate-700' : 'text-sm text-slate-700'}>{value}</div>
      )}
    </div>
  )
}
