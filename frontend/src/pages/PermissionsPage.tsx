import { useNavigate } from 'react-router-dom'
import { usePermissions, useRoles } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { Shield, Lock, CheckCircle2, Plus, Users, Key, ChevronRight, Globe } from 'lucide-react'

export default function PermissionsPage() {
  const navigate = useNavigate()
  const { data: permissions, isLoading } = usePermissions?.() ?? { data: null, isLoading: false }
  const { data: roles } = useRoles?.() ?? { data: null }

  return (
    <>
      <PageHeader
        title="Permissions"
        description="Fine-grained RBAC — manage role definitions, permission scopes, and resource-level access controls."
        icon={<Shield size={18} />}
        badge="Access Control"
        badgeVariant="violet"
        actions={<button className="fi-btn-primary"><Plus size={13} /> New Permission</button>}
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Permissions"  value={permissions?.length ?? 0}  sub="Defined"      icon={Lock}         gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Roles"        value={roles?.length ?? 0}         sub="Registered"   icon={Shield}       gradient={['#00adef','#0a68f4']} />
          <StatCard label="Resources"    value={new Set(permissions?.map((p:any)=>p.resource_type).filter(Boolean)).size} sub="Types" icon={Globe} gradient={['#10b981','#0891b2']} />
          <StatCard label="Admin Grants" value={permissions?.filter((p:any)=>p.action==='*'||p.action==='admin').length ?? 0} sub="Full access" icon={Key} gradient={['#f59e0b','#f97316']} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Roles */}
          <EnterpriseCard>
            <SectionHeader icon={Shield} title="Role Definitions" subtitle={`${roles?.length ?? 0} roles`} iconColor="#7c3aed" action={
              <button className="fi-btn-primary fi-btn-sm"><Plus size={11} /> New Role</button>
            } />
            {isLoading ? <LoadingSpinner /> : !roles?.length ? (
              <EmptyState message="No roles defined" description="Create roles to organize permissions into logical groups." />
            ) : (
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead><tr><th>Role Name</th><th>Permissions</th><th>Scope</th><th>Members</th></tr></thead>
                  <tbody>
                    {roles.map((r: any) => (
                      <tr key={r.id} className="cursor-pointer group">
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                              <Shield size={11} style={{ color: '#7c3aed' }} />
                            </div>
                            <span className="font-semibold text-slate-900 text-xs">{r.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-bold text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>
                            {r.permission_count ?? r.permissions?.length ?? 0}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500 capitalize">{r.scope || 'global'}</td>
                        <td className="text-xs font-semibold text-slate-700">{r.member_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EnterpriseCard>

          {/* Permissions */}
          <EnterpriseCard>
            <SectionHeader icon={Lock} title="Permission Registry" subtitle={`${permissions?.length ?? 0} permissions`} iconColor="#0284c7" action={
              <button className="fi-btn-primary fi-btn-sm"><Plus size={11} /> Add Permission</button>
            } />
            {isLoading ? <LoadingSpinner /> : !permissions?.length ? (
              <EmptyState message="No permissions defined" description="Define granular permissions to assign to roles." />
            ) : (
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead><tr><th>Resource</th><th>Action</th><th>Scope</th><th>Status</th></tr></thead>
                  <tbody>
                    {permissions.map((p: any) => (
                      <tr key={p.id} className="group">
                        <td>
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}>
                            {p.resource_type}
                          </span>
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={
                            p.action === '*' || p.action === 'admin'
                              ? { background: 'rgba(244,63,94,0.1)', color: '#e11d48', border: '1px solid rgba(244,63,94,0.2)' }
                              : { background: 'rgba(100,116,139,0.1)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }
                          }>{p.action}</span>
                        </td>
                        <td className="text-xs text-slate-500 capitalize">{p.scope || 'global'}</td>
                        <td><StatusBadge status={p.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EnterpriseCard>
        </div>
      </div>
    </>
  )
}
