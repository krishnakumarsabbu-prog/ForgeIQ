import { Building2, CheckCircle2, XCircle, Settings, Users } from 'lucide-react'
import { useTenants } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

const planColors: Record<string, string> = {
  enterprise: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  pro: 'bg-blue-50 text-blue-700 border border-blue-200',
  starter: 'bg-slate-100 text-slate-700 border border-slate-300',
  free: 'bg-slate-50 text-slate-600 border border-slate-200',
}

export default function TenantsPage() {
  const { data: tenants, isLoading } = useTenants()

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Tenants" description="Multi-tenant organizations on the platform" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = tenants ?? []

  return (
    <div className="fi-card">
      <PageHeader
        title="Tenants"
        description="Multi-tenant organizations on the platform"
        actions={<span className="text-xs text-slate-500">{items.length} tenants</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No tenants found" />
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((t) => (
            <div key={t.id} className="fi-card p-4 space-y-3 hover:border-forgeiq-200 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-forgeiq-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.display_name || t.name}</div>
                    <div className="font-mono text-xs text-slate-500">{t.id}</div>
                  </div>
                </div>
                {t.active ? (
                  <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> active
                  </span>
                ) : (
                  <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">
                    <XCircle className="h-3 w-3" /> inactive
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`fi-badge ${planColors[t.plan] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                  {t.plan}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </div>
                <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto max-h-32 text-slate-700">
{JSON.stringify(t.settings, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
