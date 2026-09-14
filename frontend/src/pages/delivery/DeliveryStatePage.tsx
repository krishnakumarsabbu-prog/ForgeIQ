import React, { useState, useEffect } from 'react'
import {
  Target, Network, Activity, Clock, ShieldCheck, Zap,
  CheckCircle2, AlertTriangle, Layers, ArrowRight, RefreshCw
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function DeliveryStatePage() {
  const [delState, setDelState] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchState = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>('/delivery-intelligence/state')
      setDelState(res)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
  }, [])

  if (loading && !delState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Target size={12} /> Canonical Intelligence State Model
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Delivery State
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable snapshot of active products, sprints, team capacities, dependencies, and delivery risk posture.
          </p>
        </div>

        <button
          onClick={fetchState}
          className="fi-btn-secondary inline-flex items-center gap-1.5 text-xs px-3.5 py-2 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh State
        </button>
      </div>

      {/* Dual State Architecture Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/20 shadow-sm flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-sky-500 text-white shrink-0 mt-0.5">
          <Network size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            ForgeIQ Dual State Architecture: Engineering State + Delivery State
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            ForgeIQ couples technical software reality (repositories, branches, APIs, test suites, builds, and runtime pods) 
            with business delivery reality (sprint goals, team capacity, story point burnup, and cross-team dependencies). 
            This enables automatic diagnosis and one-click remediation when delivery blockers are detected.
          </p>
        </div>
      </div>

      {/* State Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Health Index</span>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {delState.health_index || 85.0}
          </div>
          <p className="text-xs text-emerald-600 mt-2">Aggregate cross-team score</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Goal Confidence</span>
          <div className="text-3xl font-bold text-sky-600 mt-1">
            {delState.goal_confidence || 88.0}%
          </div>
          <p className="text-xs text-slate-500 mt-2">P(Success) quantile score</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Blocked Time</span>
          <div className="text-3xl font-bold text-amber-500 mt-1">
            {delState.blocked_time_hours || 14.5}h
          </div>
          <p className="text-xs text-slate-500 mt-2">Cumulative blocker duration</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">WIP Stories</span>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {delState.wip_items || 5}
          </div>
          <p className="text-xs text-slate-500 mt-2">Active in-flight development</p>
        </div>
      </div>

      {/* Raw State Tree Explorer */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Canonical Delivery State Attributes
        </h3>
        <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
          <pre>{JSON.stringify(delState, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
