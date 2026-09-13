import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ShieldAlert, Activity, GitBranch, Boxes, Plug, TestTube2,
  Package, Rocket, Server, AlertTriangle, GitPullRequest, BookOpen, X, Cpu,
} from 'lucide-react'
import { useEngineeringStates } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { EngineeringState } from '../types'

function healthColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function coverageColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function truncateId(id: string, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—'
}

function Section({ icon: Icon, title, children }: { icon: typeof Activity; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}

function JsonSection({ icon: Icon, title, data }: { icon: typeof Activity; title: string; data: unknown }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto max-h-64 text-slate-700">
{JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default function EngineeringStatePage() {
  const { data: states, isLoading } = useEngineeringStates()
  const [selected, setSelected] = useState<EngineeringState | null>(null)

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Engineering States" description="Live architectural and quality state of applications" />
        <LoadingSpinner />
      </div>
    )
  }

  const items = states ?? []

  return (
    <div className="fi-card">
      <PageHeader
        title="Engineering States"
        description="Live architectural and quality state of applications"
        actions={<span className="text-xs text-slate-500">{items.length} states</span>}
      />
      {items.length === 0 ? (
        <EmptyState message="No engineering states available" />
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="text-left fi-card hover:border-forgeiq-300 hover:shadow-sm transition-all p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Application</div>
                  <Link
                    to={`/applications/${s.application_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-xs text-forgeiq-600 hover:underline"
                  >
                    {truncateId(s.application_id)}
                  </Link>
                </div>
                <span className="fi-badge bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  v{s.version}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Health
                  </div>
                  <div className={`text-lg font-semibold ${healthColor(s.health_score)}`}>{s.health_score}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <TestTube2 className="h-3 w-3" /> Coverage
                  </div>
                  <div className={`text-lg font-semibold ${coverageColor(s.coverage_pct)}`}>{s.coverage_pct}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> {s.security_findings} findings
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <ShieldAlert className="h-3.5 w-3.5" /> {s.open_vulnerabilities} vulns
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <GitBranch className="h-3 w-3" />
                <span className="font-mono">{s.branch}</span>
                <span className="text-slate-300">@</span>
                <span className="font-mono">{truncateId(s.commit, 7)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-xl h-full overflow-y-auto border-l border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Engineering State</h2>
                <p className="font-mono text-xs text-slate-500">
                  {truncateId(selected.application_id)} · v{selected.version}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-5">
              <div className="grid grid-cols-4 gap-3">
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500">Health</div>
                  <div className={`text-xl font-semibold ${healthColor(selected.health_score)}`}>{selected.health_score}</div>
                </div>
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500">Coverage</div>
                  <div className={`text-xl font-semibold ${coverageColor(selected.coverage_pct)}`}>{selected.coverage_pct}%</div>
                </div>
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500">Findings</div>
                  <div className="text-xl font-semibold text-slate-700">{selected.security_findings}</div>
                </div>
                <div className="fi-card p-3">
                  <div className="text-xs text-slate-500">Vulns</div>
                  <div className="text-xl font-semibold text-red-600">{selected.open_vulnerabilities}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> {selected.branch}</span>
                <span className="font-mono">{truncateId(selected.commit, 10)}</span>
                <span className="text-slate-400">·</span>
                <span>Updated {new Date(selected.last_updated).toLocaleString()}</span>
              </div>

              <JsonSection icon={Boxes} title="Architecture" data={selected.architecture} />

              <Section icon={Cpu} title="Technologies">
                <div className="flex flex-wrap gap-1">
                  {selected.technologies.map((t, i) => (
                    <span key={i} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{t}</span>
                  ))}
                </div>
              </Section>

              <JsonSection icon={Package} title="Dependencies" data={selected.dependencies} />
              <JsonSection icon={Plug} title="APIs" data={selected.apis} />
              <JsonSection icon={TestTube2} title="Tests" data={selected.tests} />
              <JsonSection icon={ShieldCheck} title="Security" data={selected.security} />
              <JsonSection icon={Package} title="Build" data={selected.build} />
              <JsonSection icon={Rocket} title="Release" data={selected.release} />
              <JsonSection icon={Server} title="Deployment" data={selected.deployment} />
              <JsonSection icon={AlertTriangle} title="Known Issues" data={selected.known_issues} />
              <JsonSection icon={GitPullRequest} title="Open Changes" data={selected.open_changes} />

              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <BookOpen className="h-3.5 w-3.5" />
                  Decisions
                </div>
                {selected.decisions.length > 0 ? (
                  <div className="space-y-2">
                    {selected.decisions.map((d) => (
                      <div key={d.id} className="fi-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-800">{d.decision}</span>
                          <span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200">{d.impact}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{d.rationale}</p>
                        <div className="text-xs text-slate-400 mt-1">By {d.decided_by} · {new Date(d.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">No decisions recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
