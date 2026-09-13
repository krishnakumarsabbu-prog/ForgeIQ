import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, GitBranch, ArrowRight, Layers } from 'lucide-react'
import { usePipeline, useHarnesses } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { PipelineStage } from '../types'

const STAGE_TYPE_COLORS: Record<string, string> = {
  build: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  test: 'bg-blue-50 text-blue-700 border border-blue-200',
  deploy: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  verification: 'bg-orange-50 text-orange-700 border border-orange-200',
  rollback: 'bg-red-50 text-red-700 border border-red-200',
}

export default function PipelineDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: pipeline, isLoading } = usePipeline(id || '')
  const { data: harnesses } = useHarnesses()

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Pipeline Detail" />
        <LoadingSpinner />
      </div>
    )
  }

  if (!pipeline) {
    return (
      <div>
        <PageHeader title="Pipeline Detail" />
        <div className="fi-card">
          <EmptyState message="Pipeline not found" />
        </div>
      </div>
    )
  }

  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)
  const harnessName = (harnessId: string) => {
    const h = (harnesses || []).find((x) => x.id === harnessId)
    return h ? h.display_name || h.name : harnessId
  }

  return (
    <div>
      <PageHeader
        title={pipeline.display_name || pipeline.name}
        description={pipeline.description}
        actions={
          <Link
            to="/pipelines"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Pipeline Info */}
        <div className="fi-card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-forgeiq-600" />
            Configuration
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoField label="Name" value={pipeline.name} />
            <InfoField label="Application" value={pipeline.application_id || '—'} />
            <InfoField label="Current Version" value={pipeline.current_version} />
            <InfoField
              label="Published"
              value={pipeline.published ? 'Yes' : 'No'}
            />
          </div>
        </div>

        {/* Stage Flow Diagram */}
        <div className="fi-card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Stage Flow</h3>
          {sortedStages.length === 0 ? (
            <EmptyState message="No stages in this pipeline" />
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {sortedStages.map((stage: PipelineStage, idx: number) => (
                <div key={stage.id} className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-center gap-1.5 min-w-[140px]">
                    <div className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center">
                      <div className="text-sm font-medium text-slate-900">{stage.name}</div>
                      <div className="mt-1">
                        <span
                          className={`fi-badge text-xs ${
                            STAGE_TYPE_COLORS[stage.stage_type] ||
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {stage.stage_type}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-slate-400">
                        <Layers className="h-3 w-3" />
                        {harnessName(stage.harness_id)}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Stage {stage.order}</span>
                  </div>
                  {idx < sortedStages.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stage Details Table */}
        <div className="fi-card">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Stage Details</h3>
          </div>
          {sortedStages.length === 0 ? (
            <EmptyState message="No stages configured" />
          ) : (
            <table className="fi-table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Stage Name</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Harness</th>
                  <th className="text-left">Condition</th>
                  <th className="text-center">Required</th>
                </tr>
              </thead>
              <tbody>
                {sortedStages.map((stage: PipelineStage) => (
                  <tr key={stage.id}>
                    <td className="text-slate-500 font-mono text-sm">{stage.order}</td>
                    <td className="font-medium text-slate-900">{stage.name}</td>
                    <td>
                      <span
                        className={`fi-badge text-xs ${
                          STAGE_TYPE_COLORS[stage.stage_type] ||
                          'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {stage.stage_type}
                      </span>
                    </td>
                    <td className="text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        {harnessName(stage.harness_id)}
                      </div>
                    </td>
                    <td className="text-slate-600 font-mono text-xs">
                      {stage.condition || '—'}
                    </td>
                    <td className="text-center">
                      {stage.required ? (
                        <span className="text-amber-600 font-medium text-xs">Required</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Optional</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  )
}
