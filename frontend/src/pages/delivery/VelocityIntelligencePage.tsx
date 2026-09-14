import React, { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Clock, AlertTriangle, ShieldCheck, Activity,
  Sparkles, CheckCircle2, RefreshCw
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function VelocityIntelligencePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>('/delivery-intelligence/velocity-intelligence')
      setData(res)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  const v = data?.velocity_stats || {}
  const f = data?.flow_metrics || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BarChart3 size={12} /> Causal Velocity & Flow Intelligence
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">{data?.team_name || 'Payments Core'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Velocity & Flow Intelligence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical rolling throughput, cycle/lead times, and explainable root-cause attribution.
          </p>
        </div>
      </div>

      {/* 4 Flow Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Cycle Time</span>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {f.cycle_time_days || 3.4} <span className="text-xs font-normal text-slate-400">days</span>
          </div>
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
            <TrendingUp size={12} /> -0.6d faster than team baseline
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Lead Time</span>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {f.lead_time_days || 8.2} <span className="text-xs font-normal text-slate-400">days</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Backlog commit to production deploy
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Weekly Throughput</span>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {f.throughput_stories_per_week || 6.8} <span className="text-xs font-normal text-slate-400">stories/wk</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Stable velocity of ~38 pts/sprint
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Predictability</span>
          <div className="text-3xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {v.predictability_rating || 'HIGH'}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {v.volatility_pct || 8.5}% historical volatility
          </p>
        </div>
      </div>

      {/* Historical Sprints & Root Cause Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sample Sprints Accuracy */}
        <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Historical Commitment Accuracy
          </h3>
          <div className="space-y-3">
            {v.sample_sprints?.map((s: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.sprint_name}</span>
                  <span className="font-bold text-emerald-600">{s.accuracy_pct}% Accuracy</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Committed: {s.committed} pts</span>
                  <span>Completed: {s.completed} pts</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, s.accuracy_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Root Cause Attribution Narrative */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Sparkles size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              AI Root-Cause Velocity Attribution
            </h3>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {data?.narrative}
          </p>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Velocity Drivers (Points Variation Breakdown)
            </h4>
            <div className="space-y-3">
              {data?.root_cause_attribution?.map((item: any, idx: number) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.driver}</span>
                    <span className="font-bold text-rose-500">{item.impact_points} pts ({item.pct_attribution}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${item.pct_attribution}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
