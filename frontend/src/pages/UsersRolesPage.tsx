import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { useTenantUsers } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

const roleColors: Record<string, string> = {
  admin: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  owner: 'bg-forgeiq-100 text-forgeiq-800 border border-forgeiq-300',
  developer: 'bg-blue-50 text-blue-700 border border-blue-200',
  viewer: 'bg-slate-100 text-slate-700 border border-slate-300',
  guest: 'bg-slate-50 text-slate-600 border border-slate-200',
}

const TENANT_ID = 'tenant_forgeiq'

export default function UsersRolesPage() {
  const navigate = useNavigate()
  const { data: users, isLoading } = useTenantUsers(TENANT_ID)

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Users & Roles" description={`User roster for ${TENANT_ID}`} />
        <LoadingSpinner />
      </div>
    )
  }

  const items = users ?? []

  return (
    <div className="fi-card">
      <PageHeader
        title="Users & Roles"
        description={`User roster for ${TENANT_ID}`}
        actions={<span className="text-xs text-slate-500">{items.length} users</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No users found for this tenant" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-800">{u.display_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {u.email}
                    </span>
                  </td>
                  <td>
                    <span className={`fi-badge ${roleColors[u.role] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      <Shield className="h-3 w-3" />
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.active ? (
                      <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> active
                      </span>
                    ) : (
                      <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">
                        <XCircle className="h-3 w-3" /> inactive
                      </span>
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
