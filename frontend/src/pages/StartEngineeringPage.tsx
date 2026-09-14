import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateEngineeringPlan, useApproveEngineeringPlan, useRejectEngineeringPlan, useExecuteEngineeringPlan, useModifyPlanStage } from '../hooks/useQueries'
import { PageHeader, RiskBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer } from '../components/ui/SideDrawer'
import {
  Rocket, FileText, CheckCircle2, XCircle, Play, Edit3, ChevronDown, ChevronRight,
  Cpu, Shield, GitBranch, Layers, Clock, DollarSign, Hash, AlertTriangle, ArrowRight,
  Sparkles, Zap, Brain, Code2, Terminal, ChevronLeft,
} from 'lucide-react'
import type { EngineeringPlan, PlanStage } from '../types'

const EXAMPLES = [
  'Build a React ecommerce application with product catalog, cart, checkout and authentication.',
  'Build a Python FastAPI microservice for order management with PostgreSQL and Redis caching.',
  'Build a Spring Boot REST API for payment processing with idempotency, retry support, and SCA compliance.',
  'Build a real-time analytics dashboard with React, WebSocket feeds, and ECharts visualization.',
]

const STAGE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  setup: Zap,
  build: Code2,
  test: Terminal,
  security: Shield,
  governance: FileText,
  deploy: Rocket,
}

function getStageIcon(stageType: string) {
  const key = stageType?.toLowerCase()
  for (const k of Object.keys(STAGE_ICONS)) {
    if (key?.includes(k)) return STAGE_ICONS[k]
  }
  return Layers
}

function StageFlowCard({
  stage,
  idx,
  expanded,
  onToggle,
  onEdit,
  isDraft,
}: {
  stage: PlanStage
  idx: number
  expanded: boolean
  onToggle: () => void
  onEdit?: () => void
  isDraft: boolean
}) {
  const Icon = getStageIcon(stage.stage_type)
  const colors = [
    { bg: 'rgba(0,173,239,0.1)', border: 'rgba(0,173,239,0.3)', text: '#00adef', dot: '#00adef' },
    { bg: 'rgba(10,104,244,0.1)', border: 'rgba(10,104,244,0.3)', text: '#0a68f4', dot: '#0a68f4' },
    { bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.3)', text: '#7c3aed', dot: '#7c3aed' },
    { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#10b981', dot: '#10b981' },
    { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', dot: '#f59e0b' },
    { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)', text: '#f43f5e', dot: '#f43f5e' },
  ]
  const c = colors[idx % colors.length]

  return (
    <div
      className={`stage-flow-node ${expanded ? 'expanded' : ''}`}
      style={{ animationDelay: `${idx * 0.08}s`, animation: 'card-enter 0.4s ease-out forwards' }}
    >
      {/* Left colored accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[13px]"
        style={{ background: `linear-gradient(180deg, ${c.dot}, transparent)` }}
      />

      <div className="pl-3 flex items-center justify-between gap-3 cursor-pointer" onClick={onToggle}>
        {/* Stage number badge */}
        <div
          className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-black"
          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
        >
          {idx + 1}
        </div>

        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <Icon size={14} style={{ color: c.text }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{stage.label}</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
              style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
            >
              {stage.stage_type}
            </span>
            {stage.approval_required && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Gate Required
              </span>
            )}
            {stage.status === 'modified' && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                Modified
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{stage.description}</p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ background: 'rgba(100,116,139,0.1)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }}
          >
            {stage.environment}
          </span>
          {isDraft && (
            <button
              onClick={e => { e.stopPropagation(); onEdit?.() }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <Edit3 size={13} />
            </button>
          )}
          <div className="text-slate-300">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 ml-3 pl-3 border-l-2 border-dashed border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Harness</p>
              <p className="font-semibold text-slate-700">{stage.harness_name || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Agents</p>
              <div className="flex flex-wrap gap-1">
                {stage.agent_names.length > 0 ? stage.agent_names.map(a => (
                  <span key={a} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">{a}</span>
                )) : <span className="text-slate-400">None assigned</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tools</p>
              <div className="flex flex-wrap gap-1">
                {stage.tool_names.length > 0 ? stage.tool_names.map(t => (
                  <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{t}</span>
                )) : <span className="text-slate-400">None</span>}
              </div>
            </div>
            {stage.skill_names.length > 0 && (
              <div className="col-span-1 sm:col-span-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {stage.skill_names.map(s => (
                    <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StartEngineeringPage() {
  const navigate = useNavigate()
  const [requirementText, setRequirementText] = useState('')
  const [plan, setPlan] = useState<EngineeringPlan | null>(null)
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set())
  const [editingStage, setEditingStage] = useState<PlanStage | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveReason, setApproveReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const createPlan = useCreateEngineeringPlan()
  const approvePlan = useApproveEngineeringPlan()
  const rejectPlan = useRejectEngineeringPlan()
  const executePlan = useExecuteEngineeringPlan()
  const modifyStage = useModifyPlanStage()

  const handleGenerate = () => {
    if (!requirementText.trim()) return
    createPlan.mutate(
      { requirement_text: requirementText },
      {
        onSuccess: (data) => {
          setPlan(data)
          setExpandedStages(new Set([0]))
        },
      },
    )
  }

  const handleApprove = () => {
    if (!plan) return
    approvePlan.mutate(
      { id: plan.id, body: { decided_by: 'Engineering Lead', reason: approveReason || 'Plan approved' } },
      { onSuccess: (data) => { setPlan(data) } },
    )
  }

  const handleReject = () => {
    if (!plan) return
    rejectPlan.mutate(
      { id: plan.id, body: { decided_by: 'Engineering Lead', reason: rejectReason || 'Plan rejected' } },
      { onSuccess: (data) => { setPlan(data); setShowRejectInput(false) } },
    )
  }

  const handleExecute = () => {
    if (!plan) return
    executePlan.mutate(plan.id, {
      onSuccess: (data) => { navigate(`/executions/${data.execution_id}`) },
    })
  }

  const handleStageEdit = (stage: PlanStage, modifications: Record<string, unknown>) => {
    if (!plan) return
    modifyStage.mutate(
      { planId: plan.id, stageId: stage.id, body: modifications },
      { onSuccess: (data) => { setPlan(data); setEditingStage(null) } },
    )
  }

  const toggleStage = (order: number) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order)
      else next.add(order)
      return next
    })
  }

  return (
    <>
      <PageHeader
        title="Start Engineering"
        description="Transform a business requirement into a governed, AI-powered engineering execution plan"
        badge="AI-Powered"
        badgeVariant="cyan"
        icon={<Rocket size={18} />}
        breadcrumbs={[
          { label: 'Applications', to: '/applications' },
          { label: 'Start Engineering' },
        ]}
      />

      <div className="p-6 space-y-5 max-w-5xl mx-auto">

        {/* ── Requirement Input Hero ─────────────────────────────── */}
        {!plan && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(226,232,240,0.9)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -8px rgba(0,14,35,0.08)',
            }}
          >
            {/* Card header */}
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(0,173,239,0.05) 0%, rgba(10,104,244,0.03) 50%, rgba(124,58,237,0.03) 100%)',
                borderBottom: '1px solid rgba(226,232,240,0.8)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,173,239,0.15), rgba(10,104,244,0.1))',
                  border: '1px solid rgba(0,173,239,0.25)',
                  boxShadow: '0 0 12px rgba(0,173,239,0.15)',
                }}
              >
                <Brain size={18} style={{ color: '#00adef' }} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Business Requirement</h2>
                <p className="text-xs text-slate-500">Describe what you want to build — ForgeIQ will architect it with AI precision.</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: 'rgba(0,173,239,0.08)', color: '#00adef', border: '1px solid rgba(0,173,239,0.2)' }}
                >
                  <Sparkles size={10} />
                  ForgeIQ AI
                </span>
              </div>
            </div>

            {/* Input area */}
            <div className="p-6">
              <div className="req-input-wrapper mb-4">
                <textarea
                  value={requirementText}
                  onChange={e => setRequirementText(e.target.value)}
                  placeholder="Example: Build a React ecommerce application with product catalog, cart, checkout and authentication."
                  className="w-full min-h-[140px] px-5 py-4 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-[18px] outline-none resize-y leading-relaxed"
                  disabled={createPlan.isPending}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              {/* Quick examples */}
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">Quick Start Examples</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setRequirementText(ex)}
                      className="example-chip"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: ['#00adef', '#0a68f4', '#7c3aed', '#10b981'][i],
                        }}
                      />
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button — full width, spectacular */}
              <button
                onClick={handleGenerate}
                disabled={!requirementText.trim() || createPlan.isPending}
                className="fi-btn-forge w-full"
                style={{ minHeight: '52px', fontSize: '14px' }}
              >
                {createPlan.isPending ? (
                  <>
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0"
                    />
                    <span>Generating Your Engineering Plan...</span>
                  </>
                ) : (
                  <>
                    <Rocket size={18} className="shrink-0" />
                    <span>Generate Engineering Plan</span>
                    <ArrowRight size={16} className="ml-1 animate-bounce-x" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Plan Display ──────────────────────────────────────── */}
        {plan && (
          <>
            {/* Plan Summary Hero */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0b0f19 0%, #0f1d35 60%, #1a0f35 100%)',
                border: '1px solid rgba(0,173,239,0.2)',
                boxShadow: '0 8px 40px -8px rgba(0,173,239,0.25), 0 0 0 1px rgba(0,173,239,0.1)',
              }}
            >
              {/* Dot grid overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(0,173,239,0.12) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  borderRadius: '16px',
                }}
              />
              <div className="relative px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(0,173,239,0.2)', border: '1px solid rgba(0,173,239,0.3)' }}
                      >
                        <Cpu size={14} style={{ color: '#00adef' }} />
                      </div>
                      <h2 className="text-lg font-black text-white tracking-tight">{plan.application_name}</h2>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
                        style={{ background: 'rgba(0,173,239,0.15)', color: '#7dd3fc', border: '1px solid rgba(0,173,239,0.25)' }}
                      >
                        {plan.application_type}
                      </span>
                      <RiskBadge level={plan.risk_level} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{plan.requirement_text}</p>
                  </div>
                  <button
                    onClick={() => { setPlan(null); setRequirementText('') }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <ChevronLeft size={13} /> Start Over
                  </button>
                </div>

                {/* Plan metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { icon: Clock, label: 'Est. Duration', value: `${Math.ceil(plan.estimated_duration_seconds / 60)} min`, color: '#00adef' },
                    { icon: DollarSign, label: 'Est. Cost', value: `$${(plan.estimated_cost_cents / 100).toFixed(2)}`, color: '#10b981' },
                    { icon: Hash, label: 'Est. Tokens', value: `${(plan.estimated_tokens / 1000).toFixed(0)}K`, color: '#7c3aed' },
                    { icon: Layers, label: 'Stages', value: plan.stages.length.toString(), color: '#f59e0b' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${color}20`, border: `1px solid ${color}30` }}
                      >
                        <Icon size={14} style={{ color }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-black text-white">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            {plan.risk_factors.length > 0 && (
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Risk Assessment</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.risk_factors.map((factor, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      <AlertTriangle size={10} />
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Architecture */}
            <div className="fi-card overflow-hidden">
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid rgba(226,232,240,0.7)', background: 'rgba(248,250,252,0.5)' }}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(0,173,239,0.1)', border: '1px solid rgba(0,173,239,0.2)' }}>
                  <Cpu size={12} style={{ color: '#00adef' }} />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Architecture Blueprint</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-700 leading-relaxed mb-4">{plan.architecture_summary}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {plan.architecture_components.map(comp => (
                    <div
                      key={comp}
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 text-center transition-all duration-150 hover:shadow-sm"
                      style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.8)' }}
                    >
                      {comp}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plan.technologies.map(tech => (
                    <span
                      key={tech}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: 'rgba(0,173,239,0.08)', color: '#0284c7', border: '1px solid rgba(0,173,239,0.15)' }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Repository Config */}
            <div className="fi-card overflow-hidden">
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid rgba(226,232,240,0.7)', background: 'rgba(248,250,252,0.5)' }}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <GitBranch size={12} style={{ color: '#10b981' }} />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Repository Configuration</h3>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'URL', value: plan.repository_config.url as string },
                  { label: 'Branch', value: plan.repository_config.branch as string },
                  { label: 'Provider', value: plan.repository_config.provider as string },
                  { label: 'Initialize', value: plan.repository_config.initialize ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                    <p className="text-sm font-mono text-slate-800 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Harnesses */}
            {plan.recommended_harnesses.length > 0 && (
              <div className="fi-card p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Recommended Harnesses</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {plan.recommended_harnesses.map(h => (
                    <div
                      key={h.id}
                      className="px-3 py-2.5 rounded-xl transition-all duration-150 hover:shadow-sm"
                      style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}
                    >
                      <p className="text-sm font-bold text-slate-900">{h.name}</p>
                      <p className="text-[11px] text-slate-500">{h.type} / {h.environment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engineering Flow — Spectacular stage list */}
            <div className="fi-card overflow-hidden">
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(226,232,240,0.7)', background: 'rgba(248,250,252,0.5)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Layers size={12} style={{ color: '#6366f1' }} />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Engineering Flow</h3>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}
                  >
                    {plan.stages.length} Stages
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (expandedStages.size === plan.stages.length) {
                      setExpandedStages(new Set())
                    } else {
                      setExpandedStages(new Set(plan.stages.map(s => s.order)))
                    }
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {expandedStages.size === plan.stages.length ? 'Collapse all' : 'Expand all'}
                </button>
              </div>
              <div className="p-4 space-y-2">
                {plan.stages.map((stage, idx) => (
                  <StageFlowCard
                    key={stage.id}
                    stage={stage}
                    idx={idx}
                    expanded={expandedStages.has(stage.order)}
                    onToggle={() => toggleStage(stage.order)}
                    onEdit={() => setEditingStage(stage)}
                    isDraft={plan.status === 'draft'}
                  />
                ))}
              </div>
            </div>

            {/* Approval / Action Bar — DRAFT */}
            {plan.status === 'draft' && (
              <div className="fi-card overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                        <FileText size={13} style={{ color: '#64748b' }} />
                      </div>
                      <span className="text-sm text-slate-600 font-medium">Review the plan above, then approve or reject to proceed.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowRejectInput(!showRejectInput)}
                        className="fi-button-secondary"
                      >
                        <XCircle size={15} /> Reject
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={approvePlan.isPending}
                        className="fi-button-primary"
                        style={{ background: 'linear-gradient(135deg, #10b981, #0891b2)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
                      >
                        {approvePlan.isPending ? (
                          <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Approving...</>
                        ) : (
                          <><CheckCircle2 size={15} /> Approve Plan</>
                        )}
                      </button>
                    </div>
                  </div>
                  {showRejectInput && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                      />
                      <button
                        onClick={handleReject}
                        disabled={rejectPlan.isPending}
                        className="fi-button-secondary"
                        style={{ color: '#e11d48', borderColor: 'rgba(244,63,94,0.3)' }}
                      >
                        Confirm Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approved state */}
            {plan.status === 'approved' && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(8,145,178,0.04))', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Plan Approved ✓</p>
                      <p className="text-xs text-slate-500">by {plan.decided_by} — Application created and ready to execute</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/applications/${plan.application_id}`)}
                      className="fi-button-secondary"
                    >
                      View Application
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={executePlan.isPending}
                      className="fi-btn-forge"
                    >
                      {executePlan.isPending ? (
                        <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Starting...</>
                      ) : (
                        <><Play size={15} /> Execute Engineering Plan</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected state */}
            {plan.status === 'rejected' && (
              <div
                className="rounded-2xl"
                style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.2)' }}
              >
                <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}>
                      <XCircle size={18} style={{ color: '#f43f5e' }} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Plan Rejected</p>
                      <p className="text-xs text-slate-500">by {plan.decided_by}: {plan.decision_reason}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setPlan(null); setRequirementText('') }}
                    className="fi-button-secondary"
                  >
                    <ChevronLeft size={14} /> Start Over
                  </button>
                </div>
              </div>
            )}

            {/* Executing state */}
            {plan.status === 'executing' && plan.execution_id && (
              <div
                className="rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(0,173,239,0.06), rgba(10,104,244,0.04))', border: '1px solid rgba(0,173,239,0.2)' }}
              >
                <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,173,239,0.1)', border: '1px solid rgba(0,173,239,0.25)' }}>
                      <div className="w-5 h-5 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Execution in progress</p>
                      <p className="text-xs text-slate-500">Your engineering plan is now being executed autonomously.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/executions/${plan.execution_id}`)}
                    className="fi-button-primary"
                  >
                    View Execution <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stage Edit Drawer */}
      <SideDrawer
        open={!!editingStage}
        onClose={() => setEditingStage(null)}
        title="Modify Stage"
        subtitle={editingStage?.label}
        width="440px"
        footer={
          editingStage && (
            <button
              onClick={() => handleStageEdit(editingStage, {
                approval_required: editingStage.approval_required,
                environment: editingStage.environment,
                description: editingStage.description,
              })}
              className="fi-button-primary"
            >
              Save Changes
            </button>
          )
        }
      >
        {editingStage && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide font-bold">Description</label>
              <textarea
                value={editingStage.description}
                onChange={e => setEditingStage({ ...editingStage, description: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide font-bold">Environment</label>
              <select
                value={editingStage.environment}
                onChange={e => setEditingStage({ ...editingStage, environment: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="approval-required"
                checked={editingStage.approval_required}
                onChange={e => setEditingStage({ ...editingStage, approval_required: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="approval-required" className="text-sm text-slate-700">Approval required for this stage</label>
            </div>
          </div>
        )}
      </SideDrawer>
    </>
  )
}
