import { useNavigate } from 'react-router-dom'
import { GitBranch, Plus, LayoutTemplate, Layers, CheckCircle2, Activity, ArrowUpRight, Workflow, Zap } from 'lucide-react'
import { usePipelines } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import type { Pipeline } from '../types'

export default function PipelinesPage() {
  const navigate = useNavigate()
  const { data: pipelines, isLoading } = usePipelines()

  const total = pipelines?.length ?? 0
  const active = pipelines?.filter(p => p.active).length ?? 0
  const published = pipelines?.filter(p => p.published).length ?? 0

  return (
    <>
      <PageHeader
        title="Engineering Pipelines"
        description="Autonomous delivery pipelines chaining multi-agent stages, policy gates, and canary releases."
        badge="Continuous Delivery"
        badgeVariant="violet"
        icon={<GitBranch size={18} />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/pipeline-templates')} className="fi-btn-secondary">
              <LayoutTemplate size={13} /> Templates
            </button>
            <button onClick={() => navigate('/pipeline-builder')} className="fi-btn-primary">
              <Plus size={13} strokeWidth={2.5} /> New Pipeline
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Pipelines"    value={total}     sub="Registered"      icon={GitBranch}   gradient={['#6366f1','#7c3aed']} />
          <StatCard label="Active Production"  value={active}    sub="Live now"        icon={CheckCircle2} gradient={['#10b981','#0891b2']} />
          <StatCard label="Published"          value={published} sub="Ready to deploy" icon={Layers}       gradient={['#00adef','#0a68f4']} />
          <StatCard label="Autonomous Velocity" value="99.4%"    sub="SLA compliance"  icon={Activity}    gradient={['#f59e0b','#f97316']} />
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading pipeline roster..." />
        ) : !pipelines?.length ? (
          <EnterpriseCard>
            <EmptyState
              message="No pipelines configured yet"
              description="Build your first AI-driven engineering pipeline."
              icon={<GitBranch size={24} className="text-slate-300" />}
              action={
                <div className="flex items-center gap-2">
                  <button className="fi-btn-primary" onClick={() => navigate('/pipeline-builder')}>
                    <Plus size={13} /> New Pipeline
                  </button>
                  <button className="fi-btn-secondary" onClick={() => navigate('/pipeline-templates')}>
                    <LayoutTemplate size={13} /> Browse Templates
                  </button>
                </div>
              }
            />
          </EnterpriseCard>
        ) : (
          <EnterpriseCard>
            <SectionHeader
              icon={GitBranch}
              title="Pipeline Roster"
              subtitle={`${pipelines.length} pipeline definitions`}
              iconColor="#6366f1"
            />
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Pipeline Name</th>
                    <th>Description</th>
                    <th>Application</th>
                    <th>Stage Blueprint</th>
                    <th className="text-center">Lifecycle</th>
                    <th className="text-center">Active Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pipelines.map((p: Pipeline) => (
                    <tr key={p.id} onClick={() => navigate(`/pipelines/${p.id}`)} className="cursor-pointer group">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                          >
                            <GitBranch size={14} style={{ color: '#6366f1' }} />
                          </div>
                          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs">
                            {p.display_name || p.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-500 text-xs max-w-xs truncate">{p.description || '—'}</td>
                      <td>
                        <span className="font-mono text-[11px] text-slate-500">{p.application_id || '—'}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}
                          >
                            {p.stages.length} Stages
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {p.stages.slice(0, 2).join(' → ')}{p.stages.length > 2 ? '…' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <StatusBadge status={p.published ? 'PUBLISHED' : 'DRAFT'} />
                      </td>
                      <td className="text-center">
                        {p.active ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: '#f1f5f9', color: '#94a3b8' }}
                          >
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <ArrowUpRight size={14} className="text-slate-200 group-hover:text-indigo-500 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </EnterpriseCard>
        )}
      </div>
    </>
  )
}
