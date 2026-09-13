import { useModels } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { ModelConfiguration } from '../types'
import { Cpu } from 'lucide-react'

const providerColors: Record<string, string> = {
  openai: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  anthropic: 'bg-orange-50 text-orange-700 border border-orange-200',
  google: 'bg-blue-50 text-blue-700 border border-blue-200',
  azure: 'bg-sky-50 text-sky-700 border border-sky-200',
  aws: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function ModelsPage() {
  const { data, isLoading } = useModels()

  return (
    <>
      <PageHeader title="Models" description="Model configurations and provider settings" />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data || data.length === 0 ? (
            <EmptyState message="No models configured" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Provider</th>
                    <th>Model</th>
                    <th className="text-right">Context Size</th>
                    <th className="text-right">Token Limit</th>
                    <th>Cost (per 1k)</th>
                    <th className="text-right">Temperature</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((model: ModelConfiguration) => (
                    <tr key={model.id}>
                      <td className="font-medium text-slate-900 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-forgeiq-600" />
                        {model.display_name || model.name}
                      </td>
                      <td>
                        <span className={`fi-badge ${providerColors[model.provider.toLowerCase()] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {model.provider}
                        </span>
                      </td>
                      <td className="text-slate-600 font-mono text-xs">{model.model}</td>
                      <td className="text-right text-slate-600">{model.context_size.toLocaleString()}</td>
                      <td className="text-right text-slate-600">{model.token_limit.toLocaleString()}</td>
                      <td className="text-slate-600 text-xs">
                        <span className="text-slate-500">in:</span> ${(model.cost_per_1k_input_cents / 100).toFixed(4)}
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-slate-500">out:</span> ${(model.cost_per_1k_output_cents / 100).toFixed(4)}
                      </td>
                      <td className="text-right text-slate-600">{model.temperature}</td>
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
    </>
  )
}
