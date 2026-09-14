import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, CheckCircle2, Clock, AlertTriangle, ChevronRight, BookOpen } from 'lucide-react'
import { useRequirements } from '../hooks/useQueries'

function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function RequirementsPage() {
  const navigate = useNavigate()
  const { data: requirements, isLoading } = useRequirements?.() ?? { data: null, isLoading: false }

  const approved  = requirements?.filter((r: any) => r.status === 'approved').length ?? 0
  const pending   = requirements?.filter((r: any) => r.status === 'pending' || r.status === 'draft').length ?? 0
  const inProgress = requirements?.filter((r: any) => r.status === 'in_progress').length ?? 0

  return (
    <>
      <PageHeader
        title="Requirements Engineering"
        description="AI-generated product requirements, user stories, acceptance criteria, and traceability mapping."
        icon={<BookOpen size={18} />}
        badge="Product Intelligence"
        badgeVariant="cyan"
        actions={<button className="fi-btn-primary"><Plus size={13} /> New Requirement</button>}
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total"       value={requirements?.length ?? 0} sub="Registered"   icon={BookOpen}     gradient={['#00adef','#0a68f4']} />
          <StatCard label="Approved"    value={approved}                   sub="Ready to build" icon={CheckCircle2} gradient={['#10b981','#0891b2']} />
          <StatCard label="In Progress" value={inProgress}                 sub="Engineering"  icon={AlertTriangle} gradient={['#f59e0b','#f97316']} />
          <StatCard label="Pending"     value={pending}                    sub="Draft/Review" icon={Clock}        gradient={['#6366f1','#7c3aed']} />
        </div>

        <EnterpriseCard>
          <SectionHeader icon={BookOpen} title="Requirements Registry" subtitle="AI-generated and human-validated requirements" iconColor="#0284c7" />
          {isLoading ? (
            <LoadingSpinner message="Loading requirements..." />
          ) : !requirements?.length ? (
            <EmptyState
              message="No requirements found"
              description="Start engineering a new application to auto-generate AI requirements from business context."
              icon={<FileText size={24} className="text-slate-300" />}
              action={<button className="fi-btn-primary"><Plus size={13} /> New Requirement</button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Requirement</th><th>Type</th><th>Application</th>
                    <th>Priority</th><th>Status</th><th>Updated</th><th />
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((r: any) => (
                    <tr key={r.id} className="cursor-pointer group" onClick={() => navigate(`/requirements/${r.id}`)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                            <FileText size={12} style={{ color: '#0284c7' }} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs truncate max-w-[220px]">{r.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.id?.slice(0, 14)}…</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.2)' }}>
                          {r.type || 'functional'}
                        </span>
                      </td>
                      <td className="text-xs font-medium text-slate-700">{r.application || '—'}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={r.priority === 'HIGH' || r.priority === 'CRITICAL'
                            ? { background: 'rgba(244,63,94,0.1)', color: '#e11d48', border: '1px solid rgba(244,63,94,0.2)' }
                            : r.priority === 'MEDIUM'
                            ? { background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }
                            : { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
                          }>
                          {r.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize"
                          style={r.status === 'approved'
                            ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
                            : { background: 'rgba(100,116,139,0.1)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }
                          }>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{timeAgo(r.updated_at)}</td>
                      <td><ChevronRight size={14} className="text-slate-200 group-hover:text-sky-500 transition-colors" /></td>
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
