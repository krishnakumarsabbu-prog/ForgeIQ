import { useTools } from '../hooks/useQueries'
import { PageHeader, RiskBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Tool } from '../types'
import { Plus, Wrench } from 'lucide-react'

export default function ToolsPage() {
  const { data, isLoading } = useTools()

  return (
    <>
      <PageHeader
        title="Tools"
        description="External tools and integrations available to agents"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> New Tool
          </button>
        }
      />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data || data.length === 0 ? (
            <EmptyState message="No tools found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Risk Level</th>
                    <th className="text-right">Operations</th>
                    <th>Environments</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((tool: Tool) => (
                    <tr key={tool.id}>
                      <td className="font-medium text-slate-900 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-forgeiq-600" />
                        {tool.display_name || tool.name}
                      </td>
                      <td className="text-slate-600">{tool.category}</td>
                      <td><RiskBadge level={tool.risk_level} /></td>
                      <td className="text-right text-slate-600">{tool.allowed_operations.length}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {tool.supported_environments.map((env) => (
                            <span key={env} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{env}</span>
                          ))}
                        </div>
                      </td>
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
    </>
  )
}
