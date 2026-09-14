import React, { useState, useEffect } from 'react'
import {
  Calendar, RefreshCw, Sparkles, Target, Users, Clock, AlertTriangle,
  CheckCircle2, Plus, ArrowRight, Sliders, Check
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function SprintPlannerPage() {
  const [sprint, setSprint] = useState<any>(null)
  const [stories, setStories] = useState<any[]>([])
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([])
  const [ptoHours, setPtoHours] = useState<number>(60)
  const [simulation, setSimulation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)

  const initData = async () => {
    try {
      setLoading(true)
      const sprints = await api.get<any[]>('/delivery-intelligence/sprints')
      const active = sprints.find((s) => s.status === 'ACTIVE') || sprints[0]
      if (active) {
        setSprint(active)
        setPtoHours(active.pto_hours_deducted || 60)
        const sData = await api.get<any>(`/delivery-intelligence/sprints/${active.id}`)
        const allStories = await api.get<any[]>('/delivery-intelligence/stories')
        setStories(allStories)
        const initSelected = sData.stories?.map((st: any) => st.id) || allStories.slice(0, 4).map((st: any) => st.id)
        setSelectedStoryIds(initSelected)
        // Run initial simulation
        await runSimulation(active.id, initSelected, active.pto_hours_deducted || 60)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const runSimulation = async (sprintId: string, storyIds: string[], pto: number) => {
    try {
      setSimulating(true)
      const res = await api.post<any>('/delivery-intelligence/sprint-planner/simulate', {
        sprint_id: sprintId,
        selected_story_ids: storyIds,
        simulated_pto_hours: pto,
      })
      setSimulation(res)
    } catch (err: any) {
      console.error(err)
    } finally {
      setSimulating(false)
    }
  }

  useEffect(() => {
    initData()
  }, [])

  const handleToggleStory = (storyId: string) => {
    const updated = selectedStoryIds.includes(storyId)
      ? selectedStoryIds.filter((id) => id !== storyId)
      : [...selectedStoryIds, storyId]
    setSelectedStoryIds(updated)
    if (sprint) {
      runSimulation(sprint.id, updated, ptoHours)
    }
  }

  const handlePtoChange = (val: number) => {
    setPtoHours(val)
    if (sprint) {
      runSimulation(sprint.id, selectedStoryIds, val)
    }
  }

  if (loading && !sprint) {
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Calendar size={12} /> AI Planning & What-If Simulation
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">{sprint?.team_name || 'Payments Core'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Sprint Scope & Capacity Simulator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluate commit capacity, historical velocity, and simulate goal achievement probability.
          </p>
        </div>

        <button
          onClick={() => runSimulation(sprint.id, selectedStoryIds, ptoHours)}
          className="fi-btn-primary inline-flex items-center gap-1.5 text-xs px-4 py-2 self-start sm:self-auto"
        >
          <Sparkles size={13} />
          {simulating ? 'Simulating...' : 'Recalculate Goal Prob'}
        </button>
      </div>

      {/* Simulation Result Banner */}
      {simulation && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/20 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Goal Achievement Prob
            </span>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {simulation.predicted_goal_achievement_prob}%
            </div>
            <span
              className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                simulation.status === 'ON_TRACK'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              {simulation.status}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Selected Scope
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {simulation.total_selected_points} <span className="text-xs font-normal text-slate-400">pts</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Load Factor: {simulation.load_factor_pct}% of capacity
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Usable Capacity
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {simulation.max_capacity_points} <span className="text-xs font-normal text-slate-400">pts</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {simulation.usable_capacity_hours}h usable ({ptoHours}h PTO)
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1 mb-1">
              <Sparkles size={12} /> AI Planner Rationale:
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {simulation.recommendation}
            </p>
          </div>
        </div>
      )}

      {/* Simulator Controls & Backlog Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Capacity & Variable Slider */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders size={16} className="text-sky-500" />
              What-If Capacity Variables
            </h3>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">Scheduled PTO / Leave</span>
                <span className="font-bold text-slate-900 dark:text-white">{ptoHours} Hours</span>
              </div>
              <input
                type="range"
                min="0"
                max="160"
                step="8"
                value={ptoHours}
                onChange={(e) => handlePtoChange(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Simulate impact if senior engineers take unexpected leave
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Working Days:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">10 Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Focus Factor:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">80%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Historical Velocity (Median):</span>
                <span className="font-semibold text-emerald-600">38.0 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Predictability Rating:</span>
                <span className="font-semibold text-sky-500">HIGH (8.5% volatility)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Backlog Story Selection */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Backlog Candidates ({selectedStoryIds.length} of {stories.length} selected)
            </h3>
            <span className="text-xs text-slate-500">
              Toggle stories to simulate scope impact
            </span>
          </div>

          <div className="space-y-2.5">
            {stories.map((st) => {
              const isSelected = selectedStoryIds.includes(st.story_id || st.id)
              return (
                <div
                  key={st.story_id || st.id}
                  onClick={() => handleToggleStory(st.story_id || st.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-500/50 shadow-sm'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-sky-500 border-sky-500 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {st.key}
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {st.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span>DoR: {st.dor_score || st.definition_of_ready_score}%</span>
                        <span>•</span>
                        <span
                          className={
                            st.risk_level === 'CRITICAL'
                              ? 'text-rose-500 font-semibold'
                              : st.risk_level === 'HIGH'
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }
                        >
                          Risk: {st.risk_level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {st.points || 5} pts
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
