import { usePolicies, useExecutions, useEvidence } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { MetricStrip } from '../components/ui/MetricStrip'
import { FileCheck, Shield, Gavel, ScrollText } from 'lucide-react'

export default function GovernancePage() {
  const { data: policies, isLoading: policyLoading } = usePolicies()
  const { data: executions, isLoading: execLoading } = useExecutions()
  const { data: evidence, isLoading: evLoading } = useEvidence()

  if (policyLoading || execLoading || evLoading) return (<><PageHeader title="Governance" description="Policy enforcement, approval gates, audit trails, and compliance status" /><LoadingSpinner /></>)

  const policyList = policies ?? []
  const execs = executions ?? []
  const evList = evidence ?? []

  const activePolicies = policyList.filter(p => p.active).length
  const hardPolicies = policyList.filter(p => p.enforcement === 'hard' && p.active).length
  const approvalExecs = execs.filter(e => e.status === 'AWAITING_APPROVAL').length
  const governedEvidence = evList.filter(e => e.policies_applied && e.policies_applied.length > 0).length

  return (
    <>
      <PageHeader title="Governance" description="Policy enforcement, approval gates, audit trails, and compliance status" />
      <div className="p-6 space-y-6">
        <MetricStrip
          metrics={[
            { label: 'Active Policies', value: activePolicies, icon: <Shield size={14} /> },
            { label: 'Hard Enforcement', value: hardPolicies, icon: <Gavel size={14} /> },
            { label: 'Pending Approvals', value: approvalExecs, icon: <FileCheck size={14} /> },
            { label: 'Governed Evidence', value: governedEvidence, icon: <ScrollText size={14} /> },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Policy Enforcement Matrix</h3>
            </div>
            {policyList.length === 0 ? (
              <EmptyState message="No policies defined" />
            ) : (
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th>Policy</th>
                      <th>Type</th>
                      <th>Enforcement</th>
                      <th>Scope</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyList.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="font-medium text-slate-900">{p.display_name || p.name}</td>
                        <td><span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{p.policy_type}</span></td>
                        <td>
                          <span className={`fi-badge ${p.enforcement === 'hard' ? 'bg-red-50 text-red-700 border border-red-200' : p.enforcement === 'soft' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                            {p.enforcement}
                          </span>
                        </td>
                        <td className="text-slate-600">{p.scope}</td>
                        <td>{p.active ? <StatusBadge status="active" /> : <StatusBadge status="draft" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Approval Gates</h3>
            </div>
            {execs.filter(e => e.status === 'AWAITING_APPROVAL').length === 0 ? (
              <EmptyState message="No pending approval gates" />
            ) : (
              <div className="divide-y divide-slate-100">
                {execs.filter(e => e.status === 'AWAITING_APPROVAL').slice(0, 20).map(e => (
                  <div key={e.id} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Execution {e.id.slice(0, 12)}</p>
                        <p className="text-xs text-slate-500">{e.trigger_reason}</p>
                      </div>
                      <StatusBadge status="AWAITING_APPROVAL" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Governed Evidence Trail</h3>
          </div>
          {governedEvidence === 0 ? (
            <EmptyState message="No governed evidence recorded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Evidence</th>
                    <th>Type</th>
                    <th>Execution</th>
                    <th>Policies Applied</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {evList.filter(e => e.policies_applied && e.policies_applied.length > 0).slice(0, 50).map(ev => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs text-slate-600">{ev.id.slice(0, 12)}</td>
                      <td><span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{ev.evidence_type}</span></td>
                      <td className="font-mono text-xs text-slate-500">{ev.execution_id.slice(0, 8)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {ev.policies_applied.map(p => (
                            <span key={p} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{p}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-xs text-slate-500">{new Date(ev.timestamp).toLocaleString()}</td>
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
