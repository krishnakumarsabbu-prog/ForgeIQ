import React, { useState, useEffect } from 'react'
import {
  GitBranch, AlertTriangle, ShieldCheck, Zap, Activity, Filter,
  Sparkles, Clock, ChevronRight, Layers, ArrowRight
} from 'lucide-react'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/PageHeader'

export default function DeliveryDependencyGraphPage() {
  const [graphData, setGraphData] = useState<any>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [slipSimulation, setSlipSimulation] = useState<any>(null)
  const [slipDays, setSlipDays] = useState<number>(2)
  const [loading, setLoading] = useState(true)

  const fetchGraph = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>('/delivery-intelligence/dependency-graph')
      setGraphData(res)
      if (res.nodes?.length > 0) {
        setSelectedNode(res.nodes[0])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const runSlipSimulation = async (depId: string, days: number) => {
    try {
      const res = await api.post<any>('/delivery-intelligence/dependency-graph/simulate-slip', {
        dependency_id: depId,
        slip_days: days,
      })
      setSlipSimulation(res)
    } catch (err: any) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchGraph()
  }, [])

  if (loading && !graphData) {
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
              <GitBranch size={12} /> Delivery Graph Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Delivery Dependency & Critical Path Graph
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Inter-team relationships, critical path delays, and transitive blast radius simulation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 font-semibold border border-rose-500/20">
            {graphData?.critical_path_dependencies || 2} Critical Paths
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
            {graphData?.aging_dependencies || 1} Aging Blockers
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Graph Topology Canvas */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Topology Nodes ({graphData?.nodes?.length || 0})
            </h3>
            <span className="text-[11px] text-slate-400">
              Click node to inspect dependencies
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {graphData?.nodes?.map((node: any) => {
              const isSelected = selectedNode?.id === node.id
              const isCritical = node.status === 'CRITICAL' || node.is_blocked
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-500 shadow-md'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {node.type}
                    </span>
                    {isCritical && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500">
                        BLOCKED / CRITICAL
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2 line-clamp-1">
                    {node.full_title || node.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {node.details}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Dependency Edges List */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Critical Path Edges & Blast Radius
            </h4>
            <div className="space-y-2">
              {graphData?.edges?.map((e: any) => (
                <div
                  key={e.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {e.source}
                      </span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="font-semibold text-sky-600 dark:text-sky-400">
                        {e.target}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                        {e.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {e.impact_description}
                    </p>
                  </div>

                  <button
                    onClick={() => runSlipSimulation(e.id, slipDays)}
                    className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 font-semibold text-[11px] self-start sm:self-auto shrink-0"
                  >
                    Simulate +{slipDays}d Slip
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Node Inspector & Slip Simulation */}
        <div className="space-y-4">
          {selectedNode && (
            <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                Selected Graph Entity
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedNode.full_title || selectedNode.label}
              </h3>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Node Type:</span>
                  <span className="font-semibold">{selectedNode.type}</span>
                </div>
                {selectedNode.key && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Story Key:</span>
                    <span className="font-mono font-semibold">{selectedNode.key}</span>
                  </div>
                )}
                {selectedNode.risk_level && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk Level:</span>
                    <span className="font-bold text-rose-500">{selectedNode.risk_level}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upstream Slip Simulation Result */}
          {slipSimulation && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <Sparkles size={14} /> Blast Radius Simulation (+{slipSimulation.slip_days} Days)
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {slipSimulation.impact_summary}
              </p>
              <div className="pt-2 border-t border-amber-500/20 space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-rose-600">
                  <span>Sprint Goal Confidence:</span>
                  <span>-{slipSimulation.sprint_goal_probability_reduction_pct}%</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Downstream Delay:</span>
                  <span>{slipSimulation.downstream_delay_hours}h</span>
                </div>
              </div>
              <div className="p-2.5 rounded bg-white/60 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Mitigation:</strong> {slipSimulation.recommended_mitigation}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
