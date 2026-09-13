import { useState, useMemo } from 'react'
import { useTools } from '../hooks/useQueries'
import { PageHeader, RiskBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { FilterBar } from '../components/ui/FilterBar'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Tool } from '../types'
import { Plus, Wrench, Shield } from 'lucide-react'

const toolCategories = [
  { value: 'All', label: 'All' },
  { value: 'vcs', label: 'Version Control' },
  { value: 'filesystem', label: 'Filesystem' },
  { value: 'shell', label: 'Shell' },
  { value: 'package', label: 'Package' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'build', label: 'Build' },
  { value: 'testing', label: 'Testing' },
  { value: 'security', label: 'Security' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'orchestration', label: 'Orchestration' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'operations', label: 'Operations' },
  { value: 'integration', label: 'Integration' },
  { value: 'notification', label: 'Notification' },
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
        t.allowed_operations?.some((op) => op.toLowerCase().includes(search.toLowerCase()))
      return matchesCategory && matchesSearch
    }).sort((a, b) => (riskOrder[b.risk_level] ?? 0) - (riskOrder[a.risk_level] ?? 0))
  }, [data, search, activeCategory])

  const categoryCounts = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = { All: data.length }
    for (const t of data) {
      counts[t.category] = (counts[t.category] || 0) + 1
    }
    return counts
  }, [data])

  return (
    <>
      <PageHeader
        title="Tools"
        description="Controlled execution capabilities with permission boundaries and risk levels"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> New Tool
          </button>
        }
      />

      <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white overflow-x-auto">
        {toolCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeCategory === cat.value
                ? 'border-forgeiq-600 text-forgeiq-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat.label}
            <span className="ml-1.5 text-xs text-slate-400">{categoryCounts[cat.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search tools by name, operation, description..." />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState message="No tools found matching your filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Category</th>
                    <th>Risk Level</th>
                    <th>Operations</th>
                    <th>Environments</th>
                    <th className="text-right">Bound Agents</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tool: Tool) => (
                    <tr
                      key={tool.id}
                      onClick={() => setSelected(tool)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-forgeiq-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="truncate">{tool.display_name || tool.name}</div>
                            {tool.description && (
                              <div className="text-xs text-slate-400 truncate max-w-xs">{tool.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-600 capitalize">{tool.category}</td>
                      <td><RiskBadge level={tool.risk_level} /></td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {tool.allowed_operations.slice(0, 3).map((op) => (
                            <span key={op} className="fi-badge bg-slate-50 text-slate-500 border border-slate-200 text-xs">{op}</span>
                          ))}
                          {tool.allowed_operations.length > 3 && (
                            <span className="fi-badge bg-slate-50 text-slate-400 border border-slate-200 text-xs">+{tool.allowed_operations.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {tool.supported_environments.map((env) => (
                            <span key={env} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{env}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-right text-slate-600">{tool.agent_ids.length}</td>
                      <td>
                        <span className={`fi-badge ${tool.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          {tool.active ? 'active' : 'inactive'}
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
        subtitle={selected ? `${selected.category} · ${selected.risk_level} risk` : ''}
      >
        {selected && (
          <div className="p-4 space-y-4">
            <DetailsPanel
              columns={2}
              items={[
                { label: 'Tool ID', value: <span className="font-mono text-xs">{selected.id}</span> },
                { label: 'Category', value: <span className="capitalize">{selected.category}</span> },
                { label: 'Risk Level', value: <RiskBadge level={selected.risk_level} /> },
                { label: 'Timeout', value: `${selected.timeout_seconds}s` },
                { label: 'Status', value: selected.active ? 'Active' : 'Inactive' },
                { label: 'Bound Agents', value: `${selected.agent_ids.length} agent(s)` },
              ]}
            />

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-slate-700">{selected.description || 'No description provided.'}</p>
            </div>

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Allowed Operations</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.allowed_operations.map((op) => (
                  <span key={op} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{op}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Supported Environments</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.supported_environments.map((env) => (
                  <span key={env} className="fi-badge bg-blue-50 text-blue-700 border border-blue-200">{env}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> Permission Boundary
              </h3>
              <div className="space-y-1">
                {selected.permissions.map((perm) => (
                  <div key={perm} className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                    {perm}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Evidence Requirements</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.evidence_requirements.map((req) => (
                  <span key={req} className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">{req}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Input Schema</h3>
              <pre className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto">
                {JSON.stringify(selected.inputs_schema, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Output Schema</h3>
              <pre className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto">
                {JSON.stringify(selected.outputs_schema, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </SideDrawer>
    </>
  )
}
