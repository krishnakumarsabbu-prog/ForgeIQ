import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useNavigate } from 'react-router-dom'
import { Users, Shield, Plus, CheckCircle2, UserCheck, Settings, ChevronRight } from 'lucide-react'
import { useUsers, useRoles } from '../hooks/useQueries'

function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return `${Math.floor(diff/60000)}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function UsersRolesPage() {
  const navigate = useNavigate()
  const { data: users, isLoading } = useUsers?.() ?? { data: null, isLoading: false }
  const { data: roles } = useRoles?.() ?? { data: null }

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Manage platform users, role assignments, permission scopes, and enterprise SSO configuration."
        icon={<Users size={18} />}
        badge="Access Control"
        badgeVariant="violet"
        actions={
          <div className="flex items-center gap-2">
            <button className="fi-btn-secondary"><Settings size={13} /> Roles</button>
            <button className="fi-btn-primary"><Plus size={13} /> Invite User</button>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"  value={users?.length ?? 0}  sub="Members"      icon={Users}     gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Active"       value={users?.filter((u:any) => u.active).length ?? 0} sub="Last 7 days" icon={UserCheck} gradient={['#10b981','#0891b2']} />
          <StatCard label="Roles"        value={roles?.length ?? 0}  sub="Defined"      icon={Shield}    gradient={['#00adef','#0a68f4']} />
          <StatCard label="Admins"       value={users?.filter((u:any) => u.role === 'admin' || u.is_admin).length ?? 0} sub="Super admin" icon={CheckCircle2} gradient={['#f59e0b','#f97316']} />
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Users} title="User Directory" subtitle="All platform members" iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner message="Loading user directory..." />
          ) : !users?.length ? (
            <EmptyState
              message="No users found"
              description="Invite team members to collaborate on the AI Engineering Factory."
              icon={<Users size={24} className="text-slate-300" />}
              action={<button className="fi-btn-primary"><Plus size={13} /> Invite User</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>User</th><th>Email</th><th>Role</th>
                    <th>Tenant</th><th>Status</th><th>Last Active</th><th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="cursor-pointer group">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                            style={{ background: `linear-gradient(135deg, #7c3aed, #0a68f4)` }}
                          >
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs">{u.name || '—'}</div>
                            <div className="text-[10px] text-slate-400">{u.id?.slice(0, 14)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-slate-600">{u.email}</td>
                      <td>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize" style={
                          u.role === 'admin' || u.is_admin
                            ? { background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)' }
                            : { background: 'rgba(14,165,233,0.1)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }
                        }>
                          {u.role || 'member'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600">{u.tenant_id?.slice(0, 16) || '—'}</td>
                      <td>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={u.active
                            ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
                            : { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }
                          }>
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{timeAgo(u.last_login)}</td>
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
