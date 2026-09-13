import { Package, Tag } from 'lucide-react'
import { useArtifacts } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

const typeColors: Record<string, string> = {
  container: 'bg-blue-50 text-blue-700 border border-blue-200',
  binary: 'bg-slate-100 text-slate-700 border border-slate-300',
  library: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  bundle: 'bg-amber-50 text-amber-700 border border-amber-200',
  wheel: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

function formatSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(2)} GB`
}

export default function BuildAutomationPage() {
  const { data: artifacts, isLoading } = useArtifacts()

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Build Automation" description="Build artifacts and registry inventory" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = artifacts ?? []

  return (
    <div className="fi-card">
      <PageHeader
        title="Build Automation"
        description="Build artifacts and registry inventory"
        actions={<span className="text-xs text-slate-500">{items.length} artifacts</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No build artifacts found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Type</th>
                <th>Registry</th>
                <th>Size</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-800">{a.name}</span>
                    </div>
                  </td>
                  <td className="font-mono text-slate-700">{a.version}</td>
                  <td>
                    <span className={`fi-badge ${typeColors[a.type] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="text-slate-600">{a.registry}</td>
                  <td className="text-slate-600 whitespace-nowrap">{formatSize(a.size_bytes)}</td>
                  <td>
                    {a.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {a.tags.map((tag, i) => (
                          <span key={i} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
