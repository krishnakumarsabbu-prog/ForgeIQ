import { useState } from 'react'
import { Plus, X, Shield, Gavel, Target } from 'lucide-react'
import { usePolicies, useCreatePolicy } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'

const typeColors: Record<string, string> = {
  security: 'bg-red-50 text-red-700 border border-red-200',
  quality: 'bg-blue-50 text-blue-700 border border-blue-200',
  governance: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  compliance: 'bg-amber-50 text-amber-700 border border-amber-200',
  operational: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

const scopeColors: Record<string, string> = {
  global: 'bg-slate-100 text-slate-700 border border-slate-300',
  tenant: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  application: 'bg-blue-50 text-blue-700 border border-blue-200',
  environment: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

const enforcementColors: Record<string, string> = {
  hard: 'bg-red-50 text-red-700 border border-red-200',
  soft: 'bg-amber-50 text-amber-700 border border-amber-200',
  advisory: 'bg-slate-50 text-slate-600 border border-slate-200',
}

export default function PoliciesPage() {
  const { data: policies, isLoading } = usePolicies()
  const createPolicy = useCreatePolicy()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    display_name: '',
    description: '',
    policy_type: 'security',
    scope: 'global',
    enforcement: 'hard',
    priority: 100,
    target_id: '',
  })

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Policies" description="Governance rules enforced across the platform" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = policies ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = {
      ...form,
      priority: Number(form.priority),
      target_id: form.target_id || undefined,
      active: true,
      rules: [],
    }
    createPolicy.mutate(body, { onSuccess: () => { setShowForm(false); setForm({ ...form, name: '', display_name: '', description: '', target_id: '' }) } })
  }

  return (
    <div className="fi-card">
      <PageHeader
        title="Policies"
        description="Governance rules enforced across the platform"
        actions={
          <button onClick={() => setShowForm(true)} className="fi-btn-primary">
            <Plus className="h-4 w-4" />
            Create Policy
          </button>
        }
      />
      {items.length === 0 ? (
        <EmptyState message="No policies defined" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Scope</th>
                <th>Enforcement</th>
                <th>Priority</th>
                <th>Active</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td>
                    <div className="font-medium text-slate-800">{p.display_name || p.name}</div>
                    {p.description && <div className="text-xs text-slate-500 truncate max-w-xs">{p.description}</div>}
                  </td>
                  <td>
                    <span className={`fi-badge ${typeColors[p.policy_type] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      {p.policy_type}
                    </span>
                  </td>
                  <td>
                    <span className={`fi-badge ${scopeColors[p.scope] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      {p.scope}
                    </span>
                  </td>
                  <td>
                    <span className={`fi-badge ${enforcementColors[p.enforcement] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                      {p.enforcement}
                    </span>
                  </td>
                  <td className="text-slate-700 font-mono">{p.priority}</td>
                  <td>
                    {p.active ? (
                      <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">active</span>
                    ) : (
                      <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">inactive</span>
                    )}
                  </td>
                  <td className="font-mono text-xs text-slate-600">{p.target_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-forgeiq-600" />
                Create Policy
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Name</label>
                  <input
                    className="fi-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="policy_name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Display Name</label>
                  <input
                    className="fi-input"
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    placeholder="Policy Display Name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea
                  className="fi-input min-h-[60px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Policy description..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1"><Gavel className="h-3 w-3" /> Type</label>
                  <select
                    className="fi-input"
                    value={form.policy_type}
                    onChange={(e) => setForm({ ...form, policy_type: e.target.value })}
                  >
                    <option value="security">security</option>
                    <option value="quality">quality</option>
                    <option value="governance">governance</option>
                    <option value="compliance">compliance</option>
                    <option value="operational">operational</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Scope</label>
                  <select
                    className="fi-input"
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  >
                    <option value="global">global</option>
                    <option value="tenant">tenant</option>
                    <option value="application">application</option>
                    <option value="environment">environment</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Enforcement</label>
                  <select
                    className="fi-input"
                    value={form.enforcement}
                    onChange={(e) => setForm({ ...form, enforcement: e.target.value })}
                  >
                    <option value="hard">hard</option>
                    <option value="soft">soft</option>
                    <option value="advisory">advisory</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Priority</label>
                  <input
                    type="number"
                    className="fi-input"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1"><Target className="h-3 w-3" /> Target ID</label>
                  <input
                    className="fi-input"
                    value={form.target_id}
                    onChange={(e) => setForm({ ...form, target_id: e.target.value })}
                    placeholder="optional"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="fi-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createPolicy.isPending} className="fi-btn-primary disabled:opacity-50">
                  {createPolicy.isPending ? 'Creating...' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
