import { useState, useMemo } from 'react'
import { useSkills } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { FilterBar } from '../components/ui/FilterBar'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Skill } from '../types'
import { Plus, Sparkles, Search } from 'lucide-react'

const categoryColors: Record<string, string> = {
  Frontend: 'bg-blue-50 text-blue-700 border border-blue-200',
  Backend: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Testing: 'bg-amber-50 text-amber-700 border border-amber-200',
  Engineering: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  Security: 'bg-red-50 text-red-700 border border-red-200',
  Delivery: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  Operations: 'bg-slate-100 text-slate-700 border border-slate-300',
}

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
        s.language?.toLowerCase().includes(search.toLowerCase()) ||
        s.framework?.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [data, search, activeCategory])

  const categoryCounts = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = { All: data.length }
    for (const s of data) {
      counts[s.category] = (counts[s.category] || 0) + 1
    }
    return counts
  }, [data])

  return (
    <>
      <PageHeader
        title="Skills"
        description="Reusable engineering capabilities bindable to agents across the platform"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> New Skill
          </button>
        }
      />

      <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeCategory === cat
                ? 'border-forgeiq-600 text-forgeiq-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat}
            <span className="ml-1.5 text-xs text-slate-400">{categoryCounts[cat] ?? 0}</span>
          </button>
        ))}
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search skills by name, language, framework..." />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState message="No skills found matching your filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Category</th>
                    <th>Language</th>
                    <th>Framework</th>
                    <th>Capabilities</th>
                    <th className="text-right">Bound Agents</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((skill: Skill) => (
                    <tr
                      key={skill.id}
                      onClick={() => setSelected(skill)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-forgeiq-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="truncate">{skill.display_name || skill.name}</div>
                            {skill.description && (
                              <div className="text-xs text-slate-400 truncate max-w-xs">{skill.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`fi-badge ${categoryColors[skill.category] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {skill.category}
                        </span>
                      </td>
                      <td className="text-slate-600">{skill.language || '—'}</td>
                      <td className="text-slate-600">{skill.framework || '—'}</td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {skill.capabilities.map((cap) => (
                            <span key={cap} className="fi-badge bg-slate-50 text-slate-500 border border-slate-200 text-xs">{cap}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-right text-slate-600">{skill.agent_ids.length}</td>
                      <td>
                        <span className={`fi-badge ${skill.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          {skill.active ? 'active' : 'inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SideDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.display_name || ''}
        subtitle={selected?.category}
      >
        {selected && (
          <div className="p-4 space-y-4">
            <DetailsPanel
              columns={2}
              items={[
                { label: 'Skill ID', value: <span className="font-mono text-xs">{selected.id}</span> },
                { label: 'Category', value: <span className={`fi-badge ${categoryColors[selected.category] || ''}`}>{selected.category}</span> },
                { label: 'Language', value: selected.language || '—' },
                { label: 'Framework', value: selected.framework || '—' },
                { label: 'Version', value: selected.version },
                { label: 'Status', value: selected.active ? 'Active' : 'Inactive' },
              ]}
            />
            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-slate-700">{selected.description || 'No description provided.'}</p>
            </div>
            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.capabilities.map((cap) => (
                  <span key={cap} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{cap}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Bound Agents</h3>
              <p className="text-sm text-slate-600">{selected.agent_ids.length} agent(s) reference this skill</p>
            </div>
          </div>
        )}
      </SideDrawer>
    </>
  )
}
