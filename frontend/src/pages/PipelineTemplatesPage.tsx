import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitBranch, Plus, Layers, FileCheck, Boxes, ArrowRight,
  CheckCircle2, Shield, Package, Rocket, Server, Eye,
} from 'lucide-react'
import {
  usePipelineTemplates, useInstantiatePipelineTemplate,
} from '../hooks/useQueries'
import { useApplications } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/StatusBadge'
import type { PipelineTemplate } from '../types'

const STAGE_ICONS: Record<string, typeof Layers> = {
  harness: Layers,
  development: Layers,
  testing: CheckCircle2,
  security: Shield,
  build: Package,
  release: Rocket,
  deployment: Server,
  verification: Eye,
  approval: FileCheck,
  condition: GitBranch,
  parallel: Boxes,
  environment: Server,
  artifact: Package,
}

const CATEGORY_COLORS: Record<string, string> = {
  frontend: 'bg-blue-50 text-blue-700 border border-blue-200',
  backend: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  release: 'bg-purple-50 text-purple-700 border border-purple-200',
  security: 'bg-red-50 text-red-700 border border-red-200',
  deployment: 'bg-amber-50 text-amber-700 border border-amber-200',
  full: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  custom: 'bg-slate-50 text-slate-600 border border-slate-200',
}

export default function PipelineTemplatesPage() {
  const navigate = useNavigate()
  const { data: templates, isLoading } = usePipelineTemplates()
  const { data: applications } = useApplications()
  const instantiate = useInstantiatePipelineTemplate()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [appId, setAppId] = useState('')
  const [instantiating, setInstantiating] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selected = (templates || []).find((t) => t.id === selectedId)

  const handleInstantiate = async () => {
    if (!selected || !displayName) {
      setMsg({ type: 'error', text: 'Display name is required' })
      return
    }
    setInstantiating(true)
    setMsg(null)
    try {
      const result = await instantiate.mutateAsync({
        id: selected.id,
        body: { display_name: displayName, application_id: appId || undefined },
      })
      navigate(`/pipelines/${result.id}`)
    } catch (e) {
      setMsg({ type: 'error', text: `Failed: ${(e as Error).message}` })
    } finally {
      setInstantiating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pipeline Templates"
        description="Reusable, versioned pipeline templates for common engineering lifecycles"
        actions={
          <button
            onClick={() => navigate('/pipeline-builder')}
            className="inline-flex items-center gap-1.5 rounded-md bg-forgeiq-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forgeiq-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Pipeline
          </button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : !templates?.length ? (
          <div className="fi-card">
            <EmptyState message="No pipeline templates configured" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Template list */}
            <div className="space-y-3">
              {templates.map((t: PipelineTemplate) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedId(t.id)
                    setDisplayName(`${t.display_name} Instance`)
                    setMsg(null)
                  }}
                  className={`fi-card p-4 cursor-pointer transition-all ${
                    selectedId === t.id ? 'ring-2 ring-forgeiq-400 border-forgeiq-300' : 'hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-forgeiq-600" />
                      <span className="text-sm font-semibold text-slate-900">{t.display_name}</span>
                    </div>
                    <span className={`fi-badge text-xs ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.custom}`}>
                      {t.category}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{t.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-400">{t.stage_definitions.length} stages</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400">v{t.current_version}</span>
                    {t.published && (
                      <>
                        <span className="text-slate-300">·</span>
                        <StatusBadge status="published" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Template detail / instantiate */}
            <div className="fi-card p-5 sticky top-6 self-start">
              {!selected ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Layers className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">Select a template to view details and instantiate</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="h-5 w-5 text-forgeiq-600" />
                    <h3 className="text-sm font-semibold text-slate-900">{selected.display_name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{selected.description}</p>

                  {/* Stage flow preview */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Stage Flow</h4>
                    <div className="space-y-1.5">
                      {selected.stage_definitions.map((sd: Record<string, unknown>, i: number) => {
                        const stageType = (sd.stage_type as string) || 'harness'
                        const Icon = STAGE_ICONS[stageType] || Layers
                        const name = (sd.name as string) || `Stage ${i + 1}`
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                              {i + 1}
                            </div>
                            <Icon className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-medium text-slate-700">{name}</span>
                            <span className="text-xs text-slate-400">· {stageType}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Instantiate form */}
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instantiate</h4>
                    {msg && (
                      <div className={`text-xs font-medium ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {msg.text}
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pipeline Name</label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="My Pipeline"
                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Application</label>
                      <select
                        value={appId}
                        onChange={(e) => setAppId(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-forgeiq-500 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
                      >
                        <option value="">No application</option>
                        {(applications || []).map((app) => (
                          <option key={app.id} value={app.id}>{app.display_name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleInstantiate}
                      disabled={instantiating || !displayName}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-forgeiq-600 px-3 py-2 text-sm font-medium text-white hover:bg-forgeiq-700 transition-colors disabled:opacity-50"
                    >
                      {instantiating ? <Spinner /> : <ArrowRight className="h-4 w-4" />}
                      Create Pipeline from Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
