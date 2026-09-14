import React, { useState, useEffect } from 'react'
import {
  Users, CheckCircle2, Award, Sparkles, Sliders, ArrowRight,
  TrendingUp, Activity, Check, RefreshCw
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function TeamAllocationPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [stories, setStories] = useState<any[]>([])
  const [selectedStoryId, setSelectedStoryId] = useState<string>('')
  const [allocation, setAllocation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)

  const initData = async () => {
    try {
      setLoading(true)
      const matrixRes = await api.get<any>('/delivery-intelligence/team-allocation/matrix')
      setTeams(matrixRes.teams || [])
      const storyList = await api.get<any[]>('/delivery-intelligence/stories')
      setStories(storyList || [])
      if (storyList.length > 0) {
        setSelectedStoryId(storyList[0].story_id || storyList[0].id)
        await matchStory(storyList[0].story_id || storyList[0].id)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const matchStory = async (storyId: string) => {
    try {
      setMatching(true)
      const res = await api.post<any>('/delivery-intelligence/team-allocation/recommend', {
        story_id: storyId,
      })
      setAllocation(res)
    } catch (err: any) {
      console.error(err)
    } finally {
      setMatching(false)
    }
  }

  useEffect(() => {
    initData()
  }, [])

  const handleSelectStory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value
    setSelectedStoryId(sId)
    matchStory(sId)
  }

  if (loading && teams.length === 0) {
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Users size={12} /> Team Capability & Story Allocation Matrix
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Intelligent Team Allocation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-factor scoring based on domain skills, available capacity, historical ownership, and WIP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Target Story:</label>
          <select
            value={selectedStoryId}
            onChange={handleSelectStory}
            className="fi-input text-xs py-1.5 px-3 rounded-lg max-w-[240px]"
          >
            {stories.map((st) => (
              <option key={st.story_id || st.id} value={st.story_id || st.id}>
                {st.key} - {st.title.slice(0, 28)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Team Allocation AI Recommendation Banner */}
      {allocation && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Sparkles size={14} /> AI Recommended Assignment
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {allocation.recommended_team?.team_name} (Match Score: {allocation.recommended_team?.match_score}%)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Lead: {allocation.recommended_team?.lead_name} • {allocation.recommended_team?.rationale}
              </p>
            </div>

            <button
              onClick={() => alert(`Assigned ${allocation.story_key} to ${allocation.recommended_team?.team_name}`)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Check size={14} /> Confirm Team Assignment
            </button>
          </div>

          {/* Factor Breakdown Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-amber-500/20 text-xs">
            <div>
              <span className="text-slate-500">Skill Fit (30%):</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {allocation.recommended_team?.factors?.skill_fit_pct}%
              </div>
            </div>
            <div>
              <span className="text-slate-500">Available Capacity (25%):</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {allocation.recommended_team?.factors?.available_capacity_pct}%
              </div>
            </div>
            <div>
              <span className="text-slate-500">Historical Ownership (15%):</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {allocation.recommended_team?.factors?.historical_ownership_pct}%
              </div>
            </div>
            <div>
              <span className="text-slate-500">Dependency Proximity (15%):</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {allocation.recommended_team?.factors?.dependency_proximity_pct}%
              </div>
            </div>
            <div>
              <span className="text-slate-500">WIP Health (10%):</span>
              <div className="font-bold text-slate-900 dark:text-white">
                {allocation.recommended_team?.factors?.wip_health_pct}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Capability Matrix Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Enterprise Team Capability Matrix & Capacity Health
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 hover:border-sky-500/40 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold text-sky-500">
                    [{t.key}]
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {t.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">Lead: {t.lead_name}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {t.members_count} devs
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Usable Capacity:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {t.usable_capacity_hours}h / {t.capacity_hours_per_sprint}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Average Velocity:</span>
                  <span className="font-semibold text-emerald-600">{t.average_velocity} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current WIP:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{t.current_wip} stories</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Core Competencies
                </span>
                <div className="flex flex-wrap gap-1">
                  {t.skills?.map((sk: string) => (
                    <span
                      key={sk}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
