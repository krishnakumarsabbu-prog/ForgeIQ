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
  up: 'text-emerald-600 bg-emerald-50 border border-emerald-200/60',
  down: 'text-rose-600 bg-rose-50 border border-rose-200/60',
  flat: 'text-slate-500 bg-slate-50 border border-slate-200/60',
}

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {metrics.map((m, i) => (
        <div key={i} className="fi-card p-3.5 flex flex-col justify-between hover:border-sky-300 hover:shadow-harness-lg transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
            {m.icon && (
              <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors duration-200">
                {m.icon}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 tracking-tight">{m.value}</span>
              {m.sub && <span className="text-[10px] text-slate-400">{m.sub}</span>}
            </div>
            {m.trend && m.trendValue && (
              <div className="mt-1.5 flex items-center">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${trendColors[m.trend]}`}>
                  {m.trendValue}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

