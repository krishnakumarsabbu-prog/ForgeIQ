import type { ReactNode } from 'react'

interface Metric {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
}

const trendColors = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  flat: 'text-slate-500',
}

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden" style={{ gridTemplateColumns: `repeat(${metrics.length}, 1fr)` }}>
      {metrics.map((m, i) => (
        <div key={i} className="bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{m.label}</span>
            {m.icon && <span className="text-forgeiq-600">{m.icon}</span>}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-slate-900">{m.value}</span>
            {m.sub && <span className="text-xs text-slate-400">{m.sub}</span>}
          </div>
          {m.trend && m.trendValue && (
            <div className={`text-xs font-medium mt-0.5 ${trendColors[m.trend]}`}>{m.trendValue}</div>
          )}
        </div>
      ))}
    </div>
  )
}
