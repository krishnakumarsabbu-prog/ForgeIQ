import { useNavigate } from 'react-router-dom'
import { useQualityMetrics } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { Activity, TestTube, CheckCircle2, XCircle, TrendingUp, Gauge, Code2, Bug } from 'lucide-react'
import ReactECharts from 'echarts-for-react'

export default function QualityPage() {
  const { data, isLoading } = useQualityMetrics?.() ?? { data: null, isLoading: false }

  return (
    <>
      <PageHeader
        title="Quality Intelligence"
        description="Autonomous test results, coverage heatmaps, code quality scores, and defect escape tracking."
        icon={<TestTube size={18} />}
        badge="Quality"
        badgeVariant="emerald"
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Test Suites"     value={data?.total_suites ?? 0}   sub="Registered"    icon={TestTube}    gradient={['#10b981','#0891b2']} />
          <StatCard label="Passing"         value={data?.passing ?? 0}         sub="Green"         icon={CheckCircle2} gradient={['#10b981','#059669']} />
          <StatCard label="Failing"         value={data?.failing ?? 0}         sub="Needs fix"     icon={XCircle}     gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Coverage"        value={`${data?.avg_coverage ?? 0}%`} sub="Code coverage" icon={Gauge}   gradient={['#7c3aed','#4f46e5']} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <EnterpriseCard>
              <SectionHeader icon={Activity} title="Quality Trend (30d)" subtitle="Test results and coverage over time" iconColor="#10b981" />
              <div className="p-5">
                <ReactECharts style={{ height: 220 }} option={{
                  tooltip: { trigger: 'axis' },
                  grid: { left: 40, right: 20, top: 10, bottom: 30 },
                  xAxis: { type: 'category', data: ['W1','W2','W3','W4'], axisLabel: { fontSize: 11, color: '#64748b' }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
                  yAxis: { type: 'value', axisLabel: { fontSize: 11, color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } } },
                  series: [
                    { name: 'Passing', type: 'bar', data: [82, 88, 91, 95], itemStyle: { color: '#10b981', borderRadius: [4,4,0,0] }, barMaxWidth: 32 },
                    { name: 'Failing',  type: 'bar', data: [12, 8,  5,  3],  itemStyle: { color: '#f43f5e', borderRadius: [4,4,0,0] }, barMaxWidth: 32 },
                    { name: 'Coverage %', type: 'line', data: [76, 80, 85, 88], smooth: true, lineStyle: { color: '#7c3aed', width: 2 }, symbol: 'circle', symbolSize: 6, itemStyle: { color: '#7c3aed' } },
                  ],
                  legend: { data: ['Passing','Failing','Coverage %'], bottom: 0, textStyle: { fontSize: 11 } },
                }} />
              </div>
            </EnterpriseCard>
          </div>

          <EnterpriseCard>
            <SectionHeader icon={Gauge} title="Quality Scores" subtitle="By application" iconColor="#7c3aed" />
            <div className="p-5 space-y-3">
              {[
                { name: 'Payment Service',   score: 96, color: '#10b981' },
                { name: 'User API',          score: 88, color: '#10b981' },
                { name: 'Order Processor',   score: 74, color: '#f59e0b' },
                { name: 'Notification Svc',  score: 91, color: '#10b981' },
                { name: 'Analytics Engine',  score: 65, color: '#f43f5e' },
              ].map(app => (
                <div key={app.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-36 truncate">{app.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${app.score}%`, background: app.color }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: app.color }}>{app.score}</span>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Bug} title="Defect Tracking" subtitle="Active defects by severity and status" iconColor="#f59e0b" />
          <div className="p-5">
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Critical', count: data?.critical_defects ?? 2, color: '#e11d48', bg: 'rgba(244,63,94,0.08)' },
                { label: 'High',     count: data?.high_defects ?? 8,     color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
                { label: 'Medium',   count: data?.medium_defects ?? 15,  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                { label: 'Low',      count: data?.low_defects ?? 24,     color: '#0284c7', bg: 'rgba(14,165,233,0.08)' },
                { label: 'Resolved', count: data?.resolved_defects ?? 142, color: '#059669', bg: 'rgba(16,185,129,0.08)' },
              ].map(d => (
                <div key={d.label} className="p-4 rounded-2xl text-center" style={{ background: d.bg, border: `1px solid ${d.color}25` }}>
                  <div className="text-3xl font-black" style={{ color: d.color }}>{d.count}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </EnterpriseCard>
      </div>
    </>
  )
}
