import { useNavigate } from 'react-router-dom'
import { Shield, Plus, AlertTriangle, CheckCircle2, Lock, FileCheck } from 'lucide-react'
import { useGovernancePolicies } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'

export default function PoliciesPage() {
  const navigate = useNavigate()
  const { data: policies, isLoading } = useGovernancePolicies()

  const active = policies?.filter((p: any) => p.active || p.enabled).length ?? 0
  const blocking = policies?.filter((p: any) => p.enforcement === 'BLOCK').length ?? 0

  return (
    <>
      <PageHeader
        title="Governance Policies"
        description="Define and enforce delivery guardrails — security, quality, approval, and compliance gates."
        icon={<Shield size={18} />}
        badge="Governance"
        badgeVariant="violet"
        actions={
          <button className="fi-btn-primary">
            <Plus size={13} /> New Policy
          </button>
        }
      />
      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Policies"  value={policies?.length ?? 0} sub="Registered"   icon={Shield}      gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Active"          value={active}                sub="Enforced"     icon={CheckCircle2} gradient={['#10b981','#0891b2']} />
          <StatCard label="Blocking"        value={blocking}              sub="Hard gates"   icon={Lock}         gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Advisory"        value={(policies?.length ?? 0) - blocking} sub="Warnings" icon={AlertTriangle} gradient={['#f59e0b','#f97316']} />
        </div>
        <EnterpriseCard>
          <SectionHeader icon={Shield} title="Policy Registry" subtitle="All governance policies" iconColor="#7c3aed" />
          {isLoading ? (
            <LoadingSpinner />
          ) : !policies?.length ? (
            <EmptyState message="No policies defined" description="Create governance policies to enforce quality gates." />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Policy Name</th>
                    <th>Type</th>
                    <th>Stage</th>
                    <th>Enforcement</th>
                    <th>Scope</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p: any) => (
                    <tr key={p.id} className="cursor-pointer group hover:bg-slate-50">
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <Shield size={13} style={{ color: '#7c3aed' }} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">{p.name || p.display_name}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{p.description}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.2)' }}>
                          {p.policy_type || p.type || 'Guardrail'}
                        </span>
                      </td>
                      <td className="text-xs font-mono text-slate-600">{p.stage}</td>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={
                            p.enforcement === 'BLOCK'
                              ? { background: 'rgba(244,63,94,0.1)', color: '#e11d48', border: '1px solid rgba(244,63,94,0.2)' }
                              : { background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }
                          }
                        >
                          {p.enforcement}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{p.scope}</td>
                      <td><StatusBadge status={p.enabled ? 'ACTIVE' : 'INACTIVE'} /></td>
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
