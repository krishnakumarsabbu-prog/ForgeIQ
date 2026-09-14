import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, GitBranch, ArrowRight, Layers, Settings, CheckCircle2, AlertTriangle } from 'lucide-react'
import { usePipeline, useHarnesses } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import type { PipelineStage } from '../types'

const stageTypeStyle: Record<string, { bg: string; color: string; border: string }> = {
  build:       { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
  test:        { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  testing:     { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  deploy:      { bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
  deployment:  { bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
  approval:    { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  verification:{ bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  rollback:    { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  security:    { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  release:     { bg: 'rgba(99,102,241,0.1)',  color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
  parallel:    { bg: 'rgba(6,182,212,0.1)',   color: '#0891b2', border: 'rgba(6,182,212,0.25)' },
  harness:     { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
  development: { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
}
const DEFAULT_STAGE = { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.2)' }

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className="text-xs font-semibold text-slate-800">{value}</div>
    </div>
  )
}

export default function PipelineDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: pipeline, isLoading } = usePipeline(id || '')
  const { data: harnesses } = useHarnesses()

  if (isLoading) return (
    <>
      <PageHeader title="Pipeline Detail" description="Loading pipeline configuration..." icon={<GitBranch size={18} />} />
      <LoadingSpinner message="Loading pipeline..." />
    </>
  )

  if (!pipeline) return (
    <>
      <PageHeader title="Pipeline Detail" icon={<GitBranch size={18} />} />
      <div className="p-6"><EnterpriseCard><EmptyState message="Pipeline not found" /></EnterpriseCard></div>
    </>
  )

  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)
  const harnessName = (harnessId?: string) => {
    if (!harnessId) return '—'
    const h = (harnesses || []).find(x => x.id === harnessId)
    return h ? h.display_name || h.name : harnessId.slice(0, 14) + '…'
  }

  return (
    <>
      <PageHeader
        title={pipeline.display_name || pipeline.name}
        description={pipeline.description || 'Autonomous delivery pipeline'}
        icon={<GitBranch size={18} />}
        badge={pipeline.published ? 'Published' : 'Draft'}
        badgeVariant={pipeline.published ? 'emerald' : 'amber'}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/pipelines')} className="fi-btn-secondary">
              <ArrowLeft size={13} /> Back
            </button>
            <button onClick={() => navigate(`/pipeline-builder?pipeline=${id}`)} className="fi-btn-primary">
              <Settings size={13} /> Edit in Builder
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        {/* Config Overview */}
        <EnterpriseCard>
          <SectionHeader icon={GitBranch} title="Pipeline Configuration" subtitle="Core settings and metadata" iconColor="#6366f1" />
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoField label="Internal Name"    value={pipeline.name} />
            <InfoField label="Application"      value={pipeline.application_id || '—'} />
            <InfoField label="Current Version"  value={pipeline.current_version} />
            <InfoField label="Active"           value={pipeline.active ? 'Yes' : 'No'} />
            <InfoField label="Total Stages"     value={String(sortedStages.length)} />
            <InfoField label="Published"        value={pipeline.published ? 'Yes' : 'No'} />
          </div>
        </EnterpriseCard>

        {/* Stage Flow Visual */}
        <EnterpriseCard>
          <SectionHeader icon={ArrowRight} title="Stage Flow" subtitle="Visual pipeline progression" iconColor="#6366f1" />
          <div className="p-5">
            {sortedStages.length === 0 ? (
              <EmptyState message="No stages in this pipeline" description="Edit in Pipeline Builder to add stages." />
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-3">
                {sortedStages.map((stage: PipelineStage, idx: number) => {
                  const ss = stageTypeStyle[stage.stage_type] ?? DEFAULT_STAGE
                  return (
                    <div key={stage.id} className="flex items-center gap-2 shrink-0">
                      <div
                        className="rounded-2xl p-3.5 text-center min-w-[130px] transition-all duration-200 cursor-default"
                        style={{
                          background: ss.bg,
                          border: `1px solid ${ss.border}`,
                        }}
                      >
                        <div className="text-xs font-black text-slate-900 mb-1.5">{stage.name}</div>
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}
                        >
                          {stage.stage_type}
                        </span>
                        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-400">
                          <Layers size={10} />
                          <span className="truncate max-w-[100px]">{harnessName(stage.harness_id)}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 mt-1">Order {stage.order}</div>
                      </div>
                      {idx < sortedStages.length - 1 && (
                        <ArrowRight size={16} style={{ color: '#cbd5e1' }} className="shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </EnterpriseCard>

        {/* Stage Details Table */}
        <EnterpriseCard>
          <SectionHeader icon={Layers} title="Stage Details" subtitle="Configuration per stage" iconColor="#6366f1" />
          {sortedStages.length === 0 ? (
            <EmptyState message="No stages configured" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Stage Name</th><th>Type</th><th>Harness</th>
                    <th>Environment</th><th>Failure Strategy</th><th className="text-center">Required</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStages.map((stage: PipelineStage) => {
                    const ss = stageTypeStyle[stage.stage_type] ?? DEFAULT_STAGE
                    return (
                      <tr key={stage.id}>
                        <td>
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            #{stage.order}
                          </span>
                        </td>
                        <td className="font-semibold text-slate-900 text-xs">{stage.name}</td>
                        <td>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                            {stage.stage_type}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Layers size={11} className="text-slate-400" />
                            {harnessName(stage.harness_id)}
                          </div>
                        </td>
                        <td className="text-xs text-slate-600">{stage.config?.environment || '—'}</td>
                        <td>
                          <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            {stage.config?.failure_strategy || 'abort'}
                          </span>
                        </td>
                        <td className="text-center">
                          {stage.required ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>Required</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Optional</span>
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
