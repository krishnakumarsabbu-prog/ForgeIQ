import { useAgents, useTools, usePolicies } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Lock, Shield, Wrench, Bot } from 'lucide-react'

export default function PermissionsPage() {
  const { data: agents, isLoading: agentLoading } = useAgents()
  const { data: tools, isLoading: toolLoading } = useTools()
  const { data: policies, isLoading: policyLoading } = usePolicies()

  if (agentLoading || toolLoading || policyLoading) return (<><PageHeader title="Permissions" description="Tool permissions, agent access controls, and policy enforcement rules" /><LoadingSpinner /></>)

  const agentList = agents ?? []
  const toolList = tools ?? []
  const policyList = (policies ?? []).filter(p => p.policy_type === 'security' || p.policy_type === 'governance')

  return (
    <>
      <PageHeader title="Permissions" description="Tool permissions, agent access controls, and policy enforcement rules" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Wrench size={14} className="text-forgeiq-600" /> Tool Permissions
              </h3>
            </div>
            {toolList.length === 0 ? (
              <EmptyState message="No tools configured" />
            ) : (
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th>Tool</th>
                      <th>Risk</th>
                      <th>Permissions</th>
                      <th className="text-right">Operations</th>
                      <th>Environments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolList.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="font-medium text-slate-900">{t.display_name || t.name}</td>
                        <td><StatusBadge status={t.risk_level} /></td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {t.permissions.slice(0, 3).map(p => (
                              <span key={p} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{p}</span>
                            ))}
                            {t.permissions.length > 3 && <span className="text-xs text-slate-400">+{t.permissions.length - 3}</span>}
                          </div>
                        </td>
                        <td className="text-right text-slate-600">{t.allowed_operations.length}</td>
                        <td className="text-xs text-slate-500">{t.supported_environments.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Bot size={14} className="text-forgeiq-600" /> Agent Permissions
              </h3>
            </div>
            {agentList.length === 0 ? (
              <EmptyState message="No agents configured" />
            ) : (
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Category</th>
                      <th>Permissions</th>
                      <th>Security Restrictions</th>
                      <th className="text-right">Max Turns</th>
                      <th className="text-right">Timeout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentList.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="font-medium text-slate-900">{a.display_name || a.name}</td>
                        <td className="text-slate-600">{a.category}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {a.permissions.slice(0, 2).map(p => (
                              <span key={p} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{p}</span>
                            ))}
                            {a.permissions.length > 2 && <span className="text-xs text-slate-400">+{a.permissions.length - 2}</span>}
                          </div>
                        </td>
                        <td>
                          {a.security_restrictions.length > 0 ? (
                            <span className="text-xs text-red-600">{a.security_restrictions.length} restrictions</span>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="text-right text-slate-600">{a.max_turns}</td>
                        <td className="text-right text-slate-600">{a.timeout_seconds}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Shield size={14} className="text-forgeiq-600" /> Governance Policies
            </h3>
          </div>
          {policyList.length === 0 ? (
            <EmptyState message="No governance policies defined" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Type</th>
                    <th>Scope</th>
                    <th>Enforcement</th>
                    <th className="text-right">Priority</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {policyList.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td>
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          <Lock size={12} className="text-slate-400" />
                          {p.display_name || p.name}
                        </div>
                        {p.description && <div className="text-xs text-slate-500 truncate max-w-xs">{p.description}</div>}
                      </td>
                      <td><span className="fi-badge bg-red-50 text-red-700 border border-red-200">{p.policy_type}</span></td>
                      <td className="text-slate-600">{p.scope}</td>
                      <td><StatusBadge status={p.enforcement === 'hard' ? 'CRITICAL' : p.enforcement === 'soft' ? 'MEDIUM' : 'LOW'} showIcon={false} /></td>
                      <td className="text-right font-mono text-slate-700">{p.priority}</td>
                      <td>{p.active ? <StatusBadge status="active" /> : <StatusBadge status="draft" />}</td>
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
