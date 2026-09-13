import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useApplication, useEngineeringState, useAppExecutions, useAppEvidence, useAppDeployments } from '../hooks/useQueries'
import { apiService } from '../api'
import { PageHeader, PageTabs, RiskBadge, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { ArrowLeft, Boxes, GitBranch, FileText, CheckCircle2, Shield, Activity, Rocket, GitCommit, Server, BookOpen, Layers, Cpu } from 'lucide-react'
import type { Execution, Evidence, Deployment } from '../types'

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: app, isLoading } = useApplication(id!)
  const { data: requirements } = useQuery({
    queryKey: ['app-requirements', id],
    queryFn: () => apiService.appRequirements(id!),
    enabled: !!id,
  })
  const { data: pipelines } = useQuery({
    queryKey: ['app-pipelines', id],
    queryFn: () => apiService.appPipelines(id!),
    enabled: !!id,
  })
  const { data: engState } = useEngineeringState(app?.engineering_state_id ?? '')
  const { data: executions } = useAppExecutions(id!)
  const { data: evidence } = useAppEvidence(id!)
  const { data: deployments } = useAppDeployments(id!)

  if (isLoading) return (
    <>
      <PageHeader title="Application Detail" />
      <LoadingSpinner />
    </>
  )
  if (!app) return (
    <>
      <PageHeader title="Application Detail" />
      <EmptyState message="Application not found" />
    </>
  )

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'requirements', label: 'Requirements', count: requirements?.length ?? 0 },
    { key: 'architecture', label: 'Architecture' },
    { key: 'repository', label: 'Repository' },
    { key: 'engineering-state', label: 'Engineering State' },
    { key: 'pipelines', label: 'Pipelines', count: pipelines?.length ?? 0 },
    { key: 'executions', label: 'Executions', count: executions?.length ?? 0 },
    { key: 'evidence', label: 'Evidence', count: evidence?.length ?? 0 },
    { key: 'security', label: 'Security' },
    { key: 'quality', label: 'Quality' },
    { key: 'deployments', label: 'Deployments', count: deployments?.length ?? 0 },
    { key: 'documentation', label: 'Documentation' },
  ]

  return (
    <>
      <PageHeader
        title={app.display_name || app.name}
        description={app.description}
        breadcrumbs={[
          { label: 'Applications', to: '/applications' },
          { label: app.display_name || app.name },
        ]}
        actions={
          <button onClick={() => navigate('/applications')} className="fi-button-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <PageTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="p-6 space-y-6">
        {activeTab === 'overview' && <OverviewTab app={app} engState={engState} executions={executions} deployments={deployments} />}
        {activeTab === 'requirements' && <RequirementsTab requirements={requirements ?? []} />}
        {activeTab === 'architecture' && <ArchitectureTab app={app} engState={engState} />}
        {activeTab === 'repository' && <RepositoryTab app={app} />}
        {activeTab === 'engineering-state' && <EngineeringStateTab engState={engState} />}
        {activeTab === 'pipelines' && <PipelinesTab pipelines={pipelines ?? []} navigate={navigate} />}
        {activeTab === 'executions' && <ExecutionsTab executions={executions} navigate={navigate} />}
        {activeTab === 'evidence' && <EvidenceTab evidence={evidence} />}
        {activeTab === 'security' && <SecurityTab engState={engState} />}
        {activeTab === 'quality' && <QualityTab engState={engState} />}
        {activeTab === 'deployments' && <DeploymentsTab deployments={deployments} />}
        {activeTab === 'documentation' && <DocumentationTab app={app} engState={engState} />}
      </div>
    </>
  )
}

function OverviewTab({ app, engState, executions, deployments }: { app: any; engState: any; executions?: Execution[]; deployments?: Deployment[] }) {
  return (
    <div className="space-y-4">
      <div className="fi-card p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-forgeiq-50 rounded-lg">
            <Boxes className="h-6 w-6 text-forgeiq-600" />
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Type</p>
              <p className="text-sm font-medium text-slate-900">{app.type}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Risk Level</p>
              <div className="mt-0.5"><RiskBadge level={app.risk_level} /></div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Version</p>
              <p className="text-sm font-medium text-slate-900">{app.current_version}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Team</p>
              <p className="text-sm font-medium text-slate-900">{app.team}</p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Technologies</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {app.technologies.map((tech: string) => (
                  <span key={tech} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{tech}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Engineering State</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Health Score</span>
              <span className="font-medium text-slate-900">{engState ? `${(engState.health_score * 100).toFixed(0)}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Coverage</span>
              <span className="font-medium text-slate-900">{engState ? `${engState.coverage_pct.toFixed(0)}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Security Findings</span>
              <span className="font-medium text-slate-900">{engState?.security_findings ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Open Vulnerabilities</span>
              <span className="font-medium text-slate-900">{engState?.open_vulnerabilities ?? 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Executions</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Total</span>
              <span className="font-medium text-slate-900">{executions?.length ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Completed</span>
              <span className="font-medium text-emerald-600">{executions?.filter(e => e.status === 'COMPLETED').length ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Failed</span>
              <span className="font-medium text-red-600">{executions?.filter(e => e.status === 'FAILED').length ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Running</span>
              <span className="font-medium text-blue-600">{executions?.filter(e => e.status === 'RUNNING').length ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Deployments</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Total</span>
              <span className="font-medium text-slate-900">{deployments?.length ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Verified</span>
              <span className="font-medium text-emerald-600">{deployments?.filter(d => d.verified).length ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Completed</span>
              <span className="font-medium text-slate-900">{deployments?.filter(d => d.status === 'completed').length ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Rollback Supported</span>
              <span className="font-medium text-slate-900">{deployments?.filter(d => d.rollback_supported).length ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RequirementsTab({ requirements }: { requirements: any[] }) {
  if (!requirements || requirements.length === 0) return <EmptyState message="No requirements for this application" icon={<FileText className="h-12 w-12" />} />
  return (
    <div className="fi-card">
      <div className="overflow-x-auto">
        <table className="fi-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Complexity</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) => (
              <tr key={req.id}>
                <td className="font-medium text-slate-900">{req.title}</td>
                <td>
                  <span className={`fi-badge ${req.priority === 'HIGH' || req.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-200' : req.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {req.priority}
                  </span>
                </td>
                <td><StatusBadge status={req.status} /></td>
                <td className="text-slate-600">{req.estimated_complexity}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {req.tags.map((tag: string) => (
                      <span key={tag} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{tag}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ArchitectureTab({ app, engState }: { app: any; engState: any }) {
  const arch = engState?.architecture || {}
  return (
    <div className="space-y-4">
      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">Architecture Pattern</h3>
        </div>
        <p className="text-sm text-slate-700">{arch.pattern || 'Not yet analyzed'}</p>
        {arch.layers && (
          <div className="mt-3 flex flex-wrap gap-1">
            {arch.layers.map((layer: string) => (
              <span key={layer} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{layer}</span>
            ))}
          </div>
        )}
      </div>
      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">Components</h3>
        </div>
        {arch.components && arch.components.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {arch.components.map((comp: string) => (
              <div key={comp} className="px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-sm text-slate-700">{comp}</div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No components discovered yet</p>
        )}
      </div>
      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">APIs</h3>
        {engState?.apis && engState.apis.length > 0 ? (
          <div className="space-y-1">
            {engState.apis.map((api: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                <span className={`fi-badge text-xs ${api.method === 'GET' ? 'bg-blue-50 text-blue-700 border border-blue-200' : api.method === 'POST' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : api.method === 'DELETE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{api.method}</span>
                <span className="text-sm font-mono text-slate-700">{api.path}</span>
                {api.authenticated && <Shield className="h-3 w-3 text-amber-500" />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No APIs discovered yet</p>
        )}
      </div>
    </div>
  )
}

function RepositoryTab({ app }: { app: any }) {
  const repo = app.repository
  return (
    <div className="fi-card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-4 w-4 text-forgeiq-600" />
        <h3 className="text-sm font-semibold text-slate-900">Repository Configuration</h3>
      </div>
      {repo ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">URL</p>
            <p className="text-sm font-mono text-slate-900 truncate">{repo.url}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Provider</p>
            <p className="text-sm text-slate-900">{repo.provider}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Branch</p>
            <p className="text-sm text-slate-900">{repo.branch}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Default Branch</p>
            <p className="text-sm text-slate-900">{repo.default_branch}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Discovered</p>
            <p className="text-sm text-slate-900">{repo.discovered ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Semantic Model</p>
            <p className="text-sm text-slate-900">{repo.semantic_model_built ? 'Built' : 'Not built'}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">No repository configured for this application</p>
      )}
    </div>
  )
}

function EngineeringStateTab({ engState }: { engState: any }) {
  if (!engState) return <EmptyState message="No engineering state available" icon={<CheckCircle2 className="h-12 w-12" />} />
  return (
    <div className="space-y-4">
      <div className="fi-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Health Score</p>
          <p className="text-lg font-semibold text-slate-900">{engState.health_score.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Coverage</p>
          <p className="text-lg font-semibold text-slate-900">{engState.coverage_pct.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Security Findings</p>
          <p className="text-lg font-semibold text-slate-900">{engState.security_findings}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Open Vulnerabilities</p>
          <p className="text-lg font-semibold text-slate-900">{engState.open_vulnerabilities}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Branch</p>
          <p className="text-sm font-medium text-slate-900">{engState.branch}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Commit</p>
          <p className="text-sm font-mono text-slate-900">{engState.commit?.slice(0, 8) || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Version</p>
          <p className="text-sm font-medium text-slate-900">{engState.version}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Last Updated</p>
          <p className="text-sm font-medium text-slate-900">{new Date(engState.last_updated).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitCommit className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">Dependencies</h3>
        </div>
        {engState.dependencies && engState.dependencies.length > 0 ? (
          <div className="space-y-1">
            {engState.dependencies.map((dep: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-sm font-medium text-slate-700">{dep.name}</span>
                <span className="text-xs text-slate-500">{dep.version} ({dep.type})</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No dependencies recorded</p>
        )}
      </div>

      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Known Issues</h3>
        {engState.known_issues && engState.known_issues.length > 0 ? (
          <div className="space-y-1">
            {engState.known_issues.map((issue: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-sm text-slate-700">{issue.description}</span>
                <span className={`fi-badge text-xs ${issue.severity === 'high' ? 'bg-red-50 text-red-700 border border-red-200' : issue.severity === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>{issue.severity}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No known issues</p>
        )}
      </div>
    </div>
  )
}

function PipelinesTab({ pipelines, navigate }: { pipelines: any[]; navigate: (path: string) => void }) {
  if (!pipelines || pipelines.length === 0) return <EmptyState message="No pipelines for this application" icon={<GitBranch className="h-12 w-12" />} />
  return (
    <div className="fi-card">
      <div className="overflow-x-auto">
        <table className="fi-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Stages</th>
              <th>Version</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pipelines.map((pipeline) => (
              <tr
                key={pipeline.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => navigate(`/pipelines/${pipeline.id}`)}
              >
                <td className="font-medium text-slate-900">{pipeline.display_name || pipeline.name}</td>
                <td className="text-slate-600">{pipeline.stages.length}</td>
                <td className="text-slate-600">{pipeline.current_version}</td>
                <td>
                  <span className={`fi-badge ${pipeline.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                    {pipeline.active ? 'active' : 'inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExecutionsTab({ executions, navigate }: { executions?: Execution[]; navigate: (path: string) => void }) {
  if (!executions || executions.length === 0) return <EmptyState message="No executions for this application" icon={<Rocket className="h-12 w-12" />} />
  return (
    <div className="fi-card">
      <div className="overflow-x-auto">
        <table className="fi-table">
          <thead>
            <tr>
              <th>Execution ID</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Trigger</th>
              <th>Retries</th>
              <th>Tokens</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((exec) => (
              <tr
                key={exec.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => navigate(`/executions/${exec.id}`)}
              >
                <td className="font-mono text-xs text-slate-900">{exec.id.slice(0, 12)}</td>
                <td><StatusBadge status={exec.status} /></td>
                <td className="text-slate-600">{exec.progress.toFixed(0)}%</td>
                <td className="text-slate-600 text-xs">{exec.trigger}</td>
                <td className="text-slate-600">{exec.retry_count}</td>
                <td className="text-slate-600">{exec.tokens_used.toLocaleString()}</td>
                <td className="text-slate-600">${(exec.cost_cents / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EvidenceTab({ evidence }: { evidence?: Evidence[] }) {
  if (!evidence || evidence.length === 0) return <EmptyState message="No evidence for this application" icon={<FileText className="h-12 w-12" />} />
  return (
    <div className="fi-card">
      <div className="overflow-x-auto">
        <table className="fi-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Agent</th>
              <th>Model</th>
              <th>Summary</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((ev) => (
              <tr key={ev.id}>
                <td>
                  <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{ev.evidence_type}</span>
                </td>
                <td className="text-slate-600 text-xs">{ev.agent_id?.slice(0, 12) || 'N/A'}</td>
                <td className="text-slate-600 text-xs">{ev.model_used || 'N/A'}</td>
                <td className="text-slate-700 text-sm">{ev.summary}</td>
                <td className="text-slate-500 text-xs">{new Date(ev.timestamp).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SecurityTab({ engState }: { engState: any }) {
  if (!engState) return <EmptyState message="No security data available" icon={<Shield className="h-12 w-12" />} />
  const sec = engState.security || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">SAST Findings</p>
          <p className="text-lg font-semibold text-slate-900">{sec.sast_findings ?? 0}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Dependency Vulns</p>
          <p className="text-lg font-semibold text-slate-900">{sec.dependency_vulnerabilities ?? 0}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Open Vulnerabilities</p>
          <p className="text-lg font-semibold text-slate-900">{engState.open_vulnerabilities ?? 0}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Last Scan</p>
          <p className="text-sm font-medium text-slate-900">{sec.last_scan ? new Date(sec.last_scan).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}

function QualityTab({ engState }: { engState: any }) {
  if (!engState) return <EmptyState message="No quality data available" icon={<Activity className="h-12 w-12" />} />
  const tests = engState.tests || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Tests</p>
          <p className="text-lg font-semibold text-slate-900">{tests.total ?? 0}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Passed</p>
          <p className="text-lg font-semibold text-emerald-600">{tests.passed ?? 0}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Failed</p>
          <p className="text-lg font-semibold text-red-600">{tests.failed ?? 0}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Coverage</p>
          <p className="text-lg font-semibold text-slate-900">{engState.coverage_pct?.toFixed(0) ?? 0}%</p>
        </div>
      </div>
      <div className="fi-card p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Build Status</p>
        <p className="text-sm font-medium text-slate-900">{(engState.build as any)?.status || 'N/A'}</p>
      </div>
    </div>
  )
}

function DeploymentsTab({ deployments }: { deployments?: Deployment[] }) {
  if (!deployments || deployments.length === 0) return <EmptyState message="No deployments for this application" icon={<Server className="h-12 w-12" />} />
  return (
    <div className="fi-card">
      <div className="overflow-x-auto">
        <table className="fi-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Status</th>
              <th>Strategy</th>
              <th>Verified</th>
              <th>Rollback</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((dep) => (
              <tr key={dep.id}>
                <td className="font-medium text-slate-900">{dep.version}</td>
                <td><StatusBadge status={dep.status} /></td>
                <td className="text-slate-600">{dep.strategy}</td>
                <td>{dep.verified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="text-slate-400">No</span>}</td>
                <td className="text-slate-600">{dep.rollback_supported ? 'Supported' : 'Not supported'}</td>
                <td className="text-slate-500 text-xs">{dep.started_at ? new Date(dep.started_at).toLocaleDateString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DocumentationTab({ app, engState }: { app: any; engState: any }) {
  return (
    <div className="space-y-4">
      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">Application Documentation</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Architecture Wiki', 'API Wiki', 'Component Wiki', 'Dependency Wiki', 'Setup Guide', 'Development Guide', 'Deployment Guide', 'Testing Guide', 'Security Guide'].map((doc) => (
            <div key={doc} className="px-3 py-2.5 bg-slate-50 rounded-md border border-slate-200 hover:bg-white hover:border-forgeiq-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm text-slate-700">{doc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Engineering Decisions</h3>
        {engState?.decisions && engState.decisions.length > 0 ? (
          <div className="space-y-2">
            {engState.decisions.map((dec: any) => (
              <div key={dec.id} className="px-3 py-2.5 bg-slate-50 rounded-md border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{dec.decision}</span>
                  <span className={`fi-badge text-xs ${dec.impact === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{dec.impact}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{dec.rationale}</p>
                <p className="text-xs text-slate-400 mt-1">Decided by {dec.decided_by}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No engineering decisions recorded</p>
        )}
      </div>
    </div>
  )
}
