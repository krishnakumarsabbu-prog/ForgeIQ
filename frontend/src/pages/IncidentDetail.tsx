import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Activity, Search, Shield, Server, CheckCircle2,
  XCircle, Clock, Loader2, ArrowRight, RotateCcw, FileText,
  ChevronRight, Bug, Cpu, Database, Network, Settings, Zap,
} from 'lucide-react'
import {
  useIncident, useApplications, useEnvironments,
  useAnalyzeIncident, useGenerateRemediationPlan, useExecuteRemediation,
  useApproveRemediation, useRollbackIncidentFix, useVerifyIncidentFix,
  useCloseIncident, useIncidentEvidence,
} from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Incident, Symptom, RemediationStep, IncidentTimelineEntry } from '../types'

function severityColor(sev: string): string {
  switch (sev) {
    case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200'
    case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'LOW': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    default: return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function formatTime(ts?: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function rootCauseIcon(category: string) {
  switch (category) {
    case 'code_defect': return <Bug className="h-4 w-4 text-red-500" />
    case 'configuration_error': return <Settings className="h-4 w-4 text-amber-500" />
    case 'dependency_failure': return <Cpu className="h-4 w-4 text-orange-500" />
    case 'database': return <Database className="h-4 w-4 text-blue-500" />
    case 'network': return <Network className="h-4 w-4 text-purple-500" />
    case 'resource_exhaustion': return <Zap className="h-4 w-4 text-amber-500" />
    case 'infrastructure': return <Server className="h-4 w-4 text-slate-500" />
    case 'security': return <Shield className="h-4 w-4 text-red-500" />
    default: return <AlertTriangle className="h-4 w-4 text-slate-400" />
  }
}

function stepStatusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'running': return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
    case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
    case 'pending': return <Clock className="h-4 w-4 text-slate-400" />
    default: return <Clock className="h-4 w-4 text-slate-400" />
  }
}

function timelineIcon(event: string) {
  switch (event) {
    case 'created': return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
    case 'acknowledged': return <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
    case 'analysis_started': return <Search className="h-3.5 w-3.5 text-blue-500" />
    case 'root_cause_identified': return <Bug className="h-3.5 w-3.5 text-amber-500" />
    case 'remediation_planned': return <FileText className="h-3.5 w-3.5 text-forgeiq-500" />
    case 'remediation_started': return <Activity className="h-3.5 w-3.5 text-blue-500" />
    case 'resolved': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    case 'rollback_started':
    case 'rollback_completed': return <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
    case 'verification_failed': return <XCircle className="h-3.5 w-3.5 text-red-500" />
    case 'escalated': return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
    case 'closed': return <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
    case 'approved': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    case 'retry': return <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
    default: return <Clock className="h-3.5 w-3.5 text-slate-400" />
  }
}

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: incident, isLoading } = useIncident(id || '')
  const { data: applications } = useApplications()
  const { data: environments } = useEnvironments()
  const { data: evidence } = useIncidentEvidence(id || '')

  const analyzeIncident = useAnalyzeIncident()
  const generatePlan = useGenerateRemediationPlan()
  const executeRemediation = useExecuteRemediation()
  const approveRemediation = useApproveRemediation()
  const rollbackFix = useRollbackIncidentFix()
  const verifyFix = useVerifyIncidentFix()
  const closeIncident = useCloseIncident()

  const [activeTab, setActiveTab] = useState('overview')
  const [showClose, setShowClose] = useState(false)
  const [closeForm, setCloseForm] = useState({ closed_by: '', reason: '' })
  const [showApprove, setShowApprove] = useState(false)
  const [approveForm, setApproveForm] = useState({ approved_by: '', reason: '' })

  if (isLoading || !incident) {
    return (
      <div className="fi-card">
        <PageHeader title="Incident Details" breadcrumbs={[{ label: 'Incidents', to: '/incidents' }, { label: 'Detail' }]} />
        <LoadingSpinner />
      </div>
    )
  }

  const inc = incident as Incident
  const appMap = new Map((applications ?? []).map(a => [a.id, a.display_name] as [string, string]))
  const envMap = new Map((environments ?? []).map(e => [e.id, e.display_name] as [string, string]))

  const canAnalyze = !inc.root_cause && ['detected', 'investigating'].includes(inc.status)
  const canGeneratePlan = inc.root_cause && !inc.remediation_plan && ['root_cause_identified', 'investigating'].includes(inc.status)
  const canExecute = inc.remediation_plan && ['remediation_planned', 'remediation_in_progress'].includes(inc.status)
  const canApprove = inc.status === 'awaiting_approval'
  const canRollback = inc.remediation_deployment_id && !['rolled_back', 'resolved', 'closed'].includes(inc.status)
  const canVerify = inc.remediation_deployment_id && !['resolved', 'closed', 'verifying'].includes(inc.status)
  const canClose = !['closed'].includes(inc.status)

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'symptoms', label: 'Symptoms', count: inc.symptoms.length },
    { key: 'root_cause', label: 'Root Cause' },
    { key: 'remediation', label: 'Remediation', count: inc.remediation_plan?.steps.length ?? 0 },
    { key: 'timeline', label: 'Timeline', count: inc.timeline.length },
    { key: 'evidence', label: 'Evidence', count: evidence?.length ?? 0 },
  ]

  return (
    <div className="fi-card">
      <PageHeader
        title={inc.title}
        description={inc.description}
        breadcrumbs={[{ label: 'Incidents', to: '/incidents' }, { label: inc.id.slice(0, 12) }]}
        actions={
          <div className="flex items-center gap-2">
            <span className={`fi-badge ${severityColor(inc.severity)}`}>{inc.severity}</span>
            <StatusBadge status={inc.status} />
          </div>
        }
      />

      <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-forgeiq-600 text-forgeiq-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 text-xs text-slate-400">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="fi-card p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Incident Details</h3>
                <DetailsPanel items={[
                  { label: 'ID', value: <code className="font-mono text-xs">{inc.id}</code> },
                  { label: 'Severity', value: <span className={`fi-badge ${severityColor(inc.severity)}`}>{inc.severity}</span> },
                  { label: 'Status', value: <StatusBadge status={inc.status} /> },
                  { label: 'Source', value: <span className="capitalize">{inc.source.replace(/_/g, ' ')}</span> },
                  { label: 'Application', value: appMap.get(inc.application_id) ?? '—' },
                  { label: 'Environment', value: envMap.get(inc.environment_id) ?? '—' },
                  { label: 'Component', value: <code className="font-mono text-xs">{inc.component || '—'}</code> },
                  { label: 'Assigned To', value: inc.assigned_to || '—' },
                  { label: 'Detected', value: formatTime(inc.detected_at) },
                  { label: 'Acknowledged', value: formatTime(inc.acknowledged_at) },
                  { label: 'Resolved', value: formatTime(inc.resolved_at) },
                  { label: 'Closed', value: formatTime(inc.closed_at) },
                ]} />
              </div>

              <div className="fi-card p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Remediation Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${inc.root_cause ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {inc.root_cause ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <span className={inc.root_cause ? 'text-slate-800' : 'text-slate-400'}>Root Cause Analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${inc.remediation_plan ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {inc.remediation_plan ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <span className={inc.remediation_plan ? 'text-slate-800' : 'text-slate-400'}>Remediation Plan</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['resolved', 'closed'].includes(inc.status) ? 'bg-emerald-100 text-emerald-700' : inc.status === 'remediation_in_progress' || inc.status === 'deploying_fix' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                      {['resolved', 'closed'].includes(inc.status) ? <CheckCircle2 className="h-4 w-4" /> : inc.status === 'remediation_in_progress' || inc.status === 'deploying_fix' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <span className={['resolved', 'closed'].includes(inc.status) ? 'text-slate-800' : 'text-slate-400'}>Fix Deployed & Verified</span>
                  </div>
                  {inc.retry_count > 0 && (
                    <div className="text-xs text-amber-600 mt-2">
                      Retry count: {inc.retry_count}/{inc.max_retries}
                    </div>
                  )}
                  {inc.remediation_deployment_id && (
                    <div className="text-xs text-slate-500 mt-2">
                      Deployment: <code className="font-mono">{inc.remediation_deployment_id.slice(0, 12)}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="fi-card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actions</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {canAnalyze && (
                  <button
                    onClick={() => analyzeIncident.mutate({ id: inc.id })}
                    disabled={analyzeIncident.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {analyzeIncident.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Analyze Incident
                  </button>
                )}
                {canGeneratePlan && (
                  <button
                    onClick={() => generatePlan.mutate({ id: inc.id })}
                    disabled={generatePlan.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forgeiq-600 rounded hover:bg-forgeiq-700 disabled:opacity-50"
                  >
                    {generatePlan.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    Generate Remediation Plan
                  </button>
                )}
                {canExecute && (
                  <button
                    onClick={() => executeRemediation.mutate({ id: inc.id })}
                    disabled={executeRemediation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {executeRemediation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                    Execute Remediation
                  </button>
                )}
                {canApprove && (
                  <button
                    onClick={() => setShowApprove(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve Remediation
                  </button>
                )}
                {canVerify && (
                  <button
                    onClick={() => verifyFix.mutate({ id: inc.id })}
                    disabled={verifyFix.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50"
                  >
                    {verifyFix.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                    Verify Fix
                  </button>
                )}
                {canRollback && (
                  <button
                    onClick={() => rollbackFix.mutate({ id: inc.id, body: { reason: 'Manual rollback from incident detail' } })}
                    disabled={rollbackFix.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 disabled:opacity-50"
                  >
                    {rollbackFix.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Rollback Fix
                  </button>
                )}
                {canClose && (
                  <button
                    onClick={() => setShowClose(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Close Incident
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'symptoms' && (
          <div className="space-y-3">
            {inc.symptoms.length === 0 ? (
              <EmptyState message="No symptoms recorded" />
            ) : (
              inc.symptoms.map((s: Symptom) => (
                <div key={s.id} className="fi-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${s.severity === 'CRITICAL' ? 'text-red-500' : s.severity === 'HIGH' ? 'text-orange-500' : 'text-amber-500'}`} />
                      <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                    </div>
                    <span className={`fi-badge ${severityColor(s.severity)}`}>{s.severity}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{s.message}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Component</span>
                      <p className="text-slate-700 font-mono mt-0.5">{s.component || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Metric</span>
                      <p className="text-slate-700 mt-0.5">{s.metric || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Threshold / Observed</span>
                      <p className="text-slate-700 mt-0.5">
                        <span className="text-emerald-600">{s.threshold || '—'}</span>
                        {' / '}
                        <span className="text-red-600 font-medium">{s.observed_value || '—'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">Detected: {formatTime(s.detected_at)}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'root_cause' && (
          <div className="space-y-4">
            {!inc.root_cause ? (
              <EmptyState message="Root cause analysis has not been performed yet" icon={<Search className="h-12 w-12" />} />
            ) : (
              <>
                <div className="fi-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {rootCauseIcon(inc.root_cause.category)}
                    <h3 className="text-sm font-semibold text-slate-800">Root Cause: {inc.root_cause.category.replace(/_/g, ' ')}</h3>
                    <span className="ml-auto text-xs text-slate-500">Confidence: <strong className="text-slate-800">{(inc.root_cause.confidence * 100).toFixed(0)}%</strong></span>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{inc.root_cause.description}</p>
                  <DetailsPanel columns={2} items={[
                    { label: 'Component', value: <code className="font-mono text-xs">{inc.root_cause.component}</code> },
                    { label: 'Category', value: inc.root_cause.category.replace(/_/g, ' ') },
                    { label: 'Commit', value: inc.root_cause.commit_sha ? <code className="font-mono text-xs">{inc.root_cause.commit_sha}</code> : '—' },
                    { label: 'File', value: inc.root_cause.file_path ? <code className="font-mono text-xs">{inc.root_cause.file_path}</code> : '—' },
                    { label: 'Lines', value: inc.root_cause.line_range || '—' },
                    { label: 'Confidence', value: `${(inc.root_cause.confidence * 100).toFixed(0)}%` },
                  ]} />
                </div>
                {inc.root_cause.contributing_factors.length > 0 && (
                  <div className="fi-card p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contributing Factors</h3>
                    <ul className="space-y-1.5">
                      {inc.root_cause.contributing_factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Object.keys(inc.root_cause_analysis).length > 0 && (
                  <div className="fi-card p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Analysis Context</h3>
                    <pre className="text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded overflow-x-auto max-h-64">{JSON.stringify(inc.root_cause_analysis, null, 2)}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'remediation' && (
          <div className="space-y-4">
            {!inc.remediation_plan ? (
              <EmptyState message="No remediation plan generated yet" icon={<FileText className="h-12 w-12" />} />
            ) : (
              <>
                <div className="fi-card p-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">{inc.remediation_plan.summary}</h3>
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <span className={`fi-badge ${severityColor(inc.remediation_plan.risk_level)}`}>Risk: {inc.remediation_plan.risk_level}</span>
                    {inc.remediation_plan.requires_approval && <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">Approval Required</span>}
                    <span className="text-slate-500">{inc.remediation_plan.steps.length} steps</span>
                    <span className="text-slate-500">Est. {Math.round(inc.remediation_plan.estimated_duration_seconds / 60)}min</span>
                    <span className="text-slate-500">Est. ${(inc.remediation_plan.estimated_cost_cents / 100).toFixed(2)}</span>
                  </div>
                  {inc.remediation_plan.risk_factors.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {inc.remediation_plan.risk_factors.map((rf, i) => (
                        <span key={i} className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{rf}</span>
                      ))}
                    </div>
                  )}
                  {inc.remediation_plan.rollback_plan && (
                    <div className="mt-3 fi-card p-2 bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-1.5 text-xs text-amber-700">
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="font-medium">Rollback Plan:</span> {inc.remediation_plan.rollback_plan}
                      </div>
                    </div>
                  )}
                </div>

                <div className="fi-card p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Remediation Steps</h3>
                  <div className="space-y-2">
                    {inc.remediation_plan.steps.map((step: RemediationStep, i: number) => (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-50 border border-slate-200">
                            {stepStatusIcon(step.status)}
                          </div>
                          {i < inc.remediation_plan!.steps.length - 1 && <div className="w-px h-6 bg-slate-200 mt-1" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{step.label}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">{step.phase}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{step.description}</p>
                          {step.started_at && (
                            <div className="text-[11px] text-slate-400 mt-1">
                              {formatTime(step.started_at)} {step.completed_at && `→ ${formatTime(step.completed_at)}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {Object.keys(inc.verification_result).length > 0 && (
                  <div className="fi-card p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Verification Result</h3>
                    <pre className="text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded overflow-x-auto max-h-48">{JSON.stringify(inc.verification_result, null, 2)}</pre>
                  </div>
                )}
                {Object.keys(inc.rollback_result).length > 0 && (
                  <div className="fi-card p-4 border-amber-200 bg-amber-50">
                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Rollback Result</h3>
                    <pre className="text-xs font-mono text-amber-700 bg-amber-50 p-3 rounded overflow-x-auto max-h-48">{JSON.stringify(inc.rollback_result, null, 2)}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-2">
            {inc.timeline.length === 0 ? (
              <EmptyState message="No timeline entries" />
            ) : (
              inc.timeline.map((entry: IncidentTimelineEntry) => (
                <div key={entry.id} className="flex items-start gap-3 fi-card p-3">
                  <div className="mt-0.5">{timelineIcon(entry.event)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{entry.message}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {formatTime(entry.timestamp)} by <span className="text-slate-600">{entry.actor}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-2">
            {(evidence ?? []).length === 0 ? (
              <EmptyState message="No evidence collected" icon={<FileText className="h-12 w-12" />} />
            ) : (
              (evidence ?? []).map(ev => (
                <div key={ev.id} className="fi-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{ev.summary}</span>
                    <StatusBadge status={ev.status} />
                  </div>
                  <div className="text-xs text-slate-500">
                    {ev.evidence_type} | {formatTime(ev.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <SideDrawer
        open={showClose}
        onClose={() => setShowClose(false)}
        title="Close Incident"
        subtitle="Mark this incident as closed"
        width="400px"
        footer={
          <button
            onClick={() => {
              closeIncident.mutate({ id: inc.id, body: closeForm }, { onSuccess: () => setShowClose(false) })
            }}
            disabled={closeIncident.isPending || !closeForm.closed_by}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {closeIncident.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Close Incident
          </button>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Closed By</label>
            <input
              type="text"
              value={closeForm.closed_by}
              onChange={e => setCloseForm({ ...closeForm, closed_by: e.target.value })}
              placeholder="Your name..."
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Reason</label>
            <textarea
              value={closeForm.reason}
              onChange={e => setCloseForm({ ...closeForm, reason: e.target.value })}
              placeholder="Reason for closing..."
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            />
          </div>
        </div>
      </SideDrawer>

      <SideDrawer
        open={showApprove}
        onClose={() => setShowApprove(false)}
        title="Approve Remediation"
        subtitle={`Risk: ${inc.remediation_plan?.risk_level ?? '—'}`}
        width="400px"
        footer={
          <button
            onClick={() => {
              approveRemediation.mutate({ id: inc.id, body: approveForm }, { onSuccess: () => setShowApprove(false) })
            }}
            disabled={approveRemediation.isPending || !approveForm.approved_by}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
          >
            {approveRemediation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Approve
          </button>
        }
      >
        <div className="p-4 space-y-4">
          <div className="fi-card p-3 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <span>This remediation requires approval due to risk level: {inc.remediation_plan?.risk_level}</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Approved By</label>
            <input
              type="text"
              value={approveForm.approved_by}
              onChange={e => setApproveForm({ ...approveForm, approved_by: e.target.value })}
              placeholder="Your name..."
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Reason</label>
            <textarea
              value={approveForm.reason}
              onChange={e => setApproveForm({ ...approveForm, reason: e.target.value })}
              placeholder="Approval reason..."
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            />
          </div>
        </div>
      </SideDrawer>
    </div>
  )
}
