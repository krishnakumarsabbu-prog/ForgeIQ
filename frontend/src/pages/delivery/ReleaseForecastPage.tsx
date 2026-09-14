import React, { useState, useEffect } from 'react'
import {
  TrendingUp, Calendar, Target, Clock, AlertTriangle, CheckCircle2,
  Sparkles, Layers, ArrowRight
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function ReleaseForecastPage() {
  const [forecast, setForecast] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchForecast = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>('/delivery-intelligence/forecast')
      setForecast(res)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
  }, [])

  if (loading && !forecast) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  const sc = forecast?.scenarios || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <TrendingUp size={12} /> Monte Carlo Quantile Forecasting
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Release Runway & Epic Forecasting
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Probabilistic completion timelines, target-date confidence, and scope buffer simulation.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400">Target Date Confidence</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {forecast?.target_date_confidence_pct}%
          </div>
        </div>
      </div>

      {/* 3 Quantile Scenarios Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Optimistic (P90) */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase text-emerald-600">
              Optimistic (P90)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
              Top 10%
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {sc.optimistic?.completion_date}
          </div>
          <p className="text-xs text-slate-500">
            {sc.optimistic?.weeks_needed} weeks needed • {sc.optimistic?.assumptions}
          </p>
        </div>

        {/* Expected (P50) */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-sky-500/50 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase text-sky-600">
              Expected (P50 Median)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600">
              Most Likely
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {sc.expected?.completion_date}
          </div>
          <p className="text-xs text-slate-500">
            {sc.expected?.weeks_needed} weeks needed • {sc.expected?.assumptions}
          </p>
        </div>

        {/* Conservative (P10) */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase text-amber-600">
              Conservative (P10)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
              90% Confidence
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {sc.conservative?.completion_date}
          </div>
          <p className="text-xs text-slate-500">
            {sc.conservative?.weeks_needed} weeks needed • {sc.conservative?.assumptions}
          </p>
        </div>
      </div>

      {/* Scope Buffer & Deferrable Backlog Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={16} className="text-sky-500" />
            Release Runway Scope
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Release Scope:</span>
              <span className="font-semibold">{forecast?.total_points} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Completed to Date:</span>
              <span className="font-semibold text-emerald-600">{forecast?.completed_points} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Remaining Backlog:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{forecast?.remaining_points} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Recommended Scope Buffer:</span>
              <span className="font-semibold text-indigo-500">+{forecast?.scope_buffer_points} pts (15%)</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Candidate Deferrable Work for Target Date Guarantee
            </h3>
            <span className="text-xs text-slate-400">
              Low-impact stories to descope if needed
            </span>
          </div>

          <div className="space-y-2.5">
            {forecast?.deferrable_stories?.map((st: any) => (
              <div
                key={st.key}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex justify-between items-center"
              >
                <div>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400 mr-2">
                    {st.key}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {st.title}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">{st.points} pts</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Impact: {st.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
