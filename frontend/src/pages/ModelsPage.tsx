import { useNavigate } from 'react-router-dom'
import { useModels } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { ModelConfiguration } from '../types'
import { Cpu, Plus, Search, Filter, X, CheckCircle2, DollarSign, Zap, Brain } from 'lucide-react'
import { useState, useMemo } from 'react'

const providerStyle: Record<string, { bg: string; color: string; border: string }> = {
  openai:    { bg: 'rgba(16,163,127,0.1)',  color: '#065f46', border: 'rgba(16,163,127,0.25)' },
  anthropic: { bg: 'rgba(213,100,58,0.1)',  color: '#9a3412', border: 'rgba(213,100,58,0.25)' },
  google:    { bg: 'rgba(66,133,244,0.1)',  color: '#1d4ed8', border: 'rgba(66,133,244,0.25)' },
  mistral:   { bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
  cohere:    { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
}
const DEFAULT_PROV = { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.2)' }

export default function ModelsPage() {
  const { data: models, isLoading } = useModels()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ModelConfiguration | null>(null)

  const filtered = useMemo(() => {
    if (!models) return []
    if (!search) return models
    const q = search.toLowerCase()
    return models.filter((m: any) =>
      m.display_name?.toLowerCase().includes(q) ||
      m.provider?.toLowerCase().includes(q) ||
      (m.model_name || m.model || m.name)?.toLowerCase().includes(q)
    )
  }, [models, search])

  const providers = useMemo(() => [...new Set(models?.map(m => m.provider).filter(Boolean))], [models])

  return (
    <>
      <PageHeader
        title="AI Model Catalog"
        description="Configure and manage LLM model endpoints, context windows, and cost budgets for autonomous agents."
        icon={<Cpu size={18} />}
        badge={`${models?.length ?? 0} Models`}
        badgeVariant="violet"
        actions={<button className="fi-btn-primary"><Plus size={13} /> Register Model</button>}
      />

      <div className="p-6 space-y-4 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Models"    value={models?.length ?? 0} sub="Registered"     icon={Cpu}         gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Active"          value={models?.filter(m=>m.active).length ?? 0} sub="In use" icon={CheckCircle2} gradient={['#10b981','#0891b2']} />
          <StatCard label="Providers"       value={providers.length}    sub="Connected"       icon={Zap}         gradient={['#00adef','#0a68f4']} />
          <StatCard label="Avg Context"     value="128K"               sub="Token window"    icon={Brain}       gradient={['#f59e0b','#f97316']} />
        </div>

        <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)' }}>
          <Filter size={14} className="text-slate-400" />
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models by name, provider, capability..." className="fi-input pl-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
          </div>
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Cpu} title="Model Registry" subtitle={`${filtered.length} models available`} iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner message="Loading model catalog..." />
          ) : !filtered.length ? (
            <EmptyState message="No models found" description="Register LLM model configurations to power your AI agents." />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Model</th><th>Provider</th><th>Model Name</th>
                    <th className="text-right">Context Window</th>
                    <th className="text-right">Input $/1K</th>
                    <th className="text-right">Output $/1K</th>
                    <th>Capabilities</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((model: ModelConfiguration) => {
                    const ps = providerStyle[model.provider?.toLowerCase() ?? ''] ?? DEFAULT_PROV
                    return (
                      <tr key={model.id} onClick={() => setSelected(model)} className="cursor-pointer group">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                              <Cpu size={13} style={{ color: '#7c3aed' }} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate">{model.display_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{model.id.slice(0, 16)}…</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                            {model.provider}
                          </span>
                        </td>
                        <td><span className="font-mono text-[11px] text-slate-600">{(model as any).model_name || model.model || model.name}</span></td>
                        <td className="text-right font-mono text-xs text-slate-600">{((model as any).context_window || model.context_size || 0).toLocaleString()}</td>
                        <td className="text-right font-mono text-xs text-slate-600">${((model as any).cost_per_1k_input_tokens ?? (model.cost_per_1k_input_cents ? model.cost_per_1k_input_cents / 100 : 0)).toFixed(4)}</td>
                        <td className="text-right font-mono text-xs text-slate-600">${((model as any).cost_per_1k_output_tokens ?? (model.cost_per_1k_output_cents ? model.cost_per_1k_output_cents / 100 : 0)).toFixed(4)}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(model.capabilities || []).slice(0, 2).map((cap: string) => (
                              <span key={cap} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{cap}</span>
                            ))}
                          </div>
                        </td>
                        <td><StatusBadge status={model.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>

      <SideDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.display_name || ''} subtitle={`${selected?.provider} · ${(selected as any)?.model_name || selected?.model || selected?.name}`}>
        {selected && (
          <div className="p-5 space-y-5">
            <DetailsPanel columns={2} items={[
              { label: 'Provider',       value: <span className="capitalize text-xs font-semibold">{selected.provider}</span> },
              { label: 'Model Name',     value: <span className="font-mono text-xs">{(selected as any).model_name || selected.model || selected.name}</span> },
              { label: 'Context Window', value: `${((selected as any).context_window || selected.context_size || 0).toLocaleString()} tokens` },
              { label: 'Temperature',    value: selected.temperature?.toFixed(1) ?? '—' },
              { label: 'Input Cost',     value: `$${((selected as any).cost_per_1k_input_tokens ?? (selected.cost_per_1k_input_cents ? selected.cost_per_1k_input_cents / 100 : 0)).toFixed(4)}/1K` },
              { label: 'Output Cost',    value: `$${((selected as any).cost_per_1k_output_tokens ?? (selected.cost_per_1k_output_cents ? selected.cost_per_1k_output_cents / 100 : 0)).toFixed(4)}/1K` },
              { label: 'Status',         value: <StatusBadge status={selected.active ? 'ACTIVE' : 'INACTIVE'} /> },
              { label: 'Max Tokens',     value: ((selected as any).max_tokens || selected.token_limit)?.toLocaleString() ?? '—' },
            ]} />
            {(selected.capabilities || []).length > 0 && (
              <div>
                <h3 className="fi-section-label mb-2">Capabilities</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.capabilities || []).map((cap: string) => (
                    <span key={cap} className="px-2 py-0.5 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>{cap}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </>
  )
}
