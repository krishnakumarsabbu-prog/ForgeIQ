import { useState, useMemo } from 'react'
import { useTools } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import type { Tool } from '../types'
import { Plus, Wrench, Shield, Search, X, Filter, AlertTriangle, CheckCircle2, Lock } from 'lucide-react'

const riskStyle: Record<string, { bg: string; color: string; border: string }> = {
  LOW:      { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  MEDIUM:   { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  HIGH:     { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  CRITICAL: { bg: 'rgba(127,29,29,0.12)',  color: '#991b1b', border: 'rgba(127,29,29,0.3)' },
}
const DEFAULT_RISK = { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.2)' }

const toolCategories = [
  { value: 'All', label: 'All' },
  { value: 'vcs', label: 'VCS' },
  { value: 'filesystem', label: 'Filesystem' },
  { value: 'shell', label: 'Shell' },
  { value: 'package', label: 'Package' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'build', label: 'Build' },
  { value: 'testing', label: 'Testing' },
  { value: 'security', label: 'Security' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'operations', label: 'Operations' },
  { value: 'integration', label: 'Integration' },
]

const riskOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }

export default function ToolsPage() {
  const { data, isLoading } = useTools()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selected, setSelected] = useState<Tool | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((t) => {
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory
      const matchesSearch = !search ||
        t.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.allowed_operations?.some(op => op.toLowerCase().includes(search.toLowerCase()))
      return matchesCategory && matchesSearch
    }).sort((a, b) => (riskOrder[b.risk_level] ?? 0) - (riskOrder[a.risk_level] ?? 0))
  }, [data, search, activeCategory])

  const categoryCounts = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = { All: data.length }
    for (const t of data) counts[t.category] = (counts[t.category] || 0) + 1
    return counts
  }, [data])

  const criticalTools = data?.filter(t => t.risk_level === 'CRITICAL' || t.risk_level === 'HIGH').length ?? 0

  return (
    <>
      <PageHeader
        title="Tools"
        description="Controlled execution capabilities with permission boundaries and risk levels"
        icon={<Wrench size={18} />}
        badge={`${data?.length ?? 0} Tools`}
        badgeVariant="amber"
        actions={<button className="fi-btn-primary"><Plus size={13} /> Register Tool</button>}
      />

      {/* Category Tabs */}
      <div className="flex items-center gap-0.5 px-6 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
        {toolCategories.map((cat) => {
          const isActive = activeCategory === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className="relative px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-all"
              style={{ color: isActive ? '#b45309' : '#64748b' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#0f172a' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#64748b' }}
            >
              {cat.label}
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={isActive ? { background: 'rgba(245,158,11,0.12)', color: '#b45309' } : { background: '#f1f5f9', color: '#94a3b8' }}>
                {categoryCounts[cat.value] ?? 0}
              </span>
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: 'linear-gradient(90deg,#f59e0b,#f97316)' }} />}
            </button>
          )
        })}
      </div>

      <div className="p-6 space-y-4 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Tools"    value={data?.length ?? 0} sub="Registered"     icon={Wrench}       gradient={['#f59e0b','#f97316']} />
          <StatCard label="Active"         value={data?.filter(t=>t.active).length ?? 0} sub="Enabled" icon={CheckCircle2} gradient={['#10b981','#0891b2']} />
          <StatCard label="High Risk"      value={criticalTools}     sub="Requires audit" icon={AlertTriangle} gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Categories"     value={toolCategories.length - 1} sub="Types"  icon={Shield}       gradient={['#6366f1','#7c3aed']} />
        </div>

        <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)' }}>
          <Filter size={14} className="text-slate-400" />
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools by name, operation, description..." className="fi-input pl-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>
            {filtered.length} tools
          </span>
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Wrench} title="Tool Registry" subtitle="All registered execution capabilities" iconColor="#f59e0b" />
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState message="No tools found" description="Register execution tools to bind to your AI agents." />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Tool</th><th>Category</th><th>Risk Level</th><th>Operations</th>
                    <th>Environments</th><th className="text-right">Bound Agents</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tool: Tool) => {
                    const rs = riskStyle[tool.risk_level] ?? DEFAULT_RISK
                    return (
                      <tr key={tool.id} onClick={() => setSelected(tool)} className="cursor-pointer group">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                              <Wrench size={13} style={{ color: '#f59e0b' }} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate">{tool.display_name || tool.name}</div>
                              {tool.description && <div className="text-[10px] text-slate-400 truncate max-w-[220px]">{tool.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="text-xs font-medium text-slate-600 capitalize">{tool.category}</span></td>
                        <td>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
                            {tool.risk_level}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {tool.allowed_operations.slice(0, 3).map(op => (
                              <span key={op} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{op}</span>
                            ))}
                            {tool.allowed_operations.length > 3 && <span className="text-[10px] text-slate-400">+{tool.allowed_operations.length - 3}</span>}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {tool.supported_environments.map(env => (
                              <span key={env} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}>{env}</span>
                            ))}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="font-bold text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.15)' }}>
                            {tool.agent_ids.length}
                          </span>
                        </td>
                        <td><StatusBadge status={tool.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>

      <SideDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.display_name || ''} subtitle={selected ? `${selected.category} · ${selected.risk_level} risk` : ''}>
        {selected && (
          <div className="p-5 space-y-5">
            <DetailsPanel columns={2} items={[
              { label: 'Tool ID',      value: <span className="font-mono text-xs">{selected.id}</span> },
              { label: 'Category',     value: <span className="capitalize text-xs">{selected.category}</span> },
              { label: 'Risk Level',   value: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: riskStyle[selected.risk_level]?.bg, color: riskStyle[selected.risk_level]?.color }}>{selected.risk_level}</span> },
              { label: 'Timeout',      value: `${selected.timeout_seconds}s` },
              { label: 'Status',       value: <StatusBadge status={selected.active ? 'ACTIVE' : 'INACTIVE'} /> },
              { label: 'Bound Agents', value: `${selected.agent_ids.length} agent(s)` },
            ]} />
            <div>
              <h3 className="fi-section-label mb-2">Description</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{selected.description || 'No description provided.'}</p>
            </div>
            <div>
              <h3 className="fi-section-label mb-2">Allowed Operations</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.allowed_operations.map(op => (
                  <span key={op} className="px-2 py-0.5 rounded-lg text-[11px] font-medium" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{op}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="fi-section-label mb-2">Supported Environments</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.supported_environments.map(env => (
                  <span key={env} className="px-2 py-0.5 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}>{env}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="fi-section-label mb-2 flex items-center gap-1.5"><Lock size={11} /> Permission Boundary</h3>
              <div className="space-y-1.5">
                {selected.permissions.map(perm => (
                  <div key={perm} className="text-xs font-mono px-3 py-2 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid #e2e8f0', color: '#475569' }}>{perm}</div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="fi-section-label mb-2">Evidence Requirements</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.evidence_requirements.map(req => (
                  <span key={req} className="px-2 py-0.5 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>{req}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="fi-section-label mb-2">Input Schema</h3>
              <pre className="text-xs font-mono p-3 rounded-xl overflow-x-auto" style={{ background: '#0b0f19', color: '#10b981', border: '1px solid rgba(255,255,255,0.06)' }}>
                {JSON.stringify(selected.inputs_schema, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </SideDrawer>
    </>
  )
}
