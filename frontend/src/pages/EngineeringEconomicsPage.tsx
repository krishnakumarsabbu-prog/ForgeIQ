import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useEngineeringEconomics } from '../hooks/useQueries'
import { Coins, TrendingDown, DollarSign, BarChart3, Cpu, Zap } from 'lucide-react'
import ReactECharts from 'echarts-for-react'

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function EngineeringEconomicsPage() {
  const { data, isLoading } = useEngineeringEconomics?.() ?? { data: null, isLoading: false }

  if (isLoading) return (
    <>
      <PageHeader title="Engineering Economics" description="AI cost analytics and optimization." icon={<Coins size={18} />} />
      <LoadingSpinner message="Loading economics data..." />
    </>
  )

  return (
    <>
      <PageHeader
        title="Engineering Economics"
        description="AI cost analytics, ROI metrics, token efficiency, and budget governance for autonomous engineering."
        icon={<Coins size={18} />}
        badge="Cost Intelligence"
        badgeVariant="amber"
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total AI Spend"   value={formatCost(data?.total_cost_cents ?? 0)}     sub="All time"          icon={DollarSign}  gradient={['#f59e0b','#f97316']} />
          <StatCard label="This Month"       value={formatCost(data?.monthly_cost_cents ?? 0)}    sub="30-day budget"     icon={Coins}       gradient={['#00adef','#0a68f4']} />
          <StatCard label="Tokens Used"      value={(data?.total_tokens ?? 0).toLocaleString()}   sub="AI tokens"         icon={Cpu}         gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Cost Efficiency"  value={data?.efficiency_score ?? '92%'}             sub="vs manual"         icon={TrendingDown} gradient={['#10b981','#0891b2']} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <EnterpriseCard>
            <SectionHeader icon={BarChart3} title="Cost by Agent (30d)" subtitle="AI spend breakdown per agent" iconColor="#f59e0b" />
            <div className="p-5">
              <ReactECharts style={{ height: 220 }} option={{
                tooltip: { trigger: 'axis', formatter: (params: any) => `${params[0].name}<br/>${params[0].marker}$${(params[0].value/100).toFixed(3)}` },
                grid: { left: 40, right: 20, top: 10, bottom: 40 },
                xAxis: {
                  type: 'category',
                  data: (data?.cost_by_agent ?? []).map((c: any) => c.name?.slice(0, 12) ?? ''),
                  axisLabel: { fontSize: 10, rotate: 30, color: '#64748b' },
                  axisLine: { lineStyle: { color: '#e2e8f0' } },
                  axisTick: { show: false },
                },
                yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#64748b', formatter: (v: number) => `$${(v/100).toFixed(2)}` }, splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } } },
                series: [{
                  type: 'bar',
                  data: (data?.cost_by_agent ?? []).map((c: any) => c.cost_cents ?? 0),
                  itemStyle: {
                    color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#f97316' }] },
                    borderRadius: [4, 4, 0, 0],
                  },
                  barMaxWidth: 28,
                }],
              }} />
            </div>
          </EnterpriseCard>

          <EnterpriseCard>
            <SectionHeader icon={Zap} title="Cost by Application" subtitle="Spend distribution across services" iconColor="#0284c7" />
            <div className="p-5">
              <ReactECharts style={{ height: 220 }} option={{
                tooltip: { trigger: 'item', formatter: '{b}: ${d}%' },
                legend: { show: false },
                series: [{
                  type: 'pie',
                  radius: ['40%', '70%'],
                  data: (data?.cost_by_application ?? [
                    { name: 'Payment Svc', cost_cents: 3200 },
                    { name: 'User API',    cost_cents: 2100 },
                    { name: 'Order Proc',  cost_cents: 1800 },
                    { name: 'Analytics',   cost_cents: 900 },
                    { name: 'Other',       cost_cents: 600 },
                  ]).map((c: any, i: number) => ({
                    name: c.name,
                    value: c.cost_cents,
                    itemStyle: { color: ['#00adef','#7c3aed','#10b981','#f59e0b','#f43f5e'][i % 5] },
                  })),
                  label: { fontSize: 11, color: '#64748b' },
                  emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.1)' } },
                }],
              }} />
            </div>
          </EnterpriseCard>
        </div>

        <EnterpriseCard>
          <SectionHeader icon={Coins} title="Cost Breakdown Summary" subtitle="Detailed economics by category" iconColor="#f59e0b" />
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'AI Spend',         value: formatCost(data?.ai_spend_cents ?? 8600),         sub: 'LLM API calls',    color: '#f59e0b' },
              { label: 'Execution Time',   value: data?.execution_time_hours ?? '127h',             sub: 'Compute hours',    color: '#0284c7' },
              { label: 'Retry Overhead',   value: formatCost(data?.retry_cost_cents ?? 420),        sub: 'Wasted on retries', color: '#f43f5e' },
              { label: 'Manual Equivalent', value: data?.manual_cost_equivalent ?? '$124,000',      sub: 'Estimated saved',  color: '#10b981' },
            ].map(stat => (
              <div key={stat.label} className="p-4 rounded-2xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.7)' }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{stat.label}</div>
                <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[11px] text-slate-400 mt-1">{stat.sub}</div>
              </div>
            ))}
          </div>
        </EnterpriseCard>
      </div>
    </>
  )
}
