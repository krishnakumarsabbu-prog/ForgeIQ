import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Users, Globe, Shield, CheckCircle2, ChevronRight, Settings } from 'lucide-react'
import { useTenants } from '../hooks/useQueries'

function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return `${Math.floor(diff/3600000)}h ago`
  return `${days}d ago`
}

export default function TenantsPage() {
  const navigate = useNavigate()
  const { data: tenants, isLoading } = useTenants?.() ?? { data: null, isLoading: false }

  const active = tenants?.filter((t: any) => t.active || t.status === 'active').length ?? 0

  return (
    <>
      <PageHeader
        title="Tenant Management"
        description="Multi-tenant enterprise configuration — isolated workspaces, resource quotas, and SSO settings."
        icon={<Building2 size={18} />}
        badge="Enterprise"
        badgeVariant="violet"
        actions={<button className="fi-btn-primary"><Plus size={13} /> New Tenant</button>}
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tenants" value={tenants?.length ?? 0} sub="Organizations"  icon={Building2}    gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Active"        value={active}                sub="Running"        icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Users"         value={tenants?.reduce((s:number,t:any) => s + (t.user_count ?? 0), 0) ?? 0} sub="Total members" icon={Users} gradient={['#00adef','#0a68f4']} />
          <StatCard label="SSO Enabled"   value={tenants?.filter((t:any) => t.sso_enabled).length ?? 0} sub="Enterprise SSO" icon={Shield} gradient={['#f59e0b','#f97316']} />
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Building2} title="Tenant Registry" subtitle="All enterprise tenants" iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner message="Loading tenant registry..." />
          ) : !tenants?.length ? (
            <EmptyState
              message="No tenants configured"
              description="Create your first tenant workspace to enable multi-tenant isolation."
              icon={<Building2 size={24} className="text-slate-300" />}
              action={<button className="fi-btn-primary"><Plus size={13} /> New Tenant</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Tenant</th><th>Domain</th><th>Plan</th><th>Users</th>
                    <th>SSO</th><th>Status</th><th>Created</th><th />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t: any) => (
                    <tr key={t.id} className="cursor-pointer group">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                            {(t.name || 'T').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs">{t.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{t.id?.slice(0, 14)}…</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Globe size={11} className="text-slate-400" /> {t.domain || '—'}
                        </div>
                      </td>
                      <td>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: 'rgba(14,165,233,0.1)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }}>
                          {t.plan || 'enterprise'}
                        </span>
                      </td>
                      <td className="text-xs font-semibold text-slate-700">{t.user_count ?? 0}</td>
                      <td>
                        {t.sso_enabled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>✓ SSO</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={t.active || t.status === 'active'
                            ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
                            : { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }
                          }>
                          {t.active || t.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{timeAgo(t.created_at)}</td>
                      <td><ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-500 transition-colors" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>
    </>
  )
}
