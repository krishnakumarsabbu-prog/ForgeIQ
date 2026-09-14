import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useGovernance } from '../hooks/useQueries'
import { FileCheck, Shield, AlertTriangle, CheckCircle2, Lock, TrendingUp } from 'lucide-react'

export default function GovernancePage() {
  const { data, isLoading } = useGovernance?.() ?? { data: null, isLoading: false }

  return (
    <>
      <PageHeader
        title="Governance Center"
        description="Enterprise compliance dashboard — policy coverage, risk posture, and autonomous governance metrics."
        icon={<FileCheck size={18} />}
        badge="Compliance"
        badgeVariant="violet"
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Policy Coverage"   value="94%"  sub="Of all pipelines"    icon={Shield}       gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Compliant Runs"    value="98.2%" sub="Last 30 days"       icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Risk Score"        value="Low"  sub="Enterprise posture"  icon={AlertTriangle} gradient={['#f59e0b','#f97316']} />
          <StatCard label="Audit Events"      value="1.2K" sub="This month"          icon={TrendingUp}   gradient={['#00adef','#0a68f4']} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <EnterpriseCard>
            <SectionHeader icon={Shield} title="Policy Compliance Matrix" subtitle="Coverage across pipeline stages" iconColor="#7c3aed" />
            <div className="p-5 space-y-3">
              {[
                { stage: 'Requirements', coverage: 88, color: '#0284c7' },
                { stage: 'Architecture', coverage: 95, color: '#10b981' },
                { stage: 'Coding',       coverage: 100, color: '#10b981' },
                { stage: 'Testing',      coverage: 92, color: '#10b981' },
                { stage: 'Security',     coverage: 97, color: '#10b981' },
                { stage: 'Build',        coverage: 100, color: '#10b981' },
                { stage: 'Deployment',   coverage: 94, color: '#0284c7' },
              ].map(row => (
                <div key={row.stage} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-28 shrink-0">{row.stage}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${row.coverage}%`, background: row.color }} />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: row.color }}>{row.coverage}%</span>
                </div>
              ))}
            </div>
          </EnterpriseCard>

          <EnterpriseCard>
            <SectionHeader icon={AlertTriangle} title="Risk Assessment" subtitle="Current risk items by severity" iconColor="#f59e0b" />
            <div className="p-5 space-y-2">
              {[
                { label: 'Critical Violations',  count: 0,  color: '#e11d48', bg: 'rgba(244,63,94,0.08)' },
                { label: 'High Risk Items',       count: 2,  color: '#b45309', bg: 'rgba(245,158,11,0.08)' },
                { label: 'Medium Risk Items',     count: 7,  color: '#0369a1', bg: 'rgba(14,165,233,0.08)' },
                { label: 'Low Risk Items',        count: 14, color: '#059669', bg: 'rgba(16,185,129,0.08)' },
                { label: 'Compliant Policies',    count: 42, color: '#059669', bg: 'rgba(16,185,129,0.08)' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: item.bg, border: `1px solid ${item.color}20` }}>
                  <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                  <span className="text-lg font-black" style={{ color: item.color }}>{item.count}</span>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        </div>
      </div>
    </>
  )
}
