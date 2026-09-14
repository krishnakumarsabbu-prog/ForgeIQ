import { useState, useMemo } from 'react'
import { useSkills } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import type { Skill } from '../types'
import { Plus, Sparkles, Search, X, Filter, Boxes, Activity, CheckCircle2, Code2 } from 'lucide-react'

const categoryStyle: Record<string, { bg: string; color: string; border: string }> = {
  Frontend:    { bg: 'rgba(99,102,241,0.1)',  color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
  Backend:     { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  Testing:     { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  Engineering: { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
  Security:    { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  Delivery:    { bg: 'rgba(6,182,212,0.1)',   color: '#0891b2', border: 'rgba(6,182,212,0.25)' },
  Operations:  { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' },
}
const DEFAULT_CAT = { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' }

const categories = ['All', 'Frontend', 'Backend', 'Testing', 'Engineering', 'Security', 'Delivery', 'Operations']

export default function SkillsPage() {
  const { data, isLoading } = useSkills()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selected, setSelected] = useState<Skill | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((s) => {
      const matchesCategory = activeCategory === 'All' || s.category === activeCategory
      const matchesSearch = !search ||
        s.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase()) ||
        s.language?.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [data, search, activeCategory])

  const categoryCounts = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = { All: data.length }
    for (const s of data) counts[s.category] = (counts[s.category] || 0) + 1
    return counts
  }, [data])

  const activeSkills = data?.filter(s => s.active).length ?? 0

  return (
    <>
      <PageHeader
        title="Skills"
        description="Reusable engineering capabilities bindable to agents across the platform"
        icon={<Sparkles size={18} />}
        badge={`${data?.length ?? 0} Skills`}
        badgeVariant="violet"
        actions={<button className="fi-btn-primary"><Plus size={13} /> New Skill</button>}
      />

      {/* Category Tab Bar */}
      <div
        className="flex items-center gap-0.5 px-6 overflow-x-auto"
        style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(226,232,240,0.8)' }}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="relative px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-all"
              style={{ color: isActive ? '#7c3aed' : '#64748b' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#0f172a' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#64748b' }}
            >
              {cat}
              <span
                className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={isActive
                  ? { background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }
                  : { background: '#f1f5f9', color: '#94a3b8' }
                }
              >
                {categoryCounts[cat] ?? 0}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#4f46e5)' }} />
              )}
            </button>
          )
        })}
      </div>

      <div className="p-6 space-y-4 max-w-[1800px] mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Skills"   value={data?.length ?? 0} sub="Registered"   icon={Sparkles}     gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Active"         value={activeSkills}       sub="Bound"        icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Languages"      value={new Set(data?.map(s=>s.language).filter(Boolean)).size} sub="Supported" icon={Code2} gradient={['#00adef','#0a68f4']} />
          <StatCard label="Categories"     value={Object.keys(categoryCounts).length - 1} sub="Domains" icon={Boxes} gradient={['#f59e0b','#f97316']} />
        </div>

        {/* Search */}
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)' }}
        >
          <Filter size={14} className="text-slate-400" />
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills by name, language, framework..." className="fi-input pl-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>
            {filtered.length} skills
          </span>
        </div>

        {/* Table */}
        <EnterpriseCard>
          <SectionHeader icon={Sparkles} title="Skill Registry" subtitle="All registered engineering capabilities" iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState message="No skills found" description="Create reusable skills to attach to your agents." />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Skill</th><th>Category</th><th>Language</th><th>Framework</th>
                    <th>Capabilities</th><th className="text-right">Bound Agents</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((skill: Skill) => {
                    const cs = categoryStyle[skill.category] ?? DEFAULT_CAT
                    return (
                      <tr key={skill.id} onClick={() => setSelected(skill)} className="cursor-pointer group">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                              <Sparkles size={13} style={{ color: '#7c3aed' }} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate">{skill.display_name || skill.name}</div>
                              {skill.description && <div className="text-[10px] text-slate-400 truncate max-w-[220px]">{skill.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}>
                            {skill.category}
                          </span>
                        </td>
                        <td className="text-xs font-mono text-slate-600">{skill.language || '—'}</td>
                        <td className="text-xs text-slate-600">{skill.framework || '—'}</td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {skill.capabilities.slice(0, 3).map(cap => (
                              <span key={cap} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{cap}</span>
                            ))}
                            {skill.capabilities.length > 3 && <span className="text-[10px] text-slate-400">+{skill.capabilities.length - 3}</span>}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="font-bold text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>
                            {skill.agent_ids.length}
                          </span>
                        </td>
                        <td><StatusBadge status={skill.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>

      <SideDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.display_name || ''} subtitle={selected?.category}>
        {selected && (
          <div className="p-5 space-y-5">
            <DetailsPanel columns={2} items={[
              { label: 'Skill ID',      value: <span className="font-mono text-xs">{selected.id}</span> },
              { label: 'Category',      value: <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: categoryStyle[selected.category]?.bg, color: categoryStyle[selected.category]?.color }}>{selected.category}</span> },
              { label: 'Language',      value: selected.language || '—' },
              { label: 'Framework',     value: selected.framework || '—' },
              { label: 'Version',       value: selected.version },
              { label: 'Status',        value: <StatusBadge status={selected.active ? 'ACTIVE' : 'INACTIVE'} /> },
            ]} />
            <div>
              <h3 className="fi-section-label mb-2">Description</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{selected.description || 'No description provided.'}</p>
            </div>
            <div>
              <h3 className="fi-section-label mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.capabilities.map(cap => (
                  <span key={cap} className="px-2 py-0.5 rounded-lg text-[11px] font-medium" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{cap}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="fi-section-label mb-2">Bound Agents</h3>
              <p className="text-sm text-slate-600">{selected.agent_ids.length} agent(s) reference this skill</p>
            </div>
          </div>
        )}
      </SideDrawer>
    </>
  )
}
