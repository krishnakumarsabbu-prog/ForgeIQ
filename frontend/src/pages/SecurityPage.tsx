import { useEngineeringStates, useEvidence } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { MetricStrip } from '../components/ui/MetricStrip'
import { Shield, ShieldAlert, ShieldCheck, Bug } from 'lucide-react'

export default function SecurityPage() {
  const { data: engStates, isLoading: engLoading } = useEngineeringStates()
  const { data: evidence, isLoading: evLoading } = useEvidence()

  if (engLoading || evLoading) return (<><PageHeader title="Security" description="Security findings, vulnerability tracking, and remediation status" /><LoadingSpinner /></>)

  const states = engStates ?? []
  const securityEvidence = (evidence ?? []).filter(e => e.evidence_type === 'security' || e.evidence_type === 'sast' || e.evidence_type === 'dependency_scan')

  const totalFindings = states.reduce((sum, s) => sum + s.security_findings, 0)
  const totalVulns = states.reduce((sum, s) => sum + s.open_vulnerabilities, 0)
  const cleanApps = states.filter(s => s.open_vulnerabilities === 0).length

  return (
    <>
      <PageHeader title="Security" description="Security findings, vulnerability tracking, and remediation status" />
      <div className="p-6 space-y-6">
        <MetricStrip
          metrics={[
            { label: 'Total Findings', value: totalFindings, icon: <ShieldAlert size={14} /> },
            { label: 'Open Vulnerabilities', value: totalVulns, icon: <Bug size={14} /> },
            { label: 'Clean Applications', value: cleanApps, icon: <ShieldCheck size={14} /> },
            { label: 'Security Evidence', value: securityEvidence.length, icon: <Shield size={14} /> },
          ]}
        />

        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Security Posture by Application</h3>
          </div>
          {states.length === 0 ? (
            <EmptyState message="No security data available" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Branch</th>
                    <th className="text-right">Findings</th>
                    <th className="text-right">Vulnerabilities</th>
                    <th>Security Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map(s => {
                    const status = s.open_vulnerabilities === 0 ? 'COMPLETED' : s.open_vulnerabilities > 5 ? 'FAILED' : 'AWAITING_APPROVAL'
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="font-medium text-slate-900 font-mono text-sm">{s.repository}</td>
                        <td className="text-slate-600 font-mono text-xs">{s.branch}</td>
                        <td className="text-right text-slate-600">{s.security_findings}</td>
                        <td className="text-right">
                          {s.open_vulnerabilities > 0 ? (
                            <span className="text-red-600 font-medium">{s.open_vulnerabilities}</span>
                          ) : (
                            <span className="text-emerald-600">0</span>
                          )}
                        </td>
                        <td><StatusBadge status={status} /></td>
                        <td className="text-xs text-slate-500">{new Date(s.last_updated).toLocaleDateString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Security Evidence</h3>
          </div>
          {securityEvidence.length === 0 ? (
            <EmptyState message="No security evidence recorded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Execution</th>
                    <th>Agent</th>
                    <th>Model</th>
                    <th>Summary</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {securityEvidence.slice(0, 50).map(ev => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td><span className="fi-badge bg-red-50 text-red-700 border border-red-200">{ev.evidence_type}</span></td>
                      <td className="font-mono text-xs text-slate-500">{ev.execution_id.slice(0, 8)}</td>
                      <td className="text-slate-600">{ev.agent_id?.slice(0, 8) || '—'}</td>
                      <td className="text-slate-600 font-mono text-xs">{ev.model_used || '—'}</td>
                      <td className="text-slate-600 max-w-md truncate">{ev.summary}</td>
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
