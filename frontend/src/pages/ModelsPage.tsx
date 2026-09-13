import { useState, useMemo } from 'react'
import { useModels, useModelProviderStatus, useModelUsageStats, useRouteModel } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { FilterBar } from '../components/ui/FilterBar'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { ModelConfiguration, ModelProviderStatus, ModelUsageStats, RoutingDecision } from '../types'
import { Cpu, Plus, Lock, Zap, ArrowRight, Shield, Building2, Activity, Route, ChevronDown, ChevronUp } from 'lucide-react'

const providerColors: Record<string, string> = {
  OpenAI: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Anthropic: 'bg-orange-50 text-orange-700 border border-orange-200',
  Google: 'bg-blue-50 text-blue-700 border border-blue-200',
  Azure: 'bg-sky-50 text-sky-700 border border-sky-200',
  Enterprise: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  Local: 'bg-slate-100 text-slate-600 border border-slate-300',
}

const tierColors: Record<string, string> = {
  high_quality: 'bg-purple-50 text-purple-700 border border-purple-200',
  balanced: 'bg-blue-50 text-blue-700 border border-blue-200',
  low_cost: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  security_approved: 'bg-red-50 text-red-700 border border-red-200',
  enterprise_approved: 'bg-amber-50 text-amber-700 border border-amber-200',
  local: 'bg-slate-100 text-slate-600 border border-slate-300',
}

const providers = ['All', 'OpenAI', 'Anthropic', 'Google', 'Azure', 'Enterprise', 'Local']

export default function ModelsPage() {
  const { data, isLoading } = useModels()
  const { data: providerStatus } = useModelProviderStatus()
  const { data: usageStats } = useModelUsageStats()
  const routeMutation = useRouteModel()

  const [search, setSearch] = useState('')
  const [activeProvider, setActiveProvider] = useState('All')
  const [selected, setSelected] = useState<ModelConfiguration | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [showRouter, setShowRouter] = useState(false)
  const [routeTask, setRouteTask] = useState('')
  const [routeQuality, setRouteQuality] = useState('')
  const [routeSecurity, setRouteSecurity] = useState(false)
  const [routeResult, setRouteResult] = useState<RoutingDecision | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((m) => {
      const matchesProvider = activeProvider === 'All' || m.provider === activeProvider
      const matchesSearch = !search ||
        m.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.model?.toLowerCase().includes(search.toLowerCase()) ||
        m.capabilities?.some((cap) => cap.toLowerCase().includes(search.toLowerCase())) ||
        m.routing_tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
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

  function handleRoute() {
    routeMutation.mutate(
      { task: routeTask, quality: routeQuality || undefined, security: routeSecurity },
      { onSuccess: (data) => setRouteResult(data) },
    )
  }

  return (
    <>
      <PageHeader
        title="Models"
        description="Centralized model runtime with routing, fallback, governance, and usage tracking"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRouter(!showRouter)}
              className="fi-button-secondary flex items-center gap-1.5"
            >
              <Route className="h-4 w-4" /> Routing Simulator
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className="fi-button-secondary flex items-center gap-1.5"
            >
              <Activity className="h-4 w-4" /> Usage Stats
              {showStats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button className="fi-button-primary">
              <Plus className="h-4 w-4" /> New Model
            </button>
          </div>
        }
      />

      {/* Provider Status Bar */}
      {providerStatus && (
        <div className="px-6 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Provider Status</span>
            {providerStatus.map((ps: ModelProviderStatus) => (
              <div key={ps.provider} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${ps.configured ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-sm font-medium text-slate-700">{ps.provider}</span>
                <span className="text-xs text-slate-400">
                  {ps.active_models}/{ps.model_count} active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Stats Panel */}
      {showStats && usageStats && (
        <UsageStatsPanel stats={usageStats} />
      )}

      {/* Routing Simulator Panel */}
      {showRouter && (
        <div className="px-6 py-4 bg-white border-b border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-medium text-slate-700">Model Routing Simulator</h3>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500 uppercase">Task</label>
              <input
                value={routeTask}
                onChange={(e) => setRouteTask(e.target.value)}
                placeholder="e.g. coding, security, classification..."
                className="fi-input w-64"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500 uppercase">Quality</label>
              <select
                value={routeQuality}
                onChange={(e) => setRouteQuality(e.target.value)}
                className="fi-input w-40"
              >
                <option value="">Any</option>
                <option value="high">High</option>
                <option value="low">Low cost</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={routeSecurity}
                onChange={(e) => setRouteSecurity(e.target.checked)}
                className="rounded border-slate-300"
              />
              Security approved only
            </label>
            <button onClick={handleRoute} className="fi-button-primary" disabled={routeMutation.isPending}>
              {routeMutation.isPending ? 'Routing...' : 'Route'}
            </button>
          </div>
          {routeResult && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              {routeResult.model ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Selected:</span>
                    <span className={`fi-badge ${providerColors[routeResult.model.provider] || ''}`}>
                      {routeResult.model.provider}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{routeResult.model.display_name}</span>
                    <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200 text-xs">
                      {routeResult.model.tier.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{routeResult.reason}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {routeResult.factors_evaluated.map((f) => (
                      <span key={f} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 text-xs">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">{routeResult.reason}</p>
              )}
            </div>
          )}
        </div>
      )}

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

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search models by name, ID, capability, routing tag..." />

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
                    <th>Tier</th>
                    <th>Model ID</th>
                    <th className="text-right">Context</th>
                    <th className="text-right">Latency</th>
                    <th>Cost (per 1k tokens)</th>
                    <th>Routing Tags</th>
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
                      <td>
                        <span className={`fi-badge text-xs ${tierColors[model.tier] || 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          {model.tier?.replace(/_/g, ' ') || 'balanced'}
                        </span>
                      </td>
                      <td className="text-slate-600 font-mono text-xs">{model.model}</td>
                      <td className="text-right text-slate-600">{model.context_size.toLocaleString()}</td>
                      <td className="text-right text-slate-600">{model.latency_ms}ms</td>
                      <td className="text-slate-600 text-xs">
                        <span className="text-slate-500">in:</span> ${(model.cost_per_1k_input_cents / 100).toFixed(4)}
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-slate-500">out:</span> ${(model.cost_per_1k_output_cents / 100).toFixed(4)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(model.routing_tags || []).slice(0, 3).map((tag) => (
                            <span key={tag} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 text-xs">{tag}</span>
                          ))}
                          {(model.routing_tags || []).length > 3 && (
                            <span className="fi-badge bg-slate-50 text-slate-400 border border-slate-200 text-xs">+{model.routing_tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {model.security_approved && (
                            <span className="fi-badge bg-red-50 text-red-700 border border-red-200 text-xs" title="Security approved">
                              <Shield className="h-2.5 w-2.5 mr-0.5" /> sec
                            </span>
                          )}
                          {model.enterprise_approved && (
                            <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs" title="Enterprise approved">
                              <Building2 className="h-2.5 w-2.5 mr-0.5" /> ent
                            </span>
                          )}
                          {model.tenant_restricted && (
                            <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                              <Lock className="h-2.5 w-2.5 mr-0.5" /> restricted
                            </span>
                          )}
                          {!model.security_approved && !model.enterprise_approved && !model.tenant_restricted && (
                            <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200 text-xs">unrestricted</span>
                          )}
                        </div>
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
                { label: 'Tier', value: <span className={`fi-badge text-xs ${tierColors[selected.tier] || ''}`}>{selected.tier?.replace(/_/g, ' ') || 'balanced'}</span> },
                { label: 'Context Size', value: selected.context_size.toLocaleString() },
                { label: 'Token Limit', value: selected.token_limit.toLocaleString() },
                { label: 'Latency', value: `${selected.latency_ms}ms` },
                { label: 'Temperature', value: selected.temperature },
                { label: 'Max Concurrent', value: selected.max_concurrent },
                { label: 'Availability', value: selected.availability },
                { label: 'Security Approved', value: selected.security_approved ? 'Yes' : 'No' },
                { label: 'Enterprise Approved', value: selected.enterprise_approved ? 'Yes' : 'No' },
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

            {selected.routing_tags && selected.routing_tags.length > 0 && (
              <div>
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Routing Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selected.routing_tags.map((tag) => (
                    <span key={tag} className="fi-badge bg-blue-50 text-blue-700 border border-blue-200">
                      <Route className="h-2.5 w-2.5 mr-0.5" />{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

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

            {(selected.security_approved || selected.enterprise_approved) && (
              <div>
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Approvals</h3>
                <div className="flex items-center gap-2">
                  {selected.security_approved && (
                    <span className="fi-badge bg-red-50 text-red-700 border border-red-200">
                      <Shield className="h-3 w-3 mr-0.5" /> Security Approved
                    </span>
                  )}
                  {selected.enterprise_approved && (
                    <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">
                      <Building2 className="h-3 w-3 mr-0.5" /> Enterprise Approved
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </>
  )
}

function UsageStatsPanel({ stats }: { stats: ModelUsageStats }) {
  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-forgeiq-600" />
        <h3 className="text-sm font-medium text-slate-700">Model Usage Statistics</h3>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Invocations" value={stats.total_invocations.toLocaleString()} />
        <StatCard label="Success Rate" value={`${stats.total_invocations > 0 ? Math.round(stats.successful / stats.total_invocations * 100) : 0}%`} />
        <StatCard label="Total Tokens" value={stats.total_tokens.toLocaleString()} />
        <StatCard label="Total Cost" value={`$${(stats.total_cost_cents / 100).toFixed(4)}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">By Model</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {Object.entries(stats.by_model).map(([name, info]) => (
              <div key={name} className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded">
                <span className="font-mono text-slate-700">{name}</span>
                <div className="flex items-center gap-3 text-slate-500">
                  <span>{info.invocations} calls</span>
                  <span>{info.tokens.toLocaleString()} tok</span>
                  <span>${(info.cost_cents / 100).toFixed(4)}</span>
                  {info.failures > 0 && <span className="text-red-600">{info.failures} fail</span>}
                </div>
              </div>
            ))}
            {Object.keys(stats.by_model).length === 0 && (
              <p className="text-xs text-slate-400 px-3 py-2">No invocations recorded yet</p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">By Provider</h4>
          <div className="space-y-1.5">
            {Object.entries(stats.by_provider).map(([name, info]) => (
              <div key={name} className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded">
                <span className="font-medium text-slate-700">{name}</span>
                <div className="flex items-center gap-3 text-slate-500">
                  <span>{info.invocations} calls</span>
                  <span>{info.tokens.toLocaleString()} tok</span>
                  <span>${(info.cost_cents / 100).toFixed(4)}</span>
                </div>
              </div>
            ))}
            {Object.keys(stats.by_provider).length === 0 && (
              <p className="text-xs text-slate-400 px-3 py-2">No invocations recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {stats.fallbacks_used > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <ArrowRight className="h-3 w-3" />
          {stats.fallbacks_used} fallback invocation{stats.fallbacks_used !== 1 ? 's' : ''} used
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded">
      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  )
}
