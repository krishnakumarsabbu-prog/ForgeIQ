import { useNavigate } from 'react-router-dom'
import { useApplications, useEngineeringStates, useExecutions } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import type { Application, EngineeringState, Execution } from '../types'
import { Boxes, Rocket, GitBranch, Shield, Activity, CheckCircle2, FolderGit2, Plus, Download, TrendingUp, Server } from 'lucide-react'

export default function ApplicationsPage() {
  const { data, isLoading } = useApplications()
  const { data: engStates } = useEngineeringStates()
  const { data: executions } = useExecutions()
  const navigate = useNavigate()

  const engStateMap = new Map<string, EngineeringState>()
  engStates?.forEach((es) => engStateMap.set(es.application_id, es))

  const lastExecMap = new Map<string, Execution>()
  executions?.forEach((e) => {
    if (e.application_id) {
      const existing = lastExecMap.get(e.application_id)
      if (!existing || (e.created_at > existing.created_at)) lastExecMap.set(e.application_id, e)
    }
  })

  const greenfield = data?.filter(a => a.type === 'greenfield').length ?? 0
  const brownfield = data?.filter(a => a.type !== 'greenfield').length ?? 0
  const active = data?.filter(a => a.status === 'active').length ?? 0

  return (
    <>
      <PageHeader
        title="Applications"
        description="Manage all applications registered in the ForgeIQ AI Engineering Factory"
        icon={<Boxes size={18} />}
        badge={`${data?.length ?? 0} Services`}
        badgeVariant="emerald"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/brownfield-import')} className="fi-btn-secondary">
              <Download size={13} /> Import Application
            </button>
            <button onClick={() => navigate('/start-engineering')} className="fi-btn-primary">
              <Rocket size={13} /> Start Engineering
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Applications" value={data?.length ?? 0} sub="Registered"       icon={Boxes}       gradient={['#10b981','#0891b2']} />
          <StatCard label="Greenfield"          value={greenfield}         sub="New development"  icon={Rocket}      gradient={['#00adef','#0a68f4']} />
          <StatCard label="Brownfield"          value={brownfield}         sub="Legacy migrated"  icon={FolderGit2}  gradient={['#6366f1','#7c3aed']} />
          <StatCard label="Active Services"     value={active}             sub="In production"    icon={CheckCircle2} gradient={['#f59e0b','#f97316']} />
        </div>

        <EnterpriseCard>
          <SectionHeader
            icon={Boxes}
            title="Application Registry"
            subtitle="All services managed by the AI Engineering Factory"
            iconColor="#10b981"
          />
          {isLoading ? (
            <LoadingSpinner message="Loading application registry..." />
          ) : !data?.length ? (
            <EmptyState
              message="No applications found"
              description="Import existing applications or start a new greenfield project."
              icon={<Boxes size={24} className="text-slate-300" />}
              action={
                <div className="flex items-center gap-2">
                  <button className="fi-btn-primary" onClick={() => navigate('/start-engineering')}>
                    <Plus size={13} /> New Application
                  </button>
                  <button className="fi-btn-secondary" onClick={() => navigate('/brownfield-import')}>
                    <Download size={13} /> Import Brownfield
                  </button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Type</th>
                    <th>Technology</th>
                    <th>Repository</th>
                    <th>Branch</th>
                    <th>Environment</th>
                    <th>Health</th>
                    <th>Last Execution</th>
                    <th>Security</th>
                    <th>Coverage</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((app: Application) => {
                    const es = engStateMap.get(app.id)
                    const lastExec = lastExecMap.get(app.id)
                    const env = es?.deployment ? (es.deployment as Record<string, unknown>).environment as string : 'N/A'
                    const repo = app.repository?.url?.replace('git@github.com:forgeiq/', '').replace('.git', '') || 'N/A'
                    const branch = app.repository?.branch || 'main'
                    const healthScore = es?.health_score ?? 0
                    const coverage = es?.coverage_pct ?? 0
                    const secFindings = es?.security_findings ?? 0
                    const healthColor = healthScore >= 0.9 ? '#059669' : healthScore >= 0.7 ? '#b45309' : '#e11d48'
                    const healthBg = healthScore >= 0.9 ? 'rgba(16,185,129,0.1)' : healthScore >= 0.7 ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)'
                    const healthLabel = healthScore >= 0.9 ? 'Healthy' : healthScore >= 0.7 ? 'Fair' : 'At Risk'

                    return (
                      <tr key={app.id} className="cursor-pointer group" onClick={() => navigate(`/applications/${app.id}`)}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                              style={{ background: 'linear-gradient(135deg, #10b981, #0891b2)' }}
                            >
                              {(app.display_name || app.name).charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate">{app.display_name || app.name}</div>
                              <div className="text-[10px] text-slate-400">{app.team}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={
                              app.type === 'greenfield'
                                ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }
                                : { background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.2)' }
                            }
                          >
                            {app.type}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {app.technologies.slice(0, 2).map((tech) => (
                              <span
                                key={tech}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                              >
                                {tech}
                              </span>
                            ))}
                            {app.technologies.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400" style={{ background: '#f1f5f9' }}>
                                +{app.technologies.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-[11px] text-slate-500 max-w-[120px] truncate">{repo}</td>
                        <td>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <GitBranch size={11} className="text-slate-400" /> {branch}
                          </div>
                        </td>
                        <td className="text-xs text-slate-600">{env}</td>
                        <td>
                          <span
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                            style={{ background: healthBg, color: healthColor, border: `1px solid ${healthColor}30` }}
                          >
                            {healthLabel} ({(healthScore * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td>
                          {lastExec
                            ? <StatusBadge status={lastExec.status} />
                            : <span className="text-xs text-slate-300">N/A</span>
                          }
                        </td>
                        <td>
                          <span
                            className="flex items-center gap-1 text-[11px] font-semibold"
                            style={{ color: secFindings === 0 ? '#059669' : secFindings <= 3 ? '#b45309' : '#e11d48' }}
                          >
                            <Shield size={11} /> {secFindings}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${coverage}%`,
                                  background: coverage >= 80 ? '#10b981' : coverage >= 60 ? '#f59e0b' : '#f43f5e',
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">{coverage.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={app.status?.toUpperCase() ?? 'ACTIVE'} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </EnterpriseCard>
      </div>
    </>
  )
}
