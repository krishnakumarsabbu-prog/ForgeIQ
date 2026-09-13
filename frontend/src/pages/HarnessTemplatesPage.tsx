import { useState } from 'react'
import { LayoutTemplate, Check, Settings, ShieldCheck, Lock, GitBranch, ArrowRight, Plus, FileText, History, ChevronDown, ChevronRight } from 'lucide-react'
import { useHarnessTemplates, useTemplateInheritance, useInstantiateTemplate, useCreateHarnessTemplateVersion, usePublishHarnessTemplate } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import { StatusBadge } from '../components/ui/StatusBadge'
import type { HarnessTemplate, HarnessTemplateVersion } from '../types'

export default function HarnessTemplatesPage() {
  const { data: templates, isLoading } = useHarnessTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="Harness Templates"
        description="Platform templates with mandatory governance, optional steps, tenant override controls, and immutable versioning"
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : !templates?.length ? (
          <div className="fi-card">
            <EmptyState message="No templates available" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-4">
              <div className="fi-card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Templates</p>
                <p className="text-lg font-semibold text-slate-900">{templates.length}</p>
              </div>
              <div className="fi-card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Platform</p>
                <p className="text-lg font-semibold text-forgeiq-600">
                  {templates.filter(t => t.inheritance_level === 'platform').length}
                </p>
              </div>
              <div className="fi-card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Tenant</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {templates.filter(t => t.inheritance_level === 'tenant').length}
                </p>
              </div>
              <div className="fi-card p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Published</p>
                <p className="text-lg font-semibold text-slate-900">
                  {templates.filter(t => t.published).length}
                </p>
              </div>
            </div>

            {/* Template table */}
            <div className="fi-card">
              <div className="overflow-x-auto">
                <table className="fi-table">
                  <thead>
                    <tr>
                      <th className="w-8"></th>
                      <th>Template</th>
                      <th>Type</th>
                      <th>Inheritance</th>
                      <th className="text-right">Mandatory</th>
                      <th className="text-right">Optional</th>
                      <th className="text-right">Configurable</th>
                      <th>Override</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t: HarnessTemplate) => (
                      <>
                        <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleRow(t.id)}>
                          <td className="text-slate-400">
                            {expandedRows.has(t.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </td>
                          <td className="font-medium text-slate-900 flex items-center gap-2">
                            <LayoutTemplate size={14} className="text-forgeiq-600" />
                            {t.display_name || t.name}
                          </td>
                          <td>
                            <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                              {t.harness_type}
                            </span>
                          </td>
                          <td>
                            <span className={`fi-badge ${
                              t.inheritance_level === 'platform'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {t.inheritance_level}
                            </span>
                          </td>
                          <td className="text-right text-slate-600 font-medium">{t.mandatory_steps.length}</td>
                          <td className="text-right text-slate-600">{t.optional_steps.length}</td>
                          <td className="text-right text-slate-600">{t.configurable.length}</td>
                          <td>
                            {t.tenant_override_allowed ? (
                              <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">Allowed</span>
                            ) : (
                              <span className="fi-badge bg-slate-100 text-slate-500 border border-slate-200">Forbidden</span>
                            )}
                          </td>
                          <td className="font-mono text-sm text-slate-700">{t.current_version}</td>
                          <td>
                            {t.published ? (
                              <StatusBadge status="published" />
                            ) : (
                              <StatusBadge status="draft" />
                            )}
                          </td>
                          <td>
                            <button
                              className="text-xs text-forgeiq-600 hover:text-forgeiq-700 font-medium"
                              onClick={(e) => { e.stopPropagation(); setSelectedId(t.id) }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                        {expandedRows.has(t.id) && (
                          <tr key={`${t.id}-expanded`} className="bg-slate-50/50">
                            <td></td>
                            <td colSpan={10} className="py-4">
                              <div className="grid grid-cols-3 gap-4">
                                {/* Mandatory steps */}
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                      Mandatory Steps
                                    </h4>
                                  </div>
                                  {t.mandatory_steps.length === 0 ? (
                                    <p className="text-xs text-slate-400">None</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {t.mandatory_steps.map((step, i) => (
                                        <li key={i} className="flex items-center gap-1.5 text-sm text-slate-700">
                                          <Lock size={12} className="text-red-500 flex-shrink-0" />
                                          {step}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                {/* Optional steps */}
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                      Optional Steps
                                    </h4>
                                  </div>
                                  {t.optional_steps.length === 0 ? (
                                    <p className="text-xs text-slate-400">None</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {t.optional_steps.map((step, i) => (
                                        <li key={i} className="flex items-center gap-1.5 text-sm text-slate-700">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                          {step}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                {/* Configurable + forbidden */}
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Settings className="h-3.5 w-3.5 text-forgeiq-600" />
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                      Configurable
                                    </h4>
                                  </div>
                                  {t.configurable.length === 0 ? (
                                    <p className="text-xs text-slate-400">Nothing configurable</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {t.configurable.map((c, i) => (
                                        <span key={i} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {t.tenant_override_forbidden.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
                                        Override Forbidden
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {t.tenant_override_forbidden.map((f, i) => (
                                          <span key={i} className="fi-badge bg-red-50 text-red-600 border border-red-200">
                                            {f}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Versions */}
                              {t.versions && t.versions.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-200">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <History size={14} className="text-forgeiq-600" />
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                      Template Versions
                                    </h4>
                                  </div>
                                  <div className="flex gap-2">
                                    {t.versions.map((v: HarnessTemplateVersion) => (
                                      <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white">
                                        <span className="font-mono text-sm text-slate-700">{v.version}</span>
                                        {v.is_default && <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>}
                                        {v.is_immutable && <Lock size={11} className="text-slate-400" />}
                                        <span className={`fi-badge ${v.published ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                          {v.published ? 'published' : 'draft'}
                                        </span>
                                        <span className="text-xs text-slate-400">{v.changelog}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <TemplateDetailDrawer templateId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

function TemplateDetailDrawer({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const { data: templates } = useHarnessTemplates()
  const template = templates?.find(t => t.id === templateId)
  const { data: inheritance } = useTemplateInheritance(templateId)
  const instantiate = useInstantiateTemplate()
  const [instantiateName, setInstantiateName] = useState('')

  if (!template) return null

  const isInherited = template.inheritance_level === 'tenant' && template.parent_template_id

  return (
    <SideDrawer
      open
      onClose={onClose}
      title={template.display_name || template.name}
      subtitle={template.description}
      width="560px"
      footer={
        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            placeholder="New harness name..."
            value={instantiateName}
            onChange={(e) => setInstantiateName(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-forgeiq-400"
          />
          <button
            className="px-3 py-1.5 text-sm font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 disabled:opacity-50"
            disabled={!instantiateName || instantiate.isPending}
            onClick={() => {
              instantiate.mutate(
                { id: templateId, body: { display_name: instantiateName } },
                { onSuccess: () => { setInstantiateName(''); onClose() } }
              )
            }}
          >
            Instantiate
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-5">
        {/* Basic info */}
        <div className="fi-card p-4">
          <DetailsPanel
            items={[
              { label: 'Type', value: <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{template.harness_type}</span> },
              { label: 'Inheritance', value: <span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200">{template.inheritance_level}</span> },
              { label: 'Current Version', value: <span className="font-mono text-sm">{template.current_version}</span> },
              { label: 'Published', value: template.published ? <StatusBadge status="published" /> : <StatusBadge status="draft" /> },
              { label: 'Override Allowed', value: template.tenant_override_allowed ? 'Yes' : 'No' },
              { label: 'Last Published', value: template.last_published_at ? new Date(template.last_published_at).toLocaleDateString() : '—' },
            ]}
          />
        </div>

        {/* Inheritance chain */}
        {inheritance && inheritance.chain.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <GitBranch size={14} className="text-forgeiq-600" />
              Inheritance Chain
            </h3>
            <div className="space-y-2">
              {inheritance.chain.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-1 fi-card p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.inheritance_level} - v{item.current_version}
                        </p>
                      </div>
                      <span className={`fi-badge ${
                        item.inheritance_level === 'platform'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {item.inheritance_level}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.mandatory_steps.map((s, j) => (
                        <span key={j} className="fi-badge bg-red-50 text-red-600 border border-red-200 text-xs">
                          <Lock size={9} className="inline mr-1" />{s}
                        </span>
                      ))}
                    </div>
                  </div>
                  {i < inheritance.chain.length - 1 && (
                    <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {inheritance.governance_enforced ? (
                <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={11} className="inline mr-1" />Mandatory governance enforced
                </span>
              ) : (
                <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">
                  Governance gap detected
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mandatory steps */}
        <div>
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-red-500" />
            Mandatory Steps ({template.mandatory_steps.length})
          </h3>
          <div className="space-y-1">
            {template.mandatory_steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50/50 border border-red-100">
                <Lock size={12} className="text-red-500" />
                <span className="text-sm text-slate-700">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Optional steps */}
        <div>
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Check size={14} className="text-emerald-500" />
            Optional Steps ({template.optional_steps.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {template.optional_steps.length === 0 ? (
              <p className="text-xs text-slate-400">None</p>
            ) : (
              template.optional_steps.map((step, i) => (
                <span key={i} className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {step}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Configurable */}
        <div>
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Settings size={14} className="text-forgeiq-600" />
            Configurable ({template.configurable.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {template.configurable.length === 0 ? (
              <p className="text-xs text-slate-400">Nothing configurable</p>
            ) : (
              template.configurable.map((c, i) => (
                <span key={i} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">
                  {c}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Override forbidden */}
        {template.tenant_override_forbidden.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
              Override Forbidden
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {template.tenant_override_forbidden.map((f, i) => (
                <span key={i} className="fi-badge bg-red-50 text-red-600 border border-red-200">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Versions */}
        {template.versions && template.versions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <History size={14} className="text-forgeiq-600" />
              Versions ({template.versions.length})
            </h3>
            <div className="space-y-2">
              {template.versions.map((v) => (
                <div key={v.id} className="fi-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-slate-900">{v.version}</span>
                      {v.is_default && <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>}
                      {v.is_immutable && <Lock size={11} className="text-slate-400" />}
                    </div>
                    <span className={`fi-badge ${v.published ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {v.published ? 'published' : 'draft'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{v.changelog}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SideDrawer>
  )
}
