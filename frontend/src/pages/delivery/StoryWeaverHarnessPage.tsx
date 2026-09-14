import React, { useState, useEffect } from 'react'
import {
  Sparkles, Bot, GitBranch, CheckCircle2, Play, RefreshCw,
  Clock, ArrowRight, Code2, ShieldAlert, ChevronDown, ChevronUp,
  FileCode2, Check, AlertCircle, Layers, Cpu, ExternalLink,
  Flame, Terminal, Zap, CheckCircle
} from 'lucide-react'
import { api } from '../../api/client'
import DeliverySubNav from '../../features/delivery/DeliverySubNav'
import { LoadingSpinner } from '../../components/ui/PageHeader'

const PRESET_REQUIREMENTS = [
  {
    title: 'Instant SEPA Payment Settlement with Auto-Reversal & Ledger Lock',
    text: 'Implement high-throughput SEPA instant payment processing with guaranteed idempotency, distributed lock management with Redis, Kafka double-entry audit event emission, and merchant webhook notifications with exponential backoff.'
  },
  {
    title: 'Enterprise Multi-Tenant SSO Gateway with Okta & SAML 2.0',
    text: 'Implement enterprise SSO supporting SAML 2.0 and OIDC identity providers with Okta and Azure AD. Include fine-grained Role-Based Access Control (RBAC) scope guard middleware, session revocation lists, and audit trails.'
  },
  {
    title: 'Real-Time Fraud Velocity Scoring & Dynamic Rate Limiting Engine',
    text: 'Build a streaming fraud risk scoring engine that evaluates transaction velocity against IP and device fingerprint in under 15ms. Apply adaptive rate limiting and automated step-up MFA triggers.'
  }
]

export default function StoryWeaverHarnessPage() {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [reqTitle, setReqTitle] = useState(PRESET_REQUIREMENTS[0].title)
  const [reqText, setReqText] = useState(PRESET_REQUIREMENTS[0].text)
  const [executing, setExecuting] = useState(false)
  const [currentRun, setCurrentRun] = useState<any>(null)
  const [activeStep, setActiveStep] = useState<number>(0)
  const [pastRuns, setPastRuns] = useState<any[]>([])
  const [expandedStoryIndex, setExpandedStoryIndex] = useState<number | null>(0)
  const [activeLogTab, setActiveLogTab] = useState<string>('all')

  const fetchRuns = async () => {
    try {
      const res = await api.get<any[]>('/delivery-intelligence/harness/pipeline/runs')
      setPastRuns(res)
      if (res.length > 0 && !currentRun) {
        setCurrentRun(res[0])
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [])

  const handleSelectPreset = (idx: number) => {
    setSelectedPreset(idx)
    setReqTitle(PRESET_REQUIREMENTS[idx].title)
    setReqText(PRESET_REQUIREMENTS[idx].text)
  }

  const handleExecuteHarness = async () => {
    try {
      setExecuting(true)
      setActiveStep(1)

      // Simulate stepper progression for high-end visual fidelity
      const step1Timer = setTimeout(() => setActiveStep(2), 700)
      const step2Timer = setTimeout(() => setActiveStep(3), 1400)

      const result = await api.post<any>('/delivery-intelligence/harness/pipeline/run', {
        requirement_title: reqTitle,
        requirement_text: reqText,
      })

      clearTimeout(step1Timer)
      clearTimeout(step2Timer)
      setActiveStep(3)
      setCurrentRun(result)
      await fetchRuns()
    } catch (err: any) {
      alert('Harness execution failed: ' + (err.message || 'Server error'))
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cohesive Delivery Sub-Nav */}
      <DeliverySubNav onQuickWeave={() => {}} />

      {/* Hero: Story Weaver Multi-Agent Harness */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-7 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Sparkles size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                    Delivery Intelligence Harness
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    3 Autonomous Agents Synchronized
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
                  Story Weaver & Code Intelligence Harness
                </h1>
              </div>
            </div>

            <button
              disabled={executing}
              onClick={handleExecuteHarness}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              {executing ? (
                <>
                  <RefreshCw size={15} className="animate-spin text-white" />
                  Executing Agent Pipeline...
                </>
              ) : (
                <>
                  <Play size={15} className="fill-white" />
                  Execute Story Harness
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Deconstructs raw PRD requirements via <strong>StoryWeaver Agent</strong> into Gherkin user stories,
            synchronizes issues directly into <strong>Jira</strong> with estimation, and utilizes the <strong>Code Analyzer Agent</strong> to inspect repository AST and calibrate story points based on code complexity.
          </p>

          {/* Visual 4-Stage Interactive Agent Pipeline Diagram */}
          <div className="pt-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Stage 0: Requirement */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-mono text-[10px] uppercase">Input Input</span>
                  <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                </div>
                <div className="font-bold text-white text-xs">Product Requirement / PRD</div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{reqTitle}</div>
              </div>

              {/* Stage 1: StoryWeaver Agent */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                activeStep === 1
                  ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-mono text-[10px] uppercase text-cyan-400">Custom Agent</span>
                  <Bot size={14} className="text-cyan-400" />
                </div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  StoryWeaver Agent
                  {activeStep === 1 && <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Personas • Gherkin AC • Scenarios</div>
              </div>

              {/* Stage 2: Jira Agent */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                activeStep === 2
                  ? 'bg-blue-950/50 border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-mono text-[10px] uppercase text-blue-400">Tracker Agent</span>
                  <Layers size={14} className="text-blue-400" />
                </div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  Jira Integration Agent
                  {activeStep === 2 && <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-blue-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Issue Keys • Sprints • Points</div>
              </div>

              {/* Stage 3: Code Analyzer Agent */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                activeStep === 3
                  ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-mono text-[10px] uppercase text-emerald-400">AST Code Agent</span>
                  <Code2 size={14} className="text-emerald-400" />
                </div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  Code Analyzer Agent
                  {activeStep === 3 && <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">AST Impact • Files • Point Calibration</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input / Preset Selector */}
      <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} className="text-cyan-500" />
            Requirement Input & Quick Presets
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_REQUIREMENTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(idx)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                  selectedPreset === idx
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Preset {idx + 1}: {p.title.split(':')[0].split('with')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Feature Title / Epic Objective
            </label>
            <input
              type="text"
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="e.g. Instant SEPA Settlement with Ledger Lock"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              PRD Specification / Acceptance Scope
            </label>
            <textarea
              rows={3}
              value={reqText}
              onChange={(e) => setReqText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="Describe user requirements, latency constraints, and functional invariants..."
            />
          </div>
        </div>
      </div>

      {/* Pipeline Output & Results */}
      {currentRun && (
        <div className="space-y-6">
          {/* Pipeline Stage Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentRun.stages?.map((stg: any, sIdx: number) => (
              <div
                key={sIdx}
                className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Stage {sIdx + 1}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} /> {stg.duration_ms}ms
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {stg.agent_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {stg.summary}
                </p>
              </div>
            ))}
          </div>

          {/* Generated Stories Inspector */}
          <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCode2 size={18} className="text-cyan-500" />
                  Weaved Jira Stories & Code-Calibrated Points ({currentRun.generated_stories?.length || 0})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Stories auto-synchronized to Jira board and calibrated with repository AST impact analysis.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  Total Points: <strong className="text-cyan-500">{currentRun.total_story_points || 0} pts</strong>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {currentRun.generated_stories?.map((story: any, idx: number) => {
                const isExpanded = expandedStoryIndex === idx
                const ca = story.code_analysis || {}
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-slate-50/70 dark:bg-slate-800/60 border-cyan-500/50 shadow-md'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedStoryIndex(isExpanded ? null : idx)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                          {story.key || `PAY-${200 + idx}`}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {story.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>Service: <strong className="text-slate-700 dark:text-slate-300">{story.service_name || story.component}</strong></span>
                            <span>•</span>
                            <span>Priority: <strong className="text-rose-500">{story.priority}</strong></span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              DoR {story.dor_score || 90}% Ready
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {story.points} Points
                          </div>
                          {ca.original_points && ca.original_points !== story.points && (
                            <div className="text-[10px] text-amber-500 line-through">
                              orig {ca.original_points} pts
                            </div>
                          )}
                        </div>

                        <span className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-4">
                        {/* Persona & User Story */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User Story & Persona</div>
                          <p className="text-slate-700 dark:text-slate-300">
                            <strong>{story.persona}</strong>, {story.goal}, {story.so_that}.
                          </p>
                        </div>

                        {/* Code Analyzer AST Insights */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/20 via-slate-900/40 to-slate-900/60 border border-emerald-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <Code2 size={14} />
                              Code Analyzer Agent AST Inspection
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                              Complexity: {ca.cyclomatic_complexity || 'MEDIUM'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300">
                            <span className="text-slate-400">Calibration Rationale:</span> {ca.calibration_reason || 'AST scanned; standard domain logic.'}
                          </div>

                          {ca.impacted_files && (
                            <div>
                              <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Impacted Repository Files:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {(Array.isArray(ca.impacted_files) ? ca.impacted_files : String(ca.impacted_files).split(' ')).map((file: string, fIdx: number) => (
                                  <span
                                    key={fIdx}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1"
                                  >
                                    <FileCode2 size={11} className="text-slate-400" />
                                    {file}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400">
                            <strong>Test Strategy:</strong> {ca.test_strategy || 'Unit tests + integration contract tests'}
                          </div>
                        </div>

                        {/* Acceptance Criteria Accordion */}
                        <div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Verifiable Acceptance Criteria (Gherkin Given/When/Then)
                          </div>
                          <div className="space-y-1.5">
                            {story.acceptance_criteria?.map((ac: any, acIdx: number) => (
                              <div
                                key={acIdx}
                                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs"
                              >
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-slate-700 dark:text-slate-300">
                                  {typeof ac === 'string' ? ac : ac.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Autonomous Agent Execution Logs */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="flex items-center gap-2 font-bold text-cyan-400">
                <Terminal size={15} />
                Agent Pipeline Execution Telemetry Log
              </span>
              <span className="text-[10px] text-slate-500">
                Run ID: {currentRun.run_id}
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {currentRun.stages?.map((stage: any) =>
                stage.logs?.map((log: string, lIdx: number) => (
                  <div key={lIdx} className="text-slate-300 py-0.5 hover:bg-slate-900 px-1.5 rounded">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
