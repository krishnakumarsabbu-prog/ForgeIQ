import { useState, Fragment } from 'react'
import {
  ChevronRight, Activity, Heart, ShieldCheck, Rocket, RotateCcw,
  CheckCircle2, XCircle, AlertTriangle, Clock, Plus, FileText,
  Server, Package, ArrowRight, Loader2,
} from 'lucide-react'
import { useDeployments, useEnvironments, useArtifacts, useApplications,
         useCreateDeployment, useRollbackDeployment, useDeploymentStrategies } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Deployment, VerificationCheck, PrecheckResult, PostcheckResult, Environment, Artifact, Application } from '../types'

function truncateId(id: string, len = 8): string {
  return id ? `${id.slice(0, len)}…` : '—'
}

function formatTime(ts?: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function checkIcon(status: string) {
  switch (status) {
    case 'passed': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />
    case 'pending': return <Clock className="h-4 w-4 text-slate-400" />
    case 'skipped': return <Clock className="h-4 w-4 text-slate-300" />
    default: return <Clock className="h-4 w-4 text-slate-400" />
  }
}

function checkBadgeColor(status: string): string {
  switch (status) {
    case 'passed': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'failed': return 'bg-red-50 text-red-700 border-red-200'
    case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'pending': return 'bg-slate-50 text-slate-500 border-slate-200'
    case 'skipped': return 'bg-slate-50 text-slate-400 border-slate-200'
    default: return 'bg-slate-50 text-slate-500 border-slate-200'
  }
}

function StageIndicator({ status }: { status: string }) {
  const stages = [
    { key: 'precheck', label: 'Prechecks', icon: ShieldCheck },
    { key: 'deploy', label: 'Deploy', icon: Rocket },
    { key: 'postcheck', label: 'Postchecks', icon: ShieldCheck },
    { key: 'verify', label: 'Verify', icon: CheckCircle2 },
  { key: 'rollback', label: 'Rollback', icon: RotateCcw },
  ]

  const isActive = (stageKey: string) => {
    const s = status.toLowerCase()
    if (s === 'completed' || s === 'verified') return 'done'
    if (s === 'rolled_back' || s === 'rolling_back') {
      if (stageKey === 'rollback') return s === 'rolling_back' ? 'active' : 'done'
      return 'done'
    }
    if (s.startsWith('precheck')) return stageKey === 'precheck' ? (s.includes('failed') ? 'failed' : 'active') : 'pending'
    if (s.startsWith('deploying')) return stageKey === 'precheck' ? 'done' : stageKey === 'deploy' ? 'active' : 'pending'
    if (s.startsWith('deployed')) return stageKey === 'precheck' || stageKey === 'deploy' ? 'done' : stageKey === 'postcheck' ? 'active' : 'pending'
    if (s.startsWith('postcheck')) return stageKey === 'precheck' || stageKey === 'deploy' ? 'done' : stageKey === 'postcheck' ? (s.includes('failed') ? 'failed' : 'active') : 'pending'
    if (s.startsWith('verifying')) return stageKey === 'verify' ? 'active' : 'done'
    if (s.startsWith('verification_failed')) return stageKey === 'verify' ? 'failed' : 'done'
    if (s === 'failed') return stageKey === 'precheck' || stageKey === 'deploy' ? 'failed' : 'pending'
    return 'pending'
  }

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => {
        const state = isActive(stage.key)
        const Icon = stage.icon
        const color = state === 'done' ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
          : state === 'active' ? 'text-blue-600 bg-blue-50 border-blue-200'
          : state === 'failed' ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-slate-400 bg-slate-50 border-slate-200'
        return (
          <div key={stage.key} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${color}`} title={stage.label}>
              <Icon className="h-3.5 w-3.5" />
              {state === 'active' && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            {i < stages.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300 mx-0.5" />}
          </div>
        )
      })}
    </div>
  )
}

function VerificationChecks({ checks }: { checks: VerificationCheck[] }) {
  if (!checks || checks.length === 0) return <span className="text-sm text-slate-400">No verification checks recorded</span>
  return (
    <div className="space-y-2">
      {checks.map((c, i) => (
        <div key={i} className="fi-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {checkIcon(c.status)}
              <span className="text-sm font-semibold text-slate-800 capitalize">{c.verification_type.replace(/_/g, ' ')}</span>
            </div>
            <span className={`fi-badge ${checkBadgeColor(c.status)}`}>{c.status}</span>
          </div>
          <p className="text-xs text-slate-600 mb-2">{c.message}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Expected</span>
              <pre className="font-mono text-slate-700 mt-0.5 bg-slate-50 p-1.5 rounded text-[11px] overflow-x-auto">{JSON.stringify(c.expected_state, null, 1)}</pre>
            </div>
            <div>
              <span className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Observed</span>
              <pre className="font-mono text-slate-700 mt-0.5 bg-slate-50 p-1.5 rounded text-[11px] overflow-x-auto">{JSON.stringify(c.observed_state, null, 1)}</pre>
            </div>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-400">{c.duration_ms}ms</div>
        </div>
      ))}
    </div>
  )
}

function CheckList({ checks, label }: { checks: PrecheckResult[] | PostcheckResult[]; label: string }) {
  if (!checks || checks.length === 0) return null
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</div>
      <div className="space-y-1">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {checkIcon(c.status)}
            <span className="font-medium text-slate-700">{c.name}</span>
            <span className="text-slate-400">— {c.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeploymentsPage() {
  const { data: deployments, isLoading } = useDeployments()
  const { data: environments } = useEnvironments()
  const { data: artifacts } = useArtifacts()
  const { data: applications } = useApplications()
  const { data: strategies } = useDeploymentStrategies()
  const createDeployment = useCreateDeployment()
  const rollbackDeployment = useRollbackDeployment()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [createForm, setCreateForm] = useState({
    application_id: '',
    environment_id: '',
    artifact_id: '',
    version: '',
    strategy: 'rolling',
    auto_verify: true,
    auto_rollback_on_failure: true,
  })

  const items = deployments ?? []
  const envMap = new Map<string, Environment>((environments ?? []).map((e: Environment) => [e.id, e] as [string, Environment]))
  const appMap = new Map<string, Application>((applications ?? []).map((a: Application) => [a.id, a] as [string, Application]))
  const artifactMap = new Map<string, Artifact>((artifacts ?? []).map((a: Artifact) => [a.id, a] as [string, Artifact]))

  function openDeploymentDetail(d: Deployment) {
    setSelectedDeployment(d)
    setDrawerOpen(true)
  }

  function handleCreate() {
    if (!createForm.application_id || !createForm.environment_id) return
    createDeployment.mutate({
      application_id: createForm.application_id,
      environment_id: createForm.environment_id,
      artifact_id: createForm.artifact_id || undefined,
      version: createForm.version || undefined,
      strategy: createForm.strategy,
      auto_verify: createForm.auto_verify,
      auto_rollback_on_failure: createForm.auto_rollback_on_failure,
    }, {
      onSuccess: () => {
        setShowCreate(false)
        setCreateForm({ application_id: '', environment_id: '', artifact_id: '', version: '', strategy: 'rolling', auto_verify: true, auto_rollback_on_failure: true })
      },
    })
  }

  function handleRollback(d: Deployment) {
    rollbackDeployment.mutate({ id: d.id, body: { reason: 'Manual rollback from deployments page' } })
  }

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Deployments" description="Deployment lifecycle: precheck, deploy, postcheck, verify, rollback" />
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="fi-card">
      <PageHeader
        title="Deployments"
        description="Deployment lifecycle: precheck, deploy, postcheck, verify, rollback"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{items.length} deployments</span>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forgeiq-600 rounded hover:bg-forgeiq-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Deployment
            </button>
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState message="No deployments found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th className="w-6" />
                <th>Application</th>
                <th>Environment</th>
                <th>Version</th>
                <th>Status</th>
                <th>Strategy</th>
                <th>Stage Progress</th>
                <th>Verified</th>
                <th>Started</th>
                <th>Completed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d: Deployment) => {
                const env = envMap.get(d.environment_id)
                const app = appMap.get(d.application_id)
                return (
                  <Fragment key={d.id}>
                    <tr
                      onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="text-slate-400">
                        <ChevronRight className={`h-4 w-4 transition-transform ${expanded === d.id ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="text-sm text-slate-700">{app?.display_name ?? truncateId(d.application_id)}</td>
                      <td className="text-sm text-slate-600">{env?.display_name ?? truncateId(d.environment_id)}</td>
                      <td className="font-mono text-xs text-slate-700">{d.version}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td className="text-xs text-slate-600 capitalize">{d.strategy.replace(/-/g, ' ')}</td>
                      <td><StageIndicator status={d.status} /></td>
                      <td>
                        {d.verified ? (
                          <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">verified</span>
                        ) : (
                          <span className="fi-badge bg-slate-50 text-slate-500 border border-slate-200">unverified</span>
                        )}
                      </td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{formatTime(d.started_at)}</td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{formatTime(d.completed_at)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeploymentDetail(d) }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                            title="View details"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          {d.rollback_supported && d.status !== 'rolled_back' && d.status !== 'rolling_back' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRollback(d) }}
                              className="p-1 rounded hover:bg-amber-100 text-slate-500 hover:text-amber-700"
                              title="Rollback deployment"
                              disabled={rollbackDeployment.isPending}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === d.id && (
                      <tr className="bg-slate-50">
                        <td />
                        <td colSpan={10} className="px-6 py-3">
                          <div className="grid grid-cols-2 gap-4">
                            <CheckList checks={d.prechecks} label="Prechecks" />
                            <CheckList checks={d.postchecks} label="Postchecks" />
                          </div>
                          {d.verification && d.verification.checks.length > 0 && (
                            <div className="mt-4">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                <Heart className="h-3.5 w-3.5" />
                                Verification Results ({d.verification.passed} passed, {d.verification.failed} failed, {d.verification.warning} warning)
                              </div>
                              <VerificationChecks checks={d.verification.checks} />
                            </div>
                          )}
                          {d.rollback_result && (
                            <div className="mt-4 fi-card p-3 border-amber-200 bg-amber-50">
                              <div className="flex items-center gap-2 mb-1">
                                <RotateCcw className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-semibold text-amber-800">Rollback: {d.rollback_result.status}</span>
                              </div>
                              <p className="text-xs text-amber-700">{d.rollback_result.message}</p>
                            </div>
                          )}
                          {d.error_message && (
                            <div className="mt-3 fi-card p-3 border-red-200 bg-red-50">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-700">{d.error_message}</span>
                              </div>
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                            <span>Rollback supported: <strong className="text-slate-700">{d.rollback_supported ? 'Yes' : 'No'}</strong></span>
                            {d.artifact_id && <span>Artifact: <code className="font-mono">{artifactMap.get(d.artifact_id)?.name ?? truncateId(d.artifact_id)}</code></span>}
                            {d.previous_deployment_id && <span>Previous: <code className="font-mono">{truncateId(d.previous_deployment_id)}</code></span>}
                            {d.evidence_ids.length > 0 && <span>Evidence: {d.evidence_ids.length} records</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Deployment Detail Drawer */}
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Deployment Details"
        subtitle={selectedDeployment ? `${selectedDeployment.version} via ${selectedDeployment.strategy}` : ''}
        width="560px"
        footer={
          selectedDeployment && selectedDeployment.rollback_supported && selectedDeployment.status !== 'rolled_back' ? (
            <button
              onClick={() => handleRollback(selectedDeployment)}
              disabled={rollbackDeployment.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 disabled:opacity-50"
            >
              {rollbackDeployment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Rollback Deployment
            </button>
          ) : undefined
        }
      >
        {selectedDeployment && (
          <div className="p-4 space-y-4">
            <DetailsPanel
              items={[
                { label: 'Status', value: <StatusBadge status={selectedDeployment.status} /> },
                { label: 'Strategy', value: <span className="capitalize">{selectedDeployment.strategy.replace(/-/g, ' ')}</span> },
                { label: 'Version', value: <code className="font-mono text-sm">{selectedDeployment.version}</code> },
                { label: 'Verified', value: selectedDeployment.verified ? 'Yes' : 'No' },
                { label: 'Application', value: appMap.get(selectedDeployment.application_id)?.display_name ?? truncateId(selectedDeployment.application_id) },
                { label: 'Environment', value: envMap.get(selectedDeployment.environment_id)?.display_name ?? truncateId(selectedDeployment.environment_id) },
                { label: 'Artifact', value: selectedDeployment.artifact_id ? (artifactMap.get(selectedDeployment.artifact_id)?.name ?? truncateId(selectedDeployment.artifact_id)) : '—' },
                { label: 'Rollback Supported', value: selectedDeployment.rollback_supported ? 'Yes' : 'No' },
                { label: 'Started', value: formatTime(selectedDeployment.started_at) },
                { label: 'Completed', value: formatTime(selectedDeployment.completed_at) },
              ]}
            />

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stage Progress</div>
              <StageIndicator status={selectedDeployment.status} />
            </div>

            {selectedDeployment.prechecks.length > 0 && (
              <CheckList checks={selectedDeployment.prechecks} label="Prechecks" />
            )}
            {selectedDeployment.postchecks.length > 0 && (
              <CheckList checks={selectedDeployment.postchecks} label="Postchecks" />
            )}

            {selectedDeployment.verification && selectedDeployment.verification.checks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <Activity className="h-3.5 w-3.5" />
                  Verification ({selectedDeployment.verification.overall_status})
                </div>
                <VerificationChecks checks={selectedDeployment.verification.checks} />
              </div>
            )}

            {selectedDeployment.rollback_result && (
              <div className="fi-card p-3 border-amber-200 bg-amber-50">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Rollback Result</span>
                </div>
                <p className="text-xs text-amber-700">{selectedDeployment.rollback_result.message}</p>
                <p className="text-xs text-amber-600 mt-1">Previous version: {selectedDeployment.rollback_result.previous_version}</p>
              </div>
            )}

            {selectedDeployment.error_message && (
              <div className="fi-card p-3 border-red-200 bg-red-50">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">{selectedDeployment.error_message}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </SideDrawer>

      {/* Create Deployment Drawer */}
      <SideDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Deployment"
        subtitle="Deploy artifact to environment with precheck, postcheck, and verification"
        width="480px"
        footer={
          <button
            onClick={handleCreate}
            disabled={createDeployment.isPending || !createForm.application_id || !createForm.environment_id}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forgeiq-600 rounded hover:bg-forgeiq-700 disabled:opacity-50"
          >
            {createDeployment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            Deploy
          </button>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Application</label>
            <select
              value={createForm.application_id}
              onChange={e => setCreateForm({ ...createForm, application_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            >
              <option value="">Select application…</option>
              {(applications ?? []).map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Environment</label>
            <select
              value={createForm.environment_id}
              onChange={e => setCreateForm({ ...createForm, environment_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            >
              <option value="">Select environment…</option>
              {(environments ?? [])
                .filter(e => !createForm.application_id || e.application_id === createForm.application_id)
                .map(e => <option key={e.id} value={e.id}>{e.display_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Artifact</label>
            <select
              value={createForm.artifact_id}
              onChange={e => setCreateForm({ ...createForm, artifact_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            >
              <option value="">Auto-select latest…</option>
              {(artifacts ?? [])
                .filter(a => !createForm.application_id || a.application_id === createForm.application_id)
                .map(a => <option key={a.id} value={a.id}>{a.name} ({a.version})</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Version</label>
            <input
              type="text"
              value={createForm.version}
              onChange={e => setCreateForm({ ...createForm, version: e.target.value })}
              placeholder="Leave empty for app current version"
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Strategy</label>
            <select
              value={createForm.strategy}
              onChange={e => setCreateForm({ ...createForm, strategy: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            >
              {(strategies ?? []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={createForm.auto_verify}
                onChange={e => setCreateForm({ ...createForm, auto_verify: e.target.checked })}
                className="rounded border-slate-300"
              />
              Auto-verify after deployment
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={createForm.auto_rollback_on_failure}
                onChange={e => setCreateForm({ ...createForm, auto_rollback_on_failure: e.target.checked })}
                className="rounded border-slate-300"
              />
              Auto-rollback on verification failure
            </label>
          </div>

          {createDeployment.isError && (
            <div className="fi-card p-3 border-red-200 bg-red-50">
              <span className="text-sm text-red-700">Failed to create deployment. Check inputs and try again.</span>
            </div>
          )}
        </div>
      </SideDrawer>
    </div>
  )
}
