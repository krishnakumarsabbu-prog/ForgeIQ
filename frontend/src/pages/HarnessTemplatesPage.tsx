import { LayoutTemplate, Check, Settings, ShieldCheck } from 'lucide-react'
import { useHarnessTemplates } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { HarnessTemplate } from '../types'

export default function HarnessTemplatesPage() {
  const { data: templates, isLoading } = useHarnessTemplates()

  return (
    <div>
      <PageHeader
        title="Harness Templates"
        description="Predefined harness templates with mandatory and optional steps"
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : !templates?.length ? (
          <div className="fi-card">
            <EmptyState message="No templates available" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t: HarnessTemplate) => (
              <div key={t.id} className="fi-card flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="h-5 w-5 text-forgeiq-600" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        {t.display_name || t.name}
                      </h3>
                    </div>
                    <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                      {t.harness_type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1.5">{t.description}</p>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4 flex-1">
                  {/* Mandatory Steps */}
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
                          <li
                            key={i}
                            className="flex items-center gap-1.5 text-sm text-slate-700"
                          >
                            <Check className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Optional Steps */}
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
                          <li
                            key={i}
                            className="flex items-center gap-1.5 text-sm text-slate-700"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Configurable */}
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
                      <div className="flex flex-wrap gap-1.5">
                        {t.configurable.map((c, i) => (
                          <span
                            key={i}
                            className="fi-badge bg-slate-50 text-slate-600 border border-slate-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Override Allowed</span>
                    {t.tenant_override_allowed ? (
                      <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Yes
                      </span>
                    ) : (
                      <span className="fi-badge bg-slate-100 text-slate-500 border border-slate-200">
                        No
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
