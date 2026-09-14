import { useNavigate } from 'react-router-dom'
import { useApprovals, useApproveExecution, useRejectExecution } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Shield, Lock, ChevronRight } from 'lucide-react'

function formatTimeAgo(iso?: string): string {
  if (!iso) return 'N/A'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ApprovalsPage() {
  const navigate = useNavigate()
  const { data: approvals, isLoading } = useApprovals()
  const approveExecution = useApproveExecution()
  const rejectExecution = useRejectExecution()

  const pending = approvals?.filter(a => a.status === 'pending' || (a.status as string) === 'AWAITING_APPROVAL').length ?? 0
  const approved = approvals?.filter(a => a.status === 'approved' || (a.status as string) === 'APPROVED').length ?? 0
  const rejected = approvals?.filter(a => a.status === 'rejected' || (a.status as string) === 'REJECTED').length ?? 0

  return (
    <>
      <PageHeader
        title="Approval Gates"
        description="Review and approve autonomous execution decisions before they proceed through governance gates."
        icon={<Shield size={18} />}
        badge="Governance"
        badgeVariant="amber"
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Pending Review"   value={pending}  sub="Awaiting decision"  icon={Clock}        gradient={['#f59e0b','#f97316']} />
          <StatCard label="Approved"         value={approved} sub="Cleared to proceed"  icon={CheckCircle2} gradient={['#10b981','#0891b2']} />
          <StatCard label="Rejected"         value={rejected} sub="Blocked"             icon={XCircle}      gradient={['#f43f5e','#e11d48']} />
        </div>

        {pending > 0 && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <AlertTriangle size={16} style={{ color: '#b45309' }} className="shrink-0" />
            <span className="text-sm font-semibold" style={{ color: '#92400e' }}>
              {pending} execution{pending > 1 ? 's' : ''} awaiting your approval
            </span>
          </div>
        )}

        <EnterpriseCard>
          <SectionHeader icon={Shield} title="Approval Queue" subtitle="All execution approval requests" iconColor="#f59e0b" />
          {isLoading ? (
            <LoadingSpinner message="Loading approval queue..." />
          ) : !approvals?.length ? (
            <EmptyState
              message="No approvals pending"
              description="Governance gates will appear here when executions require manual review."
              icon={<CheckCircle2 size={24} className="text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Execution</th><th>Application</th><th>Stage</th><th>Reason</th>
                    <th>Requested</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval: any) => {
                    const isPending = approval.status === 'pending' || approval.status === 'AWAITING_APPROVAL'
                    return (
                      <tr key={approval.id} className="group">
                        <td>
                          <span
                            className="font-mono text-xs font-bold cursor-pointer"
                            style={{ color: '#0284c7' }}
                            onClick={() => navigate(`/executions/${approval.execution_id}`)}
                          >
                            {(approval.execution_id || '').slice(0, 12)}…
                          </span>
                        </td>
                        <td className="font-semibold text-slate-900 text-xs">{approval.application || '—'}</td>
                        <td>
                          <span className="px-2 py-0.5 rounded-lg font-mono text-[11px] font-semibold" style={{ background: 'rgba(14,165,233,0.08)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.15)' }}>
                            {approval.stage || '—'}
                          </span>
                        </td>
                        <td className="text-xs text-slate-600 max-w-[200px] truncate">{approval.reason || '—'}</td>
                        <td className="text-xs text-slate-400">{formatTimeAgo(approval.created_at)}</td>
                        <td><StatusBadge status={approval.status} /></td>
                        <td>
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => approveExecution.mutate(approval.execution_id)}
                                className="fi-btn-success fi-btn-sm"
                                disabled={approveExecution.isPending}
                              >
                                <CheckCircle2 size={11} /> Approve
                              </button>
                              <button
                                onClick={() => rejectExecution.mutate({ id: approval.execution_id, reason: 'Rejected by reviewer' })}
                                className="fi-btn-danger fi-btn-sm"
                                disabled={rejectExecution.isPending}
                              >
                                <XCircle size={11} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>
    </>
  )
}
