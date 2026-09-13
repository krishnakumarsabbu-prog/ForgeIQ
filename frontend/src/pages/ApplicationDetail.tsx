import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApplication, useEngineeringState } from '../hooks/useQueries'
import { apiService } from '../api'
import { PageHeader, RiskBadge, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { ArrowLeft, Boxes, GitBranch, FileText, CheckCircle2 } from 'lucide-react'

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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

  return (
    <>
      <PageHeader
        title={app.display_name || app.name}
        description={app.description}
        actions={
          <button onClick={() => navigate('/applications')} className="fi-button-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Info Header */}
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
                  {app.technologies.map((tech) => (
                    <span key={tech} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-forgeiq-600" /> Requirements
            </h3>
          </div>
          {!requirements || requirements.length === 0 ? (
            <EmptyState message="No requirements for this application" />
          ) : (
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
                          {req.tags.map((tag) => (
                            <span key={tag} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{tag}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pipelines */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-forgeiq-600" /> Pipelines
            </h3>
          </div>
          {!pipelines || pipelines.length === 0 ? (
            <EmptyState message="No pipelines for this application" />
          ) : (
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
          )}
        </div>

        {/* Engineering State Summary */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-forgeiq-600" /> Engineering State
            </h3>
          </div>
          {!engState ? (
            <EmptyState message="No engineering state available" />
          ) : (
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Health Score</p>
                <p className="text-lg font-semibold text-slate-900">{engState.health_score.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Coverage</p>
                <p className="text-lg font-semibold text-slate-900">{engState.coverage_pct.toFixed(1)}%</p>
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
                <p className="text-sm font-mono text-slate-900">{engState.commit.slice(0, 8)}</p>
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
          )}
        </div>

        <div>
          <Link to="/applications" className="text-sm text-forgeiq-600 hover:text-forgeiq-700 font-medium">
            ← Back to Applications
          </Link>
        </div>
      </div>
    </>
  )
}
