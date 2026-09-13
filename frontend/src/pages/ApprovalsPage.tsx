import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, AlertTriangle, ArrowUpCircle, FileCheck, XCircle, Eye } from 'lucide-react'
import { useApprovals, useDecideApproval, useEscalateApproval, useApprovalTypes, useEscalationTargets } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatusBadge, RiskBadge } from '../components/ui/StatusBadge'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Approval } from '../types'

const typeIcons: Record<string, typeof ShieldCheck> = {
  code_change: FileCheck,
  security_exception: ShieldCheck,
  production_deployment: AlertTriangle,
  high_risk_change: AlertTriangle,
  release: FileCheck,
  policy_override: ShieldCheck,
  failure_escalation: ArrowUpCircle,
  human_task: Eye,
}

const typeColors: Record<string, string> = {
  code_change: 'bg-blue-50 text-blue-700 border border-blue-200',
  security_exception: 'bg-red-50 text-red-700 border border-red-200',
  production_deployment: 'bg-amber-50 text-amber-700 border border-amber-200',
  high_risk_change: 'bg-amber-50 text-amber-700 border border-amber-200',
  release: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  policy_override: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  failure_escalation: 'bg-orange-50 text-orange-700 border border-orange-200',
  human_task: 'bg-slate-50 text-slate-700 border border-slate-200',
}

export default function ApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Approval | null>(null)
  const [decidedBy, setDecidedBy] = useState('')
  const [reason, setReason] = useState('')
  const [escalateTo, setEscalateTo] = useState('')

  const params: Record<string, string> = {}
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.approval_type = typeFilter
  if (riskFilter) params.risk_level = riskFilter

  const { data: approvals, isLoading } = useApprovals(params)
  const { data: approvalTypes } = useApprovalTypes()
  const { data: escalationTargets } = useEscalationTargets()
  const decideMutation = useDecideApproval()
  const escalateMutation = useEscalateApproval()

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Approvals" description="Human-in-the-loop approval management" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = (approvals ?? []).filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.requested_action.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.execution_id.toLowerCase().includes(q)
  })

  const pendingCount = items.filter(a => a.status === 'pending').length
  const escalatedCount = items.filter(a => a.status === 'escalated').length
  const decidedCount = items.filter(a => a.status !== 'pending').length

  const handleDecide = (decision: string) => {
    if (!selected || !decidedBy) return
    if (decision === 'escalated') {
      escalateMutation.mutate(
        { id: selected.id, body: { decided_by: decidedBy, reason, escalate_to: escalateTo || undefined } },
        { onSuccess: () => { setSelected(null); setDecidedBy(''); setReason(''); setEscalateTo('') } },
      )
    } else {
      decideMutation.mutate(
        { id: selected.id, body: { decided_by: decidedBy, decision, reason } },
        { onSuccess: () => { setSelected(null); setDecidedBy(''); setReason('') } },
      )
    }
  }

  return (
    <div className="fi-card">
      <PageHeader
        title="Approvals"
        description="Human-in-the-loop approval management for executions, deployments, and policy overrides"
        breadcrumbs={[{ label: 'Governance' }, { label: 'Approvals' }]}
      />

      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-slate-200 bg-white">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search approvals..."
          className="fi-input flex-1 max-w-xs py-1.5 text-sm"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="fi-input py-1.5 text-sm w-40">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="changes_requested">Changes Requested</option>
          <option value="escalated">Escalated</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="fi-input py-1.5 text-sm w-44">
          <option value="">All Types</option>
          {(approvalTypes ?? []).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="fi-input py-1.5 text-sm w-36">
          <option value="">All Risk</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <div className="flex items-center gap-3 ml-auto text-xs">
          <span className="flex items-center gap-1 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400" />{pendingCount} pending</span>
          <span className="flex items-center gap-1 text-orange-600"><span className="w-2 h-2 rounded-full bg-orange-400" />{escalatedCount} escalated</span>
          <span className="flex items-center gap-1 text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-400" />{decidedCount} decided</span>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No approvals found" icon={<ShieldCheck size={32} />} />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Execution</th>
                <th>Requested Action</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Requested By</th>
                <th>Requested At</th>
                <th>Decided By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const TypeIcon = typeIcons[a.approval_type] ?? AlertTriangle
                return (
                  <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(a)}>
                    <td>
                      <span className={`fi-badge ${typeColors[a.approval_type] || typeColors.high_risk_change}`}>
                        <TypeIcon size={11} />
                        {a.approval_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <Link to={`/executions/${a.execution_id}`} onClick={e => e.stopPropagation()} className="text-forgeiq-600 hover:underline font-mono text-xs">
                        {a.execution_id.slice(0, 12)}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate text-sm text-slate-700">{a.requested_action || a.reason || '—'}</td>
                    <td><RiskBadge level={a.risk_level} /></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-xs text-slate-600">{a.requested_by}</td>
                    <td className="text-xs text-slate-500">{new Date(a.requested_at).toLocaleString()}</td>
                    <td className="text-xs text-slate-600">{a.decided_by || '—'}</td>
                    <td>
                      {a.status === 'pending' && (
                        <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">Action needed</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <SideDrawer
        open={!!selected}
        onClose={() => { setSelected(null); setDecidedBy(''); setReason(''); setEscalateTo('') }}
        title="Approval Detail"
        subtitle={selected?.id}
        width="520px"
        footer={
          selected?.status === 'pending' ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={decidedBy}
                onChange={e => setDecidedBy(e.target.value)}
                placeholder="Your name"
                className="fi-input flex-1 py-1.5 text-sm"
              />
              <button
                disabled={!decidedBy || decideMutation.isPending}
                onClick={() => handleDecide('approved')}
                className="fi-btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                Approve
              </button>
              <button
                disabled={!decidedBy || decideMutation.isPending}
                onClick={() => handleDecide('rejected')}
                className="fi-btn-secondary bg-red-50 text-red-700 border-red-200 hover:bg-red-100 text-xs"
              >
                Reject
              </button>
              <button
                disabled={!decidedBy || decideMutation.isPending}
                onClick={() => handleDecide('changes_requested')}
                className="fi-btn-secondary text-xs"
              >
                Request Changes
              </button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className={`fi-badge ${typeColors[selected.approval_type] || typeColors.high_risk_change}`}>
                {selected.approval_type.replace(/_/g, ' ')}
              </span>
              <StatusBadge status={selected.status} />
              <RiskBadge level={selected.risk_level} />
            </div>

            <DetailsPanel
              items={[
                { label: 'Execution', value: <Link to={`/executions/${selected.execution_id}`} className="text-forgeiq-600 hover:underline font-mono text-xs">{selected.execution_id}</Link> },
                { label: 'Requested By', value: selected.requested_by },
                { label: 'Requested At', value: new Date(selected.requested_at).toLocaleString() },
                { label: 'Requested Action', value: selected.requested_action || '—' },
                { label: 'Reason', value: selected.reason || '—' },
                { label: 'Impact', value: selected.impact || '—' },
                { label: 'Decided By', value: selected.decided_by || '—' },
                { label: 'Decided At', value: selected.decided_at ? new Date(selected.decided_at).toLocaleString() : '—' },
                { label: 'Evidence', value: selected.evidence_id ? <span className="font-mono text-xs text-slate-600">{selected.evidence_id.slice(0, 16)}</span> : '—' },
                { label: 'Escalated To', value: selected.escalated_to || '—' },
                { label: 'Escalated From', value: selected.escalated_from_id ? <span className="font-mono text-xs text-slate-600">{selected.escalated_from_id.slice(0, 16)}</span> : '—' },
                { label: 'Node', value: selected.node_id || '—' },
                { label: 'Harness', value: selected.harness_id || '—' },
                { label: 'Pipeline', value: selected.pipeline_id || '—' },
              ]}
              columns={2}
            />

            {selected.status === 'pending' && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-xs font-medium text-slate-600">Decision Reason</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Provide a reason for your decision..."
                    className="fi-input min-h-[60px] text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Escalate To (if escalating)</label>
                  <select
                    value={escalateTo}
                    onChange={e => setEscalateTo(e.target.value)}
                    className="fi-input py-1.5 text-sm"
                  >
                    <option value="">Select target...</option>
                    {(escalationTargets ?? []).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <button
                  disabled={!decidedBy || escalateMutation.isPending}
                  onClick={() => handleDecide('escalated')}
                  className="fi-btn-secondary bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs w-full"
                >
                  <ArrowUpCircle size={14} className="inline mr-1" />
                  Escalate Approval
                </button>
              </div>
            )}

            {selected.status !== 'pending' && selected.decision && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  {selected.decision === 'approved' && <FileCheck size={14} className="text-emerald-600" />}
                  {selected.decision === 'rejected' && <XCircle size={14} className="text-red-600" />}
                  {selected.decision === 'changes_requested' && <AlertTriangle size={14} className="text-amber-600" />}
                  {selected.decision === 'escalated' && <ArrowUpCircle size={14} className="text-orange-600" />}
                  <span className="text-sm font-medium text-slate-700">Decision: {selected.decision.replace(/_/g, ' ')}</span>
                </div>
                {selected.reason && <p className="text-sm text-slate-600">{selected.reason}</p>}
              </div>
            )}
          </div>
        )}
      </SideDrawer>
    </div>
  )
}
