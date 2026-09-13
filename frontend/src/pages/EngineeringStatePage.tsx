import { useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ShieldAlert, Activity, GitBranch, Boxes, Plug, TestTube2,
  Package, Rocket, Server, AlertTriangle, GitPullRequest, BookOpen, X, Cpu,
  Search, Clock, FileText, Layers, CheckCircle2, XCircle, ArrowRight,
  ChevronRight, Zap, GitCommit,
} from 'lucide-react'
import { useEngineeringStates, useApplications, useStateHistory, useRetrieveContext } from '../hooks/useQueries'
import { PageHeader, PageTabs, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { EngineeringState, StateChangeRecord, EngineeringStateContext, EngineeringDecision, Application } from '../types'

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

function severityColor(severity: string): string {
  if (severity === 'warning') return 'text-amber-600 bg-amber-50 border-amber-200'
  if (severity === 'error') return 'text-red-600 bg-red-50 border-red-200'
  return 'text-slate-600 bg-slate-50 border-slate-200'
}

function changeTypeIcon(type: string): typeof Activity {
  const map: Record<string, typeof Activity> = {
    commit_changed: GitCommit,
    dependency_changed: Package,
    api_added: Plug,
    api_removed: Plug,
    test_coverage_changed: TestTube2,
    security_finding_added: ShieldAlert,
    security_finding_resolved: ShieldCheck,
    deployment_completed: Rocket,
    architecture_updated: Boxes,
    build_status_changed: Zap,
    version_changed: GitBranch,
    known_issue_added: AlertTriangle,
    known_issue_resolved: CheckCircle2,
    open_change_added: GitPullRequest,
    open_change_merged: GitPullRequest,
    decision_recorded: BookOpen,
    evidence_added: FileText,
    technology_added: Cpu,
    health_score_changed: Activity,
  }
  return map[type] || Activity
}

function JsonBlock({ data, label }: { data: unknown; label?: string }) {
  return (
    <div>
      {label && <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>}
      <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto max-h-80 text-slate-700">
{JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="fi-card p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-semibold ${color || 'text-slate-800'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function OverviewTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Health Score" value={state.health_score.toFixed(2)} color={healthColor(state.health_score * 100)} />
        <MetricCard label="Coverage" value={`${state.coverage_pct}%`} color={coverageColor(state.coverage_pct)} />
        <MetricCard label="Security Findings" value={state.security_findings} color="text-slate-700" />
        <MetricCard label="Open Vulns" value={state.open_vulnerabilities} color={state.open_vulnerabilities > 0 ? 'text-red-600' : 'text-emerald-600'} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="fi-card p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Key Metrics
          </div>
          <div className="space-y-1.5 text-sm text-slate-700">
            <div className="flex justify-between"><span>Repository</span><span className="font-mono text-xs">{truncateId(state.repository, 30)}</span></div>
            <div className="flex justify-between"><span>Branch</span><span className="font-mono text-xs">{state.branch}</span></div>
            <div className="flex justify-between"><span>Commit</span><span className="font-mono text-xs">{truncateId(state.commit, 12)}</span></div>
            <div className="flex justify-between"><span>Version</span><span className="font-mono text-xs">v{state.version}</span></div>
            <div className="flex justify-between"><span>Technologies</span><span>{state.technologies.length}</span></div>
            <div className="flex justify-between"><span>Dependencies</span><span>{state.dependencies.length}</span></div>
            <div className="flex justify-between"><span>APIs</span><span>{state.apis.length}</span></div>
            <div className="flex justify-between"><span>Known Issues</span><span>{state.known_issues.length}</span></div>
            <div className="flex justify-between"><span>Open Changes</span><span>{state.open_changes.length}</span></div>
            <div className="flex justify-between"><span>Decisions</span><span>{state.decisions.length}</span></div>
            <div className="flex justify-between"><span>Evidence Items</span><span>{state.evidence_ids.length}</span></div>
          </div>
        </div>

        <div className="fi-card p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" /> Technologies
          </div>
          <div className="flex flex-wrap gap-1.5">
            {state.technologies.map((t, i) => (
              <span key={i} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{t}</span>
            ))}
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mt-3">
            <Layers className="h-3.5 w-3.5" /> Architecture Pattern
          </div>
          <div className="text-sm text-slate-700">{(state.architecture as Record<string, unknown>).pattern as string || 'N/A'}</div>
          {Array.isArray((state.architecture as Record<string, unknown>).layers) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {((state.architecture as Record<string, unknown>).layers as string[]).map((l, i) => (
                <span key={i} className="fi-badge bg-slate-100 text-slate-600 border border-slate-200">{l}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="fi-card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <TestTube2 className="h-3.5 w-3.5" /> Test Summary
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex justify-between"><span>Total</span><span>{String((state.tests as Record<string, unknown>).total ?? 0)}</span></div>
            <div className="flex justify-between"><span>Passed</span><span className="text-emerald-600">{String((state.tests as Record<string, unknown>).passed ?? 0)}</span></div>
            <div className="flex justify-between"><span>Failed</span><span className="text-red-600">{String((state.tests as Record<string, unknown>).failed ?? 0)}</span></div>
            <div className="flex justify-between"><span>Skipped</span><span>{String((state.tests as Record<string, unknown>).skipped ?? 0)}</span></div>
          </div>
        </div>
        <div className="fi-card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Security Summary
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex justify-between"><span>SAST Findings</span><span>{String((state.security as Record<string, unknown>).sast_findings ?? 0)}</span></div>
            <div className="flex justify-between"><span>Dep Vulns</span><span>{String((state.security as Record<string, unknown>).dependency_vulnerabilities ?? 0)}</span></div>
            <div className="flex justify-between"><span>Last Scan</span><span className="text-xs">{(state.security as Record<string, unknown>).last_scan ? new Date(String((state.security as Record<string, unknown>).last_scan)).toLocaleDateString() : '—'}</span></div>
          </div>
        </div>
        <div className="fi-card p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Rocket className="h-3.5 w-3.5" /> Delivery Summary
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex justify-between"><span>Build Status</span><span className={String((state.build as Record<string, unknown>).status) === 'passing' ? 'text-emerald-600' : 'text-amber-600'}>{String((state.build as Record<string, unknown>).status ?? '—')}</span></div>
            <div className="flex justify-between"><span>Environment</span><span>{String((state.deployment as Record<string, unknown>).environment ?? '—')}</span></div>
            <div className="flex justify-between"><span>Strategy</span><span>{String((state.deployment as Record<string, unknown>).strategy ?? '—')}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArchitectureTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5 space-y-4">
      <JsonBlock data={state.architecture} label="Architecture Model" />
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> Technologies
        </div>
        <div className="flex flex-wrap gap-1.5">
          {state.technologies.map((t, i) => (
            <span key={i} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function RepositoryTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5 space-y-4">
      <div className="fi-card p-4 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
          <GitBranch className="h-3.5 w-3.5" /> Repository
        </div>
        <div className="space-y-1.5 text-sm text-slate-700">
          <div className="flex justify-between"><span>URL</span><span className="font-mono text-xs">{state.repository}</span></div>
          <div className="flex justify-between"><span>Branch</span><span className="font-mono text-xs">{state.branch}</span></div>
          <div className="flex justify-between"><span>Commit</span><span className="font-mono text-xs">{state.commit}</span></div>
          <div className="flex justify-between"><span>Version</span><span className="font-mono text-xs">v{state.version}</span></div>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <GitPullRequest className="h-3.5 w-3.5" /> Open Changes
        </div>
        {state.open_changes.length > 0 ? (
          <div className="space-y-2">
            {state.open_changes.map((ch, i) => (
              <div key={i} className="fi-card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-slate-800">{String(ch.branch)}</span>
                  <span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200">{String(ch.status)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{String(ch.files)} files changed</div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-slate-400">No open changes</span>
        )}
      </div>
    </div>
  )
}

function DependenciesTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5">
      {state.dependencies.length > 0 ? (
        <div className="fi-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Version</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.dependencies.map((dep, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-slate-800">{String(dep.name)}</td>
                  <td className="px-4 py-2 font-mono text-slate-600">{String(dep.version)}</td>
                  <td className="px-4 py-2"><span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200">{String(dep.type)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="No dependencies recorded" />
      )}
    </div>
  )
}

function APIsTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5">
      {state.apis.length > 0 ? (
        <div className="fi-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Method</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Path</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Authenticated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.apis.map((api, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <span className={`fi-badge border ${String(api.method) === 'GET' ? 'bg-blue-50 text-blue-700 border-blue-200' : String(api.method) === 'POST' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{String(api.method)}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-slate-800">{String(api.path)}</td>
                  <td className="px-4 py-2">
                    {api.authenticated ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="No APIs recorded" />
      )}
    </div>
  )
}

function TestingTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total Tests" value={String((state.tests as Record<string, unknown>).total ?? 0)} />
        <MetricCard label="Passed" value={String((state.tests as Record<string, unknown>).passed ?? 0)} color="text-emerald-600" />
        <MetricCard label="Failed" value={String((state.tests as Record<string, unknown>).failed ?? 0)} color="text-red-600" />
        <MetricCard label="Coverage" value={`${state.coverage_pct}%`} color={coverageColor(state.coverage_pct)} />
      </div>
      <JsonBlock data={state.tests} label="Test Details" />
    </div>
  )
}

function SecurityTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="SAST Findings" value={String((state.security as Record<string, unknown>).sast_findings ?? 0)} />
        <MetricCard label="Dep Vulnerabilities" value={String((state.security as Record<string, unknown>).dependency_vulnerabilities ?? 0)} />
        <MetricCard label="Open Vulns" value={state.open_vulnerabilities} color={state.open_vulnerabilities > 0 ? 'text-red-600' : 'text-emerald-600'} />
      </div>
      <JsonBlock data={state.security} label="Security Details" />
    </div>
  )
}

function DeliveryTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="fi-card p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
            <Zap className="h-3.5 w-3.5" /> Build
          </div>
          <JsonBlock data={state.build} />
        </div>
        <div className="fi-card p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
            <Rocket className="h-3.5 w-3.5" /> Release
          </div>
          <JsonBlock data={state.release} />
        </div>
      </div>
      <div className="fi-card p-4 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
          <Server className="h-3.5 w-3.5" /> Deployment
        </div>
        <JsonBlock data={state.deployment} />
      </div>
    </div>
  )
}

function RuntimeTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5">
      <JsonBlock data={state.runtime} label="Runtime State" />
    </div>
  )
}

function KnownIssuesTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5">
      {state.known_issues.length > 0 ? (
        <div className="space-y-2">
          {state.known_issues.map((issue, i) => (
            <div key={i} className="fi-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{String(issue.id)}: {String(issue.description)}</span>
                <div className="flex items-center gap-2">
                  <span className={`fi-badge border ${String(issue.severity) === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : String(issue.severity) === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{String(issue.severity)}</span>
                  <span className={`fi-badge border ${String(issue.status) === 'open' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{String(issue.status)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No known issues" icon={<CheckCircle2 className="h-10 w-10" />} />
      )}
    </div>
  )
}

function DecisionsTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5">
      {state.decisions.length > 0 ? (
        <div className="space-y-2">
          {state.decisions.map((d) => (
            <div key={d.id} className="fi-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{d.decision}</span>
                <span className={`fi-badge border ${d.impact === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' : d.impact === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{d.impact}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{d.rationale}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">By {d.decided_by}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</span>
                {d.tags.length > 0 && (
                  <div className="flex gap-1 ml-2">
                    {d.tags.map((t, i) => (
                      <span key={i} className="fi-badge bg-forgeiq-50 text-forgeiq-600 border border-forgeiq-200 text-xs">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No decisions recorded" />
      )}
    </div>
  )
}

function EvidenceTab({ state }: { state: EngineeringState }) {
  return (
    <div className="p-5">
      {state.evidence_ids.length > 0 ? (
        <div className="space-y-2">
          {state.evidence_ids.map((eid, i) => (
            <Link key={i} to={`/evidence`} className="block fi-card p-3 hover:border-forgeiq-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-800">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-xs">{truncateId(eid, 16)}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState message="No evidence linked" />
      )}
    </div>
  )
}

function HistoryTab({ history, loading }: { history: StateChangeRecord[]; loading: boolean }) {
  if (loading) return <LoadingSpinner />
  if (history.length === 0) return <EmptyState message="No state changes recorded" icon={<Clock className="h-10 w-10" />} />

  return (
    <div className="p-5">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-3">
          {history.map((change) => {
            const Icon = changeTypeIcon(change.change_type)
            return (
              <div key={change.id} className="relative pl-10">
                <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-forgeiq-400 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-forgeiq-500" />
                </div>
                <div className="fi-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-800">{change.description}</span>
                    </div>
                    <span className={`fi-badge border text-xs ${severityColor(change.severity)}`}>{change.category}</span>
                  </div>
                  {(change.before_value || change.after_value) && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                      {change.before_value && <span className="font-mono">{change.before_value}</span>}
                      {change.before_value && change.after_value && <ArrowRight className="h-3 w-3" />}
                      {change.after_value && <span className="font-mono">{change.after_value}</span>}
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">{new Date(change.created_at).toLocaleString()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ContextTab({ state }: { state: EngineeringState }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<EngineeringStateContext | null>(null)
  const retrieveCtx = useRetrieveContext()

  const handleSearch = () => {
    retrieveCtx.mutate(
      { application_id: state.application_id, query },
      { onSuccess: (data: EngineeringStateContext) => setResult(data) }
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="fi-card p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <Search className="h-3.5 w-3.5" /> Context Retrieval
        </div>
        <p className="text-sm text-slate-600 mb-3">
          Retrieve relevant Engineering State context for an agent. Enter a natural-language query to find matching APIs, dependencies, tests, architecture, recent changes, known issues, and evidence.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. payment service context"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-forgeiq-400 focus:border-forgeiq-400"
          />
          <button
            onClick={handleSearch}
            disabled={retrieveCtx.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 transition-colors disabled:opacity-50"
          >
            {retrieveCtx.isPending ? 'Retrieving...' : 'Retrieve'}
          </button>
        </div>
      </div>

      {retrieveCtx.isError && (
        <div className="fi-card p-3 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">Failed to retrieve context. Please try again.</p>
        </div>
      )}

      {result && !result.found && (
        <div className="fi-card p-3">
          <p className="text-sm text-slate-500">No engineering state found for this application.</p>
        </div>
      )}

      {result && result.found && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Version" value={result.version} />
            <MetricCard label="Health" value={result.health_score.toFixed(2)} color={healthColor(result.health_score * 100)} />
            <MetricCard label="Coverage" value={`${result.coverage_pct}%`} color={coverageColor(result.coverage_pct)} />
            <MetricCard label="APIs Found" value={result.relevant_apis.length} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="fi-card p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Plug className="h-3.5 w-3.5" /> Relevant APIs ({result.relevant_apis.length})
              </div>
              {result.relevant_apis.length > 0 ? (
                <div className="space-y-1">
                  {result.relevant_apis.map((api: Record<string, unknown>, i: number) => (
                    <div key={i} className="text-sm text-slate-700 font-mono">{String(api.method)} {String(api.path)}</div>
                  ))}
                </div>
              ) : <span className="text-sm text-slate-400">No matching APIs</span>}
            </div>
            <div className="fi-card p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Relevant Dependencies ({result.relevant_dependencies.length})
              </div>
              {result.relevant_dependencies.length > 0 ? (
                <div className="space-y-1">
                  {result.relevant_dependencies.map((dep: Record<string, unknown>, i: number) => (
                    <div key={i} className="text-sm text-slate-700">{String(dep.name)} <span className="text-slate-400 font-mono text-xs">{String(dep.version)}</span></div>
                  ))}
                </div>
              ) : <span className="text-sm text-slate-400">No matching dependencies</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="fi-card p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Known Issues ({result.relevant_known_issues.length})
              </div>
              {result.relevant_known_issues.length > 0 ? (
                <div className="space-y-1">
                  {result.relevant_known_issues.map((iss: Record<string, unknown>, i: number) => (
                    <div key={i} className="text-sm text-slate-700">{String(iss.description)}</div>
                  ))}
                </div>
              ) : <span className="text-sm text-slate-400">No matching issues</span>}
            </div>
            <div className="fi-card p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <GitPullRequest className="h-3.5 w-3.5" /> Open Changes ({result.relevant_open_changes.length})
              </div>
              {result.relevant_open_changes.length > 0 ? (
                <div className="space-y-1">
                  {result.relevant_open_changes.map((ch: Record<string, unknown>, i: number) => (
                    <div key={i} className="text-sm text-slate-700 font-mono">{String(ch.branch)} <span className="text-slate-400 text-xs">({String(ch.status)})</span></div>
                  ))}
                </div>
              ) : <span className="text-sm text-slate-400">No matching changes</span>}
            </div>
          </div>

          <div className="fi-card p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Recent State Changes ({result.recent_changes.length})
            </div>
            <div className="space-y-1">
              {result.recent_changes.map((c: { change_type: string; description: string; severity: string; timestamp: string }, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{c.description}</span>
                  <span className="text-xs text-slate-400">{new Date(c.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

          {result.relevant_evidence.length > 0 && (
            <div className="fi-card p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Relevant Evidence ({result.relevant_evidence.length})
              </div>
              <div className="space-y-1">
                {result.relevant_evidence.map((ev: { id: string; type: string; summary: string; timestamp: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{ev.summary}</span>
                    <span className="text-xs text-slate-400">{new Date(ev.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.relevant_decisions.length > 0 && (
            <div className="fi-card p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Relevant Decisions ({result.relevant_decisions.length})
              </div>
              <div className="space-y-1">
                {result.relevant_decisions.map((d: EngineeringDecision, i: number) => (
                  <div key={i} className="text-sm text-slate-700">{d.decision} <span className="text-xs text-slate-400">— {d.decided_by}</span></div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="fi-card p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Security
              </div>
              <div className="text-sm text-slate-700">{result.security_summary.findings} findings, {result.security_summary.open_vulnerabilities} vulns</div>
            </div>
            <div className="fi-card p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Build
              </div>
              <div className="text-sm text-slate-700">{result.build_summary.status || '—'}</div>
            </div>
            <div className="fi-card p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" /> Deployment
              </div>
              <div className="text-sm text-slate-700">{result.deployment_summary.environment || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'repository', label: 'Repository' },
  { key: 'dependencies', label: 'Dependencies' },
  { key: 'apis', label: 'APIs' },
  { key: 'testing', label: 'Testing' },
  { key: 'security', label: 'Security' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'issues', label: 'Known Issues' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'history', label: 'History' },
  { key: 'context', label: 'Context' },
]

export default function EngineeringStatePage() {
  const { data: states, isLoading } = useEngineeringStates()
  const { data: applications } = useApplications()
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Engineering State" description="Continuously maintained understanding of applications" />
        <LoadingSpinner />
      </div>
    )
  }

  const items: EngineeringState[] = states ?? []
  const appMap = new Map<string, Application>((applications ?? []).map((a: Application) => [a.id, a]))

  const selectedState = selectedAppId ? items.find((s) => s.application_id === selectedAppId) : null

  if (!selectedState) {
    return (
      <div className="fi-card">
        <PageHeader
          title="Engineering State"
          description="Continuously maintained understanding of applications"
          actions={<span className="text-xs text-slate-500">{items.length} states</span>}
        />
        {items.length === 0 ? (
          <EmptyState message="No engineering states available" />
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((s: EngineeringState) => {
              const app = appMap.get(s.application_id)
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedAppId(s.application_id); setActiveTab('overview') }}
                  className="text-left fi-card hover:border-forgeiq-300 hover:shadow-sm transition-all p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Application</div>
                      <Link
                        to={`/applications/${s.application_id}`}
                        onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
                        className="font-medium text-sm text-forgeiq-600 hover:underline"
                      >
                        {app?.display_name || truncateId(s.application_id)}
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
                      <div className={`text-lg font-semibold ${healthColor(s.health_score * 100)}`}>{s.health_score.toFixed(2)}</div>
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
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3.5 w-3.5" /> {s.change_history_ids.length} changes
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <GitBranch className="h-3 w-3" />
                    <span className="font-mono">{s.branch}</span>
                    <span className="text-slate-300">@</span>
                    <span className="font-mono">{truncateId(s.commit, 7)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const app = appMap.get(selectedState.application_id)

  return (
    <div className="fi-card">
      <PageHeader
        title="Engineering State"
        description={app?.display_name || 'Application engineering state'}
        breadcrumbs={[
          { label: 'Engineering States', to: '/engineering-state' },
          { label: app?.display_name || truncateId(selectedState.application_id) },
        ]}
        actions={
          <button
            onClick={() => setSelectedAppId(null)}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
          >
            <X className="h-4 w-4" /> Close
          </button>
        }
      />
      <PageTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && <OverviewTab state={selectedState} />}
      {activeTab === 'architecture' && <ArchitectureTab state={selectedState} />}
      {activeTab === 'repository' && <RepositoryTab state={selectedState} />}
      {activeTab === 'dependencies' && <DependenciesTab state={selectedState} />}
      {activeTab === 'apis' && <APIsTab state={selectedState} />}
      {activeTab === 'testing' && <TestingTab state={selectedState} />}
      {activeTab === 'security' && <SecurityTab state={selectedState} />}
      {activeTab === 'delivery' && <DeliveryTab state={selectedState} />}
      {activeTab === 'runtime' && <RuntimeTab state={selectedState} />}
      {activeTab === 'issues' && <KnownIssuesTab state={selectedState} />}
      {activeTab === 'decisions' && <DecisionsTab state={selectedState} />}
      {activeTab === 'evidence' && <EvidenceTab state={selectedState} />}
      {activeTab === 'history' && <HistoryTabWrapper state={selectedState} />}
      {activeTab === 'context' && <ContextTab state={selectedState} />}
    </div>
  )
}

function HistoryTabWrapper({ state }: { state: EngineeringState }) {
  const { data: history, isLoading } = useStateHistory(state.application_id)
  return <HistoryTab history={history ?? []} loading={isLoading} />
}
