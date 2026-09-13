import { useState, useMemo } from 'react'
import { useModels } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { FilterBar } from '../components/ui/FilterBar'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { ModelConfiguration } from '../types'
import { Cpu, Plus, Lock, Zap, ArrowRight } from 'lucide-react'

const providerColors: Record<string, string> = {
  OpenAI: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Anthropic: 'bg-orange-50 text-orange-700 border border-orange-200',
  Google: 'bg-blue-50 text-blue-700 border border-blue-200',
  Azure: 'bg-sky-50 text-sky-700 border border-sky-200',
  Enterprise: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  Local: 'bg-slate-100 text-slate-600 border border-slate-300',
}

const providers = ['All', 'OpenAI', 'Anthropic', 'Google', 'Azure', 'Enterprise', 'Local']

export default function ModelsPage() {
  const { data, isLoading } = useModels()
  const [search, setSearch] = useState('')
  const [activeProvider, setActiveProvider] = useState('All')
  const [selected, setSelected] = useState<ModelConfiguration | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((m) => {
      const matchesProvider = activeProvider === 'All' || m.provider === activeProvider
      const matchesSearch = !search ||
        m.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.model?.toLowerCase().includes(search.toLowerCase()) ||
        m.capabilities?.some((cap) => cap.toLowerCase().includes(search.toLowerCase()))
      return matchesProvider && matchesSearch
    })
  }, [data, search, activeProvider])

  const providerCounts = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = { All: data.length }
    for (const m of data) {
      counts[m.provider] = (counts[m.provider] || 0) + 1
    }
    return counts
  }, [data])

  return (
    <>
      <PageHeader
        title="Models"
        description="Model configurations governed by tenant policy with routing and fallback"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> New Model
          </button>
        }
      />

      <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white">
        {providers.map((prov) => (
          <button
            key={prov}
            onClick={() => setActiveProvider(prov)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeProvider === prov
                ? 'border-forgeiq-600 text-forgeiq-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {prov}
            <span className="ml-1.5 text-xs text-slate-400">{providerCounts[prov] ?? 0}</span>
          </button>
        ))}
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search models by name, ID, capability..." />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState message="No models found matching your filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Provider</th>
                    <th>Model ID</th>
                    <th className="text-right">Context</th>
                    <th className="text-right">Token Limit</th>
                    <th className="text-right">Latency</th>
                    <th>Cost (per 1k tokens)</th>
                    <th>Capabilities</th>
                    <th>Governance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((model: ModelConfiguration) => (
                    <tr
                      key={model.id}
                      onClick={() => setSelected(model)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-forgeiq-600 shrink-0" />
                          {model.display_name || model.name}
                        </div>
                      </td>
                      <td>
                        <span className={`fi-badge ${providerColors[model.provider] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {model.provider}
                        </span>
                      </td>
                      <td className="text-slate-600 font-mono text-xs">{model.model}</td>
                      <td className="text-right text-slate-600">{model.context_size.toLocaleString()}</td>
                      <td className="text-right text-slate-600">{model.token_limit.toLocaleString()}</td>
                      <td className="text-right text-slate-600">{model.latency_ms}ms</td>
                      <td className="text-slate-600 text-xs">
                        <span className="text-slate-500">in:</span> ${(model.cost_per_1k_input_cents / 100).toFixed(4)}
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-slate-500">out:</span> ${(model.cost_per_1k_output_cents / 100).toFixed(4)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {model.capabilities.slice(0, 2).map((cap) => (
                            <span key={cap} className="fi-badge bg-slate-50 text-slate-500 border border-slate-200 text-xs">{cap}</span>
                          ))}
                          {model.capabilities.length > 2 && (
                            <span className="fi-badge bg-slate-50 text-slate-400 border border-slate-200 text-xs">+{model.capabilities.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {model.tenant_restricted ? (
                          <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">
                            <Lock className="h-2.5 w-2.5 mr-0.5" /> restricted
                          </span>
                        ) : (
                          <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">unrestricted</span>
                        )}
                      </td>
                      <td>
                        <span className={`fi-badge ${model.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          {model.active ? 'active' : 'inactive'}
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
        subtitle={selected ? `${selected.provider} · ${selected.model}` : ''}
      >
        {selected && (
          <div className="p-4 space-y-4">
            <DetailsPanel
              columns={2}
              items={[
                { label: 'Model ID', value: <span className="font-mono text-xs">{selected.id}</span> },
                { label: 'Provider', value: <span className={`fi-badge ${providerColors[selected.provider] || ''}`}>{selected.provider}</span> },
                { label: 'Model String', value: <span className="font-mono text-xs">{selected.model}</span> },
                { label: 'Context Size', value: selected.context_size.toLocaleString() },
                { label: 'Token Limit', value: selected.token_limit.toLocaleString() },
                { label: 'Latency', value: `${selected.latency_ms}ms` },
                { label: 'Temperature', value: selected.temperature },
                { label: 'Max Concurrent', value: selected.max_concurrent },
                { label: 'Availability', value: selected.availability },
                { label: 'Status', value: selected.active ? 'Active' : 'Inactive' },
              ]}
            />

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Cost (per 1k tokens)</h3>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Input:</span>
                  <span className="font-medium text-slate-900">${(selected.cost_per_1k_input_cents / 100).toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Output:</span>
                  <span className="font-medium text-slate-900">${(selected.cost_per_1k_output_cents / 100).toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.capabilities.map((cap) => (
                  <span key={cap} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                    <Zap className="h-2.5 w-2.5 mr-0.5" />{cap}
                  </span>
                ))}
              </div>
            </div>

            {selected.fallback_model_id && (
              <div>
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Fallback Model</h3>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono text-xs">{selected.fallback_model_id}</span>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Tenant Governance
              </h3>
              {selected.tenant_restricted ? (
                <div className="space-y-1.5">
                  <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">tenant restricted</span>
                  {selected.tenant_restrictions.map((r) => (
                    <div key={r} className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                      {r}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-600">No tenant restrictions applied. Available to all tenants.</span>
              )}
            </div>

            {Object.keys(selected.routing).length > 0 && (
              <div>
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Routing Configuration</h3>
                <pre className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto">
                  {JSON.stringify(selected.routing, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </>
  )
}
