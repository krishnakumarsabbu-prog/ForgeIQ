import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Wrench, FlaskConical, Shield, ScanFace, Rocket,
  ArrowRight, Check, Sparkles, SlidersHorizontal, Network,
  ShieldCheck, Play, Eye, Activity, ChevronRight, Terminal,
} from 'lucide-react'

interface StageInfo {
  id: string
  title: string
  badgeType: 'Agent' | 'Automated'
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  bullet: string
  description: string
  agentName: string
  activeExecutions: number
  avgLatency: string
  status: 'active' | 'ready' | 'verified'
  route: string
  color: string
  glow: string
}

const pipelineStages: StageInfo[] = [
  {
    id: 'setup',
    title: 'Self-Service Setup',
    badgeType: 'Agent',
    icon: Zap,
    bullet: 'Takes minutes',
    description: 'Autonomous repository discovery, dependency synthesis, and workspace provisioning.',
    agentName: 'SetupOrchestrator-v2',
    activeExecutions: 3,
    avgLatency: '42s',
    status: 'active',
    route: '/start-engineering',
    color: '#00adef',
    glow: 'rgba(0,173,239,0.25)',
  },
  {
    id: 'build',
    title: 'Intelligent Build',
    badgeType: 'Agent',
    icon: Wrench,
    bullet: 'Fast and secure',
    description: 'Multi-repo deterministic compilation with distributed artifact caching and SBOM generation.',
    agentName: 'BuildSynthesizer-AI',
    activeExecutions: 5,
    avgLatency: '2m 14s',
    status: 'active',
    route: '/build-automation',
    color: '#0a68f4',
    glow: 'rgba(10,104,244,0.25)',
  },
  {
    id: 'tests',
    title: 'AI-Generated Tests',
    badgeType: 'Agent',
    icon: FlaskConical,
    bullet: 'Self healing',
    description: 'Autonomous unit, integration, and regression test generation with self-healing asserts.',
    agentName: 'TestGenie-Agent',
    activeExecutions: 8,
    avgLatency: '1m 30s',
    status: 'active',
    route: '/quality',
    color: '#7c3aed',
    glow: 'rgba(124,58,237,0.25)',
  },
  {
    id: 'security',
    title: 'Inline Security',
    badgeType: 'Agent',
    icon: Shield,
    bullet: 'Shift left',
    description: 'Zero-day vulnerability scanning, SAST/DAST policy verification, and secrets detection.',
    agentName: 'SentinelSec-Agent',
    activeExecutions: 2,
    avgLatency: '55s',
    status: 'active',
    route: '/security',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.25)',
  },
  {
    id: 'governance',
    title: 'Automated Governance',
    badgeType: 'Automated',
    icon: ScanFace,
    bullet: 'Machine speed',
    description: 'Granular policy enforcement, compliance evidence collection, and automated approvals.',
    agentName: 'PolicyEngine-OPA',
    activeExecutions: 1,
    avgLatency: '12s',
    status: 'verified',
    route: '/governance',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.25)',
  },
  {
    id: 'deploy',
    title: 'Progressive Deploy',
    badgeType: 'Automated',
    icon: Rocket,
    bullet: 'Zero touch',
    description: 'Canary rollout, automated rollback upon metric anomaly, and live service verification.',
    agentName: 'CanaryOrchestrator',
    activeExecutions: 4,
    avgLatency: '3m 05s',
    status: 'active',
    route: '/deployments',
    color: '#f43f5e',
    glow: 'rgba(244,63,94,0.25)',
  },
]

function AnimatedConnector({ isSimulating, color }: { isSimulating: boolean; color: string }) {
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: 40, height: 60 }}>
      {/* Line */}
      <div
        className="absolute"
        style={{
          width: '100%',
          height: 2,
          background: `linear-gradient(90deg, ${color}40, ${color}80)`,
        }}
      />
      {/* Animated data particle */}
      {isSimulating && (
        <>
          <div
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}`,
              animation: 'data-stream 0.8s ease-in-out infinite',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: color,
              opacity: 0.6,
              animation: 'data-stream 0.8s ease-in-out 0.4s infinite',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        </>
      )}
      {/* Arrow */}
      <ArrowRight
        size={14}
        style={{
          color,
          position: 'relative',
          zIndex: 2,
          filter: `drop-shadow(0 0 4px ${color})`,
          animation: isSimulating ? 'bounce-x 0.6s ease-in-out infinite' : undefined,
        }}
      />
    </div>
  )
}

export function HarnessPipelineCanvas() {
  const navigate = useNavigate()
  const [selectedStage, setSelectedStage] = useState<StageInfo | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [activeStageIdx, setActiveStageIdx] = useState(-1)

  const handleSimulate = () => {
    setIsSimulating(true)
    setActiveStageIdx(0)
    let idx = 0
    const interval = setInterval(() => {
      idx++
      if (idx >= pipelineStages.length) {
        clearInterval(interval)
        setTimeout(() => {
          setIsSimulating(false)
          setActiveStageIdx(-1)
        }, 600)
      } else {
        setActiveStageIdx(idx)
      }
    }, 500)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(226,232,240,0.9)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -8px rgba(0,14,35,0.08)',
      }}
    >
      {/* ── Header Strip ──────────────────────────────── */}
      <div
        className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(0,173,239,0.04) 0%, rgba(10,104,244,0.02) 50%, rgba(124,58,237,0.02) 100%)',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-7 h-7">
            <span className="absolute w-full h-full rounded-full bg-emerald-500 opacity-20 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative z-10" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Autonomous Delivery Pipeline
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">6 AI Stages · {isSimulating ? 'Executing cycle...' : 'All systems nominal'}</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Sparkles size={9} /> Harness Architecture
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pipelines')}
            className="fi-btn-secondary fi-btn-sm"
          >
            <Eye size={12} /> View Catalog
          </button>
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="fi-btn-primary fi-btn-sm"
          >
            <Play size={11} className={isSimulating ? 'animate-pulse' : ''} />
            {isSimulating ? 'Running...' : 'Run Cycle'}
          </button>
        </div>
      </div>

      {/* ── Blueprint Pipeline Canvas ────────────────── */}
      <div
        className="relative px-6 py-8"
        style={{
          background: '#f8fafc',
          backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          overflowX: 'auto',
        }}
      >
        {/* Pipeline flow row */}
        <div className="flex items-stretch min-w-[800px]" style={{ gap: 0 }}>
          {pipelineStages.map((stage, index) => {
            const isSelected = selectedStage?.id === stage.id
            const isActiveInSim = activeStageIdx === index
            const isPastInSim = isSimulating && activeStageIdx > index
            const Icon = stage.icon
            const isAgent = stage.badgeType === 'Agent'

            return (
              <div key={stage.id} className="flex items-center" style={{ flex: 1 }}>
                {/* Stage Card */}
                <div
                  onClick={() => setSelectedStage(isSelected ? null : stage)}
                  className="holo-card flex-1 p-4 cursor-pointer select-none group"
                  style={{
                    border: isActiveInSim
                      ? `2px solid ${stage.color}`
                      : isSelected
                      ? `1.5px solid ${stage.color}`
                      : isPastInSim
                      ? `1px solid ${stage.color}50`
                      : '1px solid rgba(226,232,240,0.9)',
                    boxShadow: isActiveInSim
                      ? `0 0 0 3px ${stage.glow}, 0 8px 32px -4px ${stage.glow}`
                      : isSelected
                      ? `0 0 0 2px ${stage.glow}, 0 8px 24px -4px ${stage.glow}`
                      : undefined,
                    transform: isActiveInSim ? 'translateY(-6px) scale(1.02)' : undefined,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    background: isPastInSim ? `linear-gradient(135deg, ${stage.color}06, white)` : '#ffffff',
                  }}
                >
                  {/* Top row: badge + indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase border"
                      style={
                        isAgent
                          ? { background: 'rgba(0,173,239,0.08)', color: '#00adef', borderColor: 'rgba(0,173,239,0.2)' }
                          : { background: 'rgba(16,185,129,0.08)', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }
                      }
                    >
                      {stage.badgeType}
                    </span>
                    <div className="flex items-center gap-1">
                      {isActiveInSim && (
                        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: stage.color }} />
                      )}
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: isPastInSim ? stage.color : isActiveInSim ? stage.color : '#10b981',
                          boxShadow: isActiveInSim ? `0 0 6px ${stage.color}` : undefined,
                        }}
                      />
                    </div>
                  </div>

                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all duration-200 group-hover:scale-110"
                    style={{
                      background: `${stage.color}14`,
                      border: `1px solid ${stage.color}25`,
                    }}
                  >
                    <Icon
                      size={17}
                      style={{
                        color: stage.color,
                        filter: isActiveInSim ? `drop-shadow(0 0 6px ${stage.color})` : undefined,
                      }}
                    />
                  </div>

                  {/* Title */}
                  <h4
                    className="text-xs font-black text-slate-900 leading-snug mb-2.5"
                    style={{ color: isSelected || isActiveInSim ? stage.color : undefined }}
                  >
                    {stage.title}
                  </h4>

                  {/* Bullet */}
                  <div
                    className="flex items-center gap-1.5 text-[10px] font-semibold pt-2"
                    style={{ borderTop: '1px solid rgba(226,232,240,0.6)', color: '#64748b' }}
                  >
                    {isPastInSim ? (
                      <Check size={11} style={{ color: stage.color }} />
                    ) : (
                      <Check size={11} className="text-slate-300" />
                    )}
                    <span>{stage.bullet}</span>
                  </div>
                </div>

                {/* Animated connector */}
                {index < pipelineStages.length - 1 && (
                  <AnimatedConnector
                    isSimulating={isSimulating && activeStageIdx > index}
                    color={stage.color}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Selected Stage Detail Panel */}
        {selectedStage && (
          <div
            className="mt-6 min-w-[800px] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
            style={{
              background: `linear-gradient(135deg, ${selectedStage.color}06, white)`,
              border: `1px solid ${selectedStage.color}30`,
              boxShadow: `0 4px 20px -4px ${selectedStage.glow}`,
              animation: 'slide-up-fade 0.25s ease-out',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: `${selectedStage.color}15`,
                  border: `1.5px solid ${selectedStage.color}30`,
                  boxShadow: `0 4px 12px ${selectedStage.glow}`,
                }}
              >
                <selectedStage.icon size={22} style={{ color: selectedStage.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-black text-slate-900">{selectedStage.title}</h4>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                    style={{
                      background: `${selectedStage.color}12`,
                      color: selectedStage.color,
                      border: `1px solid ${selectedStage.color}25`,
                    }}
                  >
                    {selectedStage.agentName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">{selectedStage.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <span
                  className="block text-lg font-black"
                  style={{ color: selectedStage.color }}
                >
                  {selectedStage.activeExecutions}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Active Tasks</span>
              </div>
              <div className="text-center">
                <span className="block text-lg font-black text-emerald-600">{selectedStage.avgLatency}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Avg Latency</span>
              </div>
              <button
                onClick={() => navigate(selectedStage.route)}
                className="fi-btn-primary"
                style={{
                  background: `linear-gradient(135deg, ${selectedStage.color}, ${selectedStage.color}cc)`,
                  boxShadow: `0 4px 14px ${selectedStage.glow}`,
                  border: 'none',
                }}
              >
                Open Stage Studio
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4 Enterprise Pillars ─────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100"
        style={{ borderTop: '1px solid rgba(226,232,240,0.8)', background: 'rgba(248,250,252,0.5)' }}
      >
        {[
          {
            icon: Network,
            color: '#00adef',
            title: 'Governed orchestration.',
            desc: 'Agents deploy inside the release workflows your teams already trust.',
          },
          {
            icon: SlidersHorizontal,
            color: '#7c3aed',
            title: 'Granular autonomy controls.',
            desc: 'Set exactly how much AI can do, per workflow, per environment, per team.',
          },
          {
            icon: Activity,
            color: '#10b981',
            title: 'Full system context.',
            desc: 'Agents decide with pipelines, policies, incidents, and service relationships all linked.',
          },
          {
            icon: ShieldCheck,
            color: '#f59e0b',
            title: 'Four agents, one platform.',
            desc: 'Software Delivery, Security Testing, Runtime Protection, and Cost Management agents share one context graph.',
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className="p-5 group cursor-default transition-all duration-150 hover:bg-white"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all duration-200 group-hover:scale-110"
              style={{ background: `${color}12`, border: `1px solid ${color}25` }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900 font-black">{title}</strong>{' '}
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
