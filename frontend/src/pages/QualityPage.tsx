import { useDashboard, useEngineeringStates } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { HealthIndicator } from '../components/ui/StatusBadge'
import { MetricStrip } from '../components/ui/MetricStrip'
import { Gauge, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function QualityPage() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard()
  const { data: engStates, isLoading: engLoading } = useEngineeringStates()

  if (dashLoading || engLoading) return (<><PageHeader title="Quality" description="Code health, coverage, and quality metrics across applications" /><LoadingSpinner /></>)

  const q = dashboard?.quality
  const states = engStates ?? []

  return (
    <>
      <PageHeader title="Quality" description="Code health, coverage, and quality metrics across applications" />
      <div className="p-6 space-y-6">
        {q && (
          <MetricStrip
            metrics={[
              { label: 'Avg Health Score', value: q.avg_health_score.toFixed(1), icon: <Gauge size={14} /> },
              { label: 'Avg Coverage', value: `${q.avg_coverage_pct.toFixed(1)}%`, icon: <TrendingUp size={14} /> },
              { label: 'Security Findings', value: q.total_security_findings, icon: <AlertCircle size={14} /> },
              { label: 'Open Vulnerabilities', value: q.total_open_vulnerabilities, icon: <AlertCircle size={14} /> },
            ]}
          />
        )}

        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Application Quality Matrix</h3>
          </div>
          {states.length === 0 ? (
            <EmptyState message="No engineering state data available" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Branch</th>
                    <th>Version</th>
                    <th>Health</th>
                    <th>Coverage</th>
                    <th className="text-right">Security Findings</th>
                    <th className="text-right">Open Vulnerabilities</th>
                    <th className="text-right">Known Issues</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="font-medium text-slate-900 font-mono text-sm">{s.repository}</td>
                      <td className="text-slate-600 font-mono text-xs">{s.branch}</td>
                      <td className="text-slate-600 font-mono text-xs">{s.version}</td>
                      <td><HealthIndicator score={s.health_score} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.coverage_pct >= 80 ? 'bg-emerald-500' : s.coverage_pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.coverage_pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{s.coverage_pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="text-right text-slate-600">{s.security_findings}</td>
                      <td className="text-right">
                        {s.open_vulnerabilities > 0 ? (
                          <span className="text-red-600 font-medium">{s.open_vulnerabilities}</span>
                        ) : (
                          <CheckCircle2 size={14} className="text-emerald-500 inline" />
                        )}
                      </td>
                      <td className="text-right text-slate-600">{s.known_issues.length}</td>
                      <td className="text-xs text-slate-500">{new Date(s.last_updated).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
