import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, ShieldAlert, CheckCircle2, Zap, ArrowRight,
  Sparkles, Filter, RefreshCw, Layers
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function RiskCenterPage() {
  const [risks, setRisks] = useState<any[]>([])
  const [selectedRisk, setSelectedRisk] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [remediating, setRemediating] = useState(false)
  const [remediationMsg, setRemediationMsg] = useState<string | null>(null)

  const fetchRisks = async () => {
    try {
      setLoading(true)
      const res = await api.get<any[]>('/delivery-intelligence/risks')
      setRisks(res)
      if (res.length > 0) {
        setSelectedRisk(res[0])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemediate = async (storyId: string) => {
    try {
      setRemediating(true)
      const res = await api.post<any>(`/delivery-intelligence/cross-domain/remediate/${storyId}`)
      setRemediationMsg(res.message)
      await fetchRisks()
    } catch (err: any) {
      alert('Remediation error: ' + err.message)
    } finally {
      setRemediating(false)
    }
  }

  useEffect(() => {
    fetchRisks()
  }, [])

  if (loading && risks.length === 0) {
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle size={12} /> Predictive Early Warning Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Delivery Risk Radar & Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Classified delivery risks, root causes, and automated cross-domain engineering remedies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Risk List */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Identified Risks ({risks.length})
          </div>

          <div className="space-y-2.5">
            {risks.map((r) => {
              const isSelected = selectedRisk?.id === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRisk(r)
                    setRemediationMsg(null)
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 border-sky-500 shadow-md'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        r.severity === 'CRITICAL'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : r.severity === 'HIGH'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {r.severity}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {r.urgency}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2 line-clamp-2">
                    {r.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {r.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right 2 Cols: Risk Details & Action Hub */}
        {selectedRisk && (
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-slate-400">
                    Category: {selectedRisk.category}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedRisk.title}
                  </h2>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    selectedRisk.severity === 'CRITICAL'
                      ? 'bg-rose-500/10 text-rose-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  {selectedRisk.severity}
                </span>
              </div>

              {/* Impact / Prob Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                <div>
                  <span className="text-slate-400">Probability:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {Math.round((selectedRisk.probability || 0.5) * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Impact Score:</span>
                  <div className="font-bold text-rose-500 mt-0.5">
                    {Math.round((selectedRisk.impact || 0.6) * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Time Urgency:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedRisk.urgency}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <div className="font-bold text-emerald-600 mt-0.5">
                    {selectedRisk.status}
                  </div>
                </div>
              </div>

              {/* Root Cause & Remediation */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">Identified Root Cause</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedRisk.root_cause}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-500/20 text-xs space-y-2">
                  <h4 className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> AI Recommended Remediation
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedRisk.remediation_suggested}
                  </p>

                  {selectedRisk.affected_story_ids?.length > 0 && (
                    <button
                      disabled={remediating}
                      onClick={() => handleRemediate(selectedRisk.affected_story_ids[0])}
                      className="mt-2 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all inline-flex items-center gap-1.5"
                    >
                      <Zap size={13} />
                      {remediating ? 'Executing Remediation Harness...' : 'Execute Remediation in ForgeIQ'}
                    </button>
                  )}
                </div>

                {remediationMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={15} /> {remediationMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
