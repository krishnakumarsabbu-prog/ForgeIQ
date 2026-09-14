import React, { useState, useEffect } from 'react'
import {
  ListTodo, CheckCircle2, AlertTriangle, XCircle, Sparkles,
  Scissors, Search, Filter, ShieldAlert, ArrowRight
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function StoryIntelligencePage() {
  const [stories, setStories] = useState<any[]>([])
  const [selectedStory, setSelectedStory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchStories = async () => {
    try {
      setLoading(true)
      const res = await api.get<any[]>('/delivery-intelligence/stories')
      setStories(res)
      if (res.length > 0) {
        setSelectedStory(res[0])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStories()
  }, [])

  if (loading && stories.length === 0) {
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <ListTodo size={12} /> Story Readiness & Quality Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Story Intelligence & DoR Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configurable Definition of Ready validation, acceptance criteria verification, and AI splitting suggestions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Story List */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Backlog & Sprint Stories ({stories.length})
          </div>

          <div className="space-y-2.5">
            {stories.map((st) => {
              const isSelected = selectedStory?.story_id === st.story_id
              return (
                <div
                  key={st.story_id}
                  onClick={() => setSelectedStory(st)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 border-sky-500 shadow-md'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                        {st.key}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                        {st.title}
                      </h4>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        st.dor_score >= 80
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {st.dor_score}% DoR
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                    <span
                      className={
                        st.risk_level === 'CRITICAL'
                          ? 'text-rose-500 font-bold'
                          : st.risk_level === 'HIGH'
                          ? 'text-amber-500 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      Risk: {st.risk_level}
                    </span>
                    {st.split_recommended && (
                      <span className="text-violet-500 font-semibold flex items-center gap-0.5">
                        <Scissors size={11} /> Split Recommended
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right 2 Cols: Detailed Story Inspection */}
        {selectedStory && (
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-mono font-bold text-sky-500">
                    {selectedStory.key}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedStory.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Readiness Score</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedStory.dor_score}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Definition of Ready Checks */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Definition of Ready (DoR) Compliance Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedStory.checks?.map((check: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                        check.met
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/30'
                      }`}
                    >
                      {check.met ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {check.criterion}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          {check.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Story Risk Analysis */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  AI Risk & Failure Prediction
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Risk Severity Rating:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${
                        selectedStory.risk_level === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-600'
                          : selectedStory.risk_level === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}
                    >
                      {selectedStory.risk_level} ({selectedStory.risk_score}%)
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white">Contributing Drivers:</strong> {selectedStory.risk_explanation}
                  </p>
                </div>
              </div>

              {/* Sizing & Story Splitting Recommendations */}
              {selectedStory.split_recommended && (
                <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-bold">
                    <Scissors size={15} /> AI Sizing & Story Splitting Recommendation
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    This story is estimated at 8+ points or carries high ambiguity. Splitting improves flow rate and isolates critical path risk:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                    {selectedStory.split_suggestions?.map((sug: string, i: number) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => alert('Splitting proposal drafted for Jira review')}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold text-xs hover:bg-violet-500 transition-all"
                  >
                    Generate Draft Stories in Jira
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
