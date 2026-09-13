import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Code2, FileText, FolderTree, Brain, Shield, CheckCircle2, XCircle,
  AlertTriangle, Play, GitBranch, FlaskConical, Hammer, ScrollText,
  ChevronRight, ChevronDown, FileCode, Lock, Database, Cog,
  RefreshCw, Eye, Edit3, ThumbsUp, ThumbsDown, MessageSquare,
  Loader2, CircleDot, ArrowRight, Clock, Zap,
} from 'lucide-react'
import {
  useApplications, usePeerSession, useCreatePeerSession,
  useApprovePeerSession, useRejectPeerSession, useRequestPeerRevision,
} from '../hooks/useQueries'
import type { PeerEngineeringSession, RepositoryFile, FileChange, WorkflowStep } from '../types'

const API_BASE = '/api'

type PanelTab = 'plan' | 'context' | 'changes' | 'tests' | 'security' | 'evidence'
type BottomTab = 'validation' | 'changes' | 'tests' | 'security' | 'evidence'

const PHASE_ICONS: Record<string, typeof Code2> = {
  understand_requirement: Brain,
  read_engineering_state: Eye,
  find_relevant_files: FolderTree,
  impact_analysis: Zap,
  risk_analysis: AlertTriangle,
  create_plan: FileText,
  developer_approval: ThumbsUp,
  modify_code: Code2,
  run_tests: FlaskConical,
  security_scan: Shield,
  build: Hammer,
  evidence: ScrollText,
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
}

const CATEGORY_ICONS: Record<string, typeof Code2> = {
  source: FileCode,
  test: FlaskConical,
  database: Database,
  security: Lock,
  config: Cog,
  api: GitBranch,
  domain: Brain,
  service: Cog,
  repository: Database,
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 size={14} className="text-emerald-500" />
    case 'running': return <Loader2 size={14} className="text-forgeiq-500 animate-spin" />
    case 'failed': return <XCircle size={14} className="text-red-500" />
    case 'pending': return <CircleDot size={14} className="text-slate-300" />
    default: return <CircleDot size={14} className="text-slate-300" />
  }
}

function languageColor(lang: string): string {
  const colors: Record<string, string> = {
    java: 'text-orange-600', python: 'text-blue-600', typescript: 'text-blue-500',
    javascript: 'text-yellow-600', yaml: 'text-purple-600', json: 'text-slate-600',
    xml: 'text-green-600', toml: 'text-red-600', html: 'text-orange-500',
    css: 'text-blue-400', sql: 'text-cyan-600', shell: 'text-green-500',
  markdown: 'text-slate-500', text: 'text-slate-400',
  ini: 'text-gray-500',
  }
  return colors[lang] || 'text-slate-400'
}

function CodeViewer({ content, language }: { content: string; language: string }) {
  const lines = content.split('\n')
  return (
    <div className="flex h-full overflow-auto bg-slate-900 font-mono text-xs">
      <div className="flex flex-col select-none py-3 px-2 text-right text-slate-600 bg-slate-900/50 border-r border-slate-700/50">
        {lines.map((_, i) => (
          <span key={i} className="leading-relaxed">{i + 1}</span>
        ))}
      </div>
      <pre className="flex-1 py-3 px-3 text-slate-200 leading-relaxed overflow-x-auto">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">{line || ' '}</div>
        ))}
      </pre>
    </div>
  )
}

function DiffViewer({ change }: { change: FileChange }) {
  const beforeLines = change.before.split('\n')
  const afterLines = change.after.split('\n')
  const maxLines = Math.max(beforeLines.length, afterLines.length)

  return (
    <div className="flex h-full overflow-auto bg-slate-900 font-mono text-xs">
      <div className="flex-1 border-r border-slate-700/50">
        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 bg-slate-900/70 border-b border-slate-700/50">
          Before
        </div>
        <div className="py-2 px-3">
          {Array.from({ length: maxLines }).map((_, i) => {
            const line = beforeLines[i] || ''
            const afterLine = afterLines[i] || ''
            const isRemoved = line && !afterLine.includes(line.trim())
            const isEmpty = !line
            return (
              <div key={i} className={`whitespace-pre ${isRemoved ? 'bg-red-900/30 text-red-300' : isEmpty ? 'text-slate-700' : 'text-slate-300'}`}>
                {line || ' '}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex-1">
        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 bg-slate-900/70 border-b border-slate-700/50">
          After
        </div>
        <div className="py-2 px-3">
          {Array.from({ length: maxLines }).map((_, i) => {
            const line = afterLines[i] || ''
            const beforeLine = beforeLines[i] || ''
            const isAdded = line && !beforeLine.includes(line.trim())
            const isEmpty = !line
            return (
              <div key={i} className={`whitespace-pre ${isAdded ? 'bg-emerald-900/30 text-emerald-300' : isEmpty ? 'text-slate-700' : 'text-slate-300'}`}>
                {line || ' '}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RepositoryExplorer({
  files,
  selectedPath,
  onSelect,
  relevantFiles,
}: {
  files: RepositoryFile[]
  selectedPath: string
  onSelect: (path: string) => void
  relevantFiles: string[]
}) {
  const tree = useMemo(() => {
    const root: Record<string, any> = {}
    for (const f of files) {
      const parts = f.path.split('/')
      let node = root
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (i === parts.length - 1) {
          node[part] = node[part] || { __file: true, __path: f.path }
        } else {
          node[part] = node[part] || {}
          node = node[part]
        }
      }
    }
    return root
  }, [files])

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['src']))

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function renderNode(node: Record<string, any>, prefix: string, depth: number = 0): React.ReactNode[] {
    const entries = Object.entries(node).sort(([a, va], [b, vb]) => {
      const aIsFile = va.__file
      const bIsFile = vb.__file
      if (aIsFile && !bIsFile) return 1
      if (!aIsFile && bIsFile) return -1
      return a.localeCompare(b)
    })
    const result: React.ReactNode[] = []
    for (const [name, val] of entries) {
      const key = `${prefix}/${name}`
      const isFile = val.__file
      const filePath = val.__path
      const isSelected = filePath === selectedPath
      const isRelevant = relevantFiles.includes(filePath)
      const Icon = isFile ? (CATEGORY_ICONS[files.find(f => f.path === filePath)?.category || 'source'] || FileCode) : FolderTree

      if (isFile) {
        result.push(
          <div
            key={key}
            onClick={() => onSelect(filePath)}
            className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer text-xs rounded transition-colors ${
              isSelected ? 'bg-forgeiq-100 text-forgeiq-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <Icon size={12} className={languageColor(files.find(f => f.path === filePath)?.language || 'text')} />
            <span className="truncate flex-1">{name}</span>
            {isRelevant && <span className="w-1.5 h-1.5 rounded-full bg-forgeiq-500" title="Relevant to request" />}
            {files.find(f => f.path === filePath)?.is_critical && <Lock size={10} className="text-red-400" />}
          </div>
        )
      } else {
        const isExpanded = expanded.has(key)
        result.push(
          <div key={key}>
            <div
              onClick={() => toggle(key)}
              className="flex items-center gap-1 py-1 px-2 cursor-pointer text-xs text-slate-700 hover:bg-slate-100 rounded transition-colors"
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <FolderTree size={12} className="text-slate-400" />
              <span className="font-medium">{name}</span>
            </div>
            {isExpanded && renderNode(val, key, depth + 1)}
          </div>
        )
      }
    }
    return result
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <FolderTree size={14} className="text-slate-400" />
          Repository Explorer
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {files.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No files loaded</div>
        ) : (
          renderNode(tree, '')
        )}
      </div>
      {files.length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500">
          {files.length} files · {files.filter(f => f.is_critical).length} critical
        </div>
      )}
    </div>
  )
}

function WorkflowTimeline({ steps, currentPhase }: { steps: WorkflowStep[]; currentPhase: string }) {
  return (
    <div className="space-y-0.5">
      {steps.map((step, i) => {
        const Icon = PHASE_ICONS[step.phase] || CircleDot
        const isCurrent = step.phase === currentPhase && step.status === 'running'
        return (
          <div key={step.id} className="flex items-start gap-2">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                step.status === 'completed' ? 'bg-emerald-50 border-emerald-300' :
                isCurrent ? 'bg-forgeiq-50 border-forgeiq-400 animate-pulse' :
                step.status === 'running' ? 'bg-forgeiq-50 border-forgeiq-300' :
                'bg-slate-50 border-slate-200'
              }`}>
                <Icon size={13} className={
                  step.status === 'completed' ? 'text-emerald-600' :
                  isCurrent ? 'text-forgeiq-600' :
                  'text-slate-400'
                } />
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-5 ${step.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className={`text-xs font-medium ${
                step.status === 'completed' ? 'text-slate-700' :
                isCurrent ? 'text-forgeiq-700' : 'text-slate-400'
              }`}>
                {step.label}
              </div>
              {step.status === 'completed' && (
                <div className="text-[10px] text-slate-400 mt-0.5">{step.description}</div>
              )}
              {isCurrent && (
                <div className="text-[10px] text-forgeiq-500 mt-0.5 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Processing...
                </div>
              )}
            </div>
            <div className="mt-1.5">{statusIcon(step.status)}</div>
          </div>
        )
      })}
    </div>
  )
}

function PlanTab({ session }: { session: PeerEngineeringSession }) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
        <div className="text-xs font-semibold text-slate-700 mb-1">Engineering Plan</div>
        <div className="text-xs text-slate-500">{session.plan_summary}</div>
      </div>
      <div className="space-y-1.5">
        {session.plan.map((step: any, i) => (
          <div key={step.id || i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
            <div className="w-6 h-6 rounded-full bg-forgeiq-100 flex items-center justify-center text-xs font-bold text-forgeiq-700 shrink-0">
              {step.order || i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700">{step.action}</div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-0.5"><Brain size={10} /> {step.agent}</span>
                <span className="flex items-center gap-0.5"><Clock size={10} /> {step.estimated_time}</span>
                {step.files?.length > 0 && (
                  <span className="flex items-center gap-0.5"><FileCode size={10} /> {step.files.length} files</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContextTab({ session }: { session: PeerEngineeringSession }) {
  const es = session.engineering_state_summary
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Health Score</div>
          <div className="text-lg font-bold text-slate-700">{(es as any)?.health_score?.toFixed(2) || 'N/A'}</div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Coverage</div>
          <div className="text-lg font-bold text-slate-700">{(es as any)?.coverage_pct || 0}%</div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Security Findings</div>
          <div className="text-lg font-bold text-slate-700">{(es as any)?.security_findings || 0}</div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Build Status</div>
          <div className="text-lg font-bold text-slate-700">{(es as any)?.build_status || 'N/A'}</div>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1.5">Impact Analysis</div>
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-1.5">
          {Object.entries(session.impact_analysis).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-slate-700 font-medium">
                {Array.isArray(val) ? val.length : typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1.5">Relevant Files</div>
        <div className="space-y-1">
          {session.relevant_files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1.5">
              <FileCode size={12} className="text-slate-400" />
              <span className="truncate">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChangesTab({ session, selectedChange, onSelectChange }: {
  session: PeerEngineeringSession
  selectedChange: number
  onSelectChange: (i: number) => void
}) {
  if (session.file_changes.length === 0) {
    return <div className="text-center py-8 text-xs text-slate-400">No changes generated yet. Approve the plan to generate code changes.</div>
  }
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-700 mb-1">{session.file_changes.length} File Changes</div>
      {session.file_changes.map((change, i) => (
        <div
          key={i}
          onClick={() => onSelectChange(i)}
          className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
            selectedChange === i ? 'border-forgeiq-300 bg-forgeiq-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileCode size={12} className={languageColor(change.language)} />
            <span className="text-xs font-medium text-slate-700 truncate flex-1">{change.file_path}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${RISK_COLORS[change.risk] || RISK_COLORS.LOW}`}>
              {change.risk}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{change.reason}</div>
        </div>
      ))}
    </div>
  )
}

function TestsTab({ session }: { session: PeerEngineeringSession }) {
  const t = session.test_results
  if (!t || t.status === 'pending') {
    return <div className="text-center py-8 text-xs text-slate-400">Tests have not been run yet.</div>
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-2 text-center">
          <div className="text-lg font-bold text-emerald-700">{t.passed}</div>
          <div className="text-[10px] text-emerald-600">Passed</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-2 text-center">
          <div className="text-lg font-bold text-red-700">{t.failed}</div>
          <div className="text-[10px] text-red-600">Failed</div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-2 text-center">
          <div className="text-lg font-bold text-slate-700">{t.skipped}</div>
          <div className="text-[10px] text-slate-500">Skipped</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-2 text-center">
          <div className="text-lg font-bold text-blue-700">{t.coverage_pct}%</div>
          <div className="text-[10px] text-blue-600">Coverage</div>
        </div>
      </div>
      <div className="space-y-1">
        {t.details.map((d: any, i) => (
          <div key={i} className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded px-2 py-1.5">
            {d.status === 'passed' ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-red-500" />}
            <span className="text-slate-600 flex-1 truncate">{d.name}</span>
            <span className="text-[10px] text-slate-400">{d.duration}s</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecurityTab({ session }: { session: PeerEngineeringSession }) {
  const s = session.security_results
  if (!s || s.status === 'pending') {
    return <div className="text-center py-8 text-xs text-slate-400">Security scan has not been run yet.</div>
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-red-50 rounded-lg border border-red-200 p-2 text-center">
          <div className="text-lg font-bold text-red-700">{s.critical}</div>
          <div className="text-[10px] text-red-600">Critical</div>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-2 text-center">
          <div className="text-lg font-bold text-orange-700">{s.high}</div>
          <div className="text-[10px] text-orange-600">High</div>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-2 text-center">
          <div className="text-lg font-bold text-amber-700">{s.medium}</div>
          <div className="text-[10px] text-amber-600">Medium</div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-2 text-center">
          <div className="text-lg font-bold text-slate-700">{s.low}</div>
          <div className="text-[10px] text-slate-500">Low</div>
        </div>
      </div>
      <div className="space-y-1">
        {s.details.map((d: any, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                d.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                d.severity === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                d.severity === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>{d.severity}</span>
              <span className="text-xs font-medium text-slate-700">{d.rule}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{d.message}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{d.file}</div>
          </div>
        ))}
        {s.details.length === 0 && (
          <div className="text-center py-4 text-xs text-emerald-600 flex items-center justify-center gap-1">
            <CheckCircle2 size={14} /> No security findings
          </div>
        )}
      </div>
    </div>
  )
}

function EvidenceTab({ session }: { session: PeerEngineeringSession }) {
  if (session.evidence.length === 0) {
    return <div className="text-center py-8 text-xs text-slate-400">No evidence collected yet.</div>
  }
  return (
    <div className="space-y-1.5">
      {session.evidence.map((ev, i) => (
        <div key={ev.id || i} className="bg-white border border-slate-200 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <ScrollText size={12} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-700">{ev.action}</span>
            <span className="text-[10px] text-slate-400 ml-auto">{ev.phase}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{ev.summary}</div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
            {ev.agent && <span>{ev.agent}</span>}
            {ev.model && <span>· {ev.model}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PeerEngineeringWorkspace() {
  const navigate = useNavigate()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [requestText, setRequestText] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [activeTab, setActiveTab] = useState<PanelTab>('plan')
  const [bottomTab, setBottomTab] = useState<BottomTab>('validation')
  const [selectedChange, setSelectedChange] = useState(0)
  const [approvalReason, setApprovalReason] = useState('')
  const [revisionFeedback, setRevisionFeedback] = useState('')
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRevisionDialog, setShowRevisionDialog] = useState(false)

  const { data: apps } = useApplications()
  const { data: session } = usePeerSession(sessionId)
  const createSession = useCreatePeerSession()
  const approveSession = useApprovePeerSession()
  const rejectSession = useRejectPeerSession()
  const requestRevision = useRequestPeerRevision()

  const handleCreate = () => {
    if (!selectedAppId || !requestText.trim()) return
    createSession.mutate(
      { application_id: selectedAppId, request_text: requestText },
      { onSuccess: (s) => setSessionId(s.id) },
    )
  }

  const handleApprove = () => {
    if (!sessionId) return
    approveSession.mutate(
      { id: sessionId, body: { decided_by: 'Developer', reason: approvalReason } },
      { onSuccess: () => setShowApprovalDialog(false) },
    )
  }

  const handleReject = () => {
    if (!sessionId) return
    rejectSession.mutate(
      { id: sessionId, body: { decided_by: 'Developer', reason: approvalReason || 'Rejected' } },
      { onSuccess: () => setShowApprovalDialog(false) },
    )
  }

  const handleRevision = () => {
    if (!sessionId) return
    requestRevision.mutate(
      { id: sessionId, body: { feedback: revisionFeedback } },
      { onSuccess: () => { setShowRevisionDialog(false); setRevisionFeedback('') } },
    )
  }

  const selectedFile = session?.repository_files.find(f => f.path === session?.selected_file_path)
  const currentChange = session?.file_changes[selectedChange]
  const isPlanReady = session?.status === 'plan_ready'
  const isCompleted = session?.status === 'completed'
  const isExecuting = session?.status === 'executing' || session?.status === 'approved'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-forgeiq-600" />
            <span className="font-bold text-slate-900 text-sm">AI Peer Engineering Workspace</span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            disabled={!!session}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-forgeiq-400 disabled:opacity-50"
          >
            <option value="">Select application...</option>
            {apps?.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
          </select>
          <input
            type="text"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            disabled={!!session}
            placeholder="e.g. Add retry support to payment processing"
            className="flex-1 text-xs border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-forgeiq-400 disabled:opacity-50"
          />
          {!session && (
            <button
              onClick={handleCreate}
              disabled={!selectedAppId || !requestText.trim() || createSession.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 disabled:opacity-50 transition-colors"
            >
              {createSession.isPending ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
              Analyze
            </button>
          )}
          {session && (
            <button
              onClick={() => { setSessionId(''); setRequestText(''); setSelectedAppId('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> New Session
            </button>
          )}
        </div>
      </div>

      {!session ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-forgeiq-100 flex items-center justify-center mx-auto mb-4">
              <Code2 size={28} className="text-forgeiq-600" />
            </div>
            <div className="text-sm font-semibold text-slate-700 mb-1">AI Peer Engineering Workspace</div>
            <div className="text-xs text-slate-500 mb-4">
              Select an application and describe what you want to change. The AI will analyze the codebase,
              assess risk, create a plan, and wait for your approval before making any modifications.
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-left">
              <div className="text-xs font-medium text-slate-600 mb-2">Example requests:</div>
              <div className="space-y-1.5">
                {[
                  'Add retry support to payment processing',
                  'Implement OAuth2 PKCE flow',
                  'Add real-time inventory reservation',
                  'Add Slack notification channel',
                ].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setRequestText(ex) }}
                    className="flex items-center gap-2 text-xs text-slate-600 hover:text-forgeiq-700 hover:bg-forgeiq-50 rounded px-2 py-1 w-full text-left transition-colors"
                  >
                    <ArrowRight size={11} className="text-slate-400" />
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Risk Banner */}
          <div className="shrink-0 px-4 py-1.5 bg-white border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${RISK_COLORS[session.risk_level] || RISK_COLORS.LOW}`}>
                <AlertTriangle size={12} />
                Risk: {session.risk_level}
              </div>
              <div className="text-xs text-slate-500">
                Score: <span className="font-medium text-slate-700">{session.risk_score}</span>
              </div>
              <div className="text-xs text-slate-500">
                Status: <span className="font-medium text-slate-700 capitalize">{session.status.replace(/_/g, ' ')}</span>
              </div>
              {session.requires_approval && isPlanReady && (
                <div className="text-xs text-orange-600 font-medium flex items-center gap-1">
                  <Lock size={11} /> Approval required
                </div>
              )}
              <div className="flex-1" />
              {isPlanReady && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowRevisionDialog(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <MessageSquare size={12} /> Request Revision
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <ThumbsDown size={12} /> Reject
                  </button>
                  <button
                    onClick={() => setShowApprovalDialog(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    <ThumbsUp size={12} /> Approve Plan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main 3-panel area */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: Repository Explorer */}
            <div className="w-64 shrink-0 border-r border-slate-200 bg-white overflow-hidden">
              <RepositoryExplorer
                files={session.repository_files}
                selectedPath={session.selected_file_path}
                onSelect={(path) => {
                  fetch(`${API_BASE}/peer-engineering/sessions/${sessionId}/select-file`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_path: path }),
                  })
                }}
                relevantFiles={session.relevant_files}
              />
            </div>

            {/* CENTER: Code Editor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="shrink-0 px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <FileCode size={13} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-600 truncate">{session.selected_file_path || 'No file selected'}</span>
                {selectedFile?.is_critical && (
                  <span className="text-[10px] text-red-600 flex items-center gap-0.5"><Lock size={9} /> Critical</span>
                )}
                <div className="flex-1" />
                <span className="text-[10px] text-slate-400">{selectedFile?.language || ''}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                {selectedFile ? (
                  <CodeViewer content={selectedFile.content || '// File is empty'} language={selectedFile.language} />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    Select a file from the repository explorer
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: AI Engineering Panel */}
            <div className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
              {/* Workflow Timeline */}
              <div className="shrink-0 px-3 py-2 border-b border-slate-200 bg-slate-50">
                <div className="text-xs font-semibold text-slate-700 mb-2">Engineering Workflow</div>
                <WorkflowTimeline steps={session.workflow_steps} currentPhase={session.current_phase} />
              </div>

              {/* Tabs */}
              <div className="shrink-0 flex border-b border-slate-200 bg-slate-50">
                {(['plan', 'context', 'changes', 'tests', 'security', 'evidence'] as PanelTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-1 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                      activeTab === tab ? 'text-forgeiq-700 border-b-2 border-forgeiq-500 bg-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-3">
                {activeTab === 'plan' && <PlanTab session={session} />}
                {activeTab === 'context' && <ContextTab session={session} />}
                {activeTab === 'changes' && (
                  <ChangesTab
                    session={session}
                    selectedChange={selectedChange}
                    onSelectChange={setSelectedChange}
                  />
                )}
                {activeTab === 'tests' && <TestsTab session={session} />}
                {activeTab === 'security' && <SecurityTab session={session} />}
                {activeTab === 'evidence' && <EvidenceTab session={session} />}
              </div>
            </div>
          </div>

          {/* BOTTOM: Validation/Changes/Tests/Security/Evidence Panel */}
          <div className="shrink-0 h-48 border-t border-slate-200 bg-white flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center border-b border-slate-200 bg-slate-50">
              {(['validation', 'changes', 'tests', 'security', 'evidence'] as BottomTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    bottomTab === tab ? 'text-forgeiq-700 border-b-2 border-forgeiq-500 bg-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'validation' && 'Validation'}
                  {tab === 'changes' && `Changes (${session.file_changes.length})`}
                  {tab === 'tests' && 'Tests'}
                  {tab === 'security' && 'Security'}
                  {tab === 'evidence' && `Evidence (${session.evidence.length})`}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto">
              {bottomTab === 'validation' && (
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-2">
                      <div className="text-[10px] uppercase text-slate-400">Tests</div>
                      <div className={`text-sm font-bold ${session.test_results?.failed > 0 ? 'text-red-600' : session.test_results?.passed > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {session.test_results?.status === 'completed' ? `${session.test_results.passed} passed` : 'Pending'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-2">
                      <div className="text-[10px] uppercase text-slate-400">Security</div>
                      <div className={`text-sm font-bold ${session.security_results?.findings > 0 ? 'text-amber-600' : session.security_results?.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {session.security_results?.status === 'completed' ? `${session.security_results.findings} findings` : 'Pending'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-2">
                      <div className="text-[10px] uppercase text-slate-400">Build</div>
                      <div className={`text-sm font-bold ${session.build_results?.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {session.build_results?.status === 'completed' ? 'Passed' : 'Pending'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-2">
                      <div className="text-[10px] uppercase text-slate-400">Risk</div>
                      <div className={`text-sm font-bold ${session.risk_level === 'CRITICAL' ? 'text-red-600' : session.risk_level === 'HIGH' ? 'text-orange-600' : session.risk_level === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {session.risk_level}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">Risk Factors</div>
                    <div className="space-y-1">
                      {session.risk_factors.filter(rf => rf.present).map((rf, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <AlertTriangle size={11} className="text-amber-500" />
                          <span className="text-slate-600 flex-1">{rf.factor}</span>
                          <span className="text-slate-400">+{rf.weight}</span>
                        </div>
                      ))}
                      {session.risk_factors.filter(rf => rf.present).length === 0 && (
                        <div className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} /> No risk factors detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {bottomTab === 'changes' && (
                currentChange ? (
                  <DiffViewer change={currentChange} />
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">No changes generated yet.</div>
                )
              )}
              {bottomTab === 'tests' && (
                <div className="p-3 overflow-auto h-full">
                  <TestsTab session={session} />
                </div>
              )}
              {bottomTab === 'security' && (
                <div className="p-3 overflow-auto h-full">
                  <SecurityTab session={session} />
                </div>
              )}
              {bottomTab === 'evidence' && (
                <div className="p-3 overflow-auto h-full">
                  <EvidenceTab session={session} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowApprovalDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-96 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold text-slate-900">Approve Engineering Plan</span>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              Risk level: <span className={`font-medium ${session?.risk_level === 'CRITICAL' ? 'text-red-600' : session?.risk_level === 'HIGH' ? 'text-orange-600' : 'text-slate-700'}`}>{session?.risk_level}</span>
              {session?.requires_approval && ' — High risk changes require approval.'}
            </div>
            <textarea
              value={approvalReason}
              onChange={e => setApprovalReason(e.target.value)}
              placeholder="Reason for approval (optional)..."
              className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 mb-3 h-20 resize-none focus:outline-none focus:border-forgeiq-400"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowApprovalDialog(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleApprove}
                disabled={approveSession.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {approveSession.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Dialog */}
      {showRevisionDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowRevisionDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-96 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={16} className="text-forgeiq-600" />
              <span className="text-sm font-semibold text-slate-900">Request Revision</span>
            </div>
            <div className="text-xs text-slate-500 mb-3">Provide feedback for the AI to revise the plan.</div>
            <textarea
              value={revisionFeedback}
              onChange={e => setRevisionFeedback(e.target.value)}
              placeholder="What should be changed in the plan?"
              className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 mb-3 h-24 resize-none focus:outline-none focus:border-forgeiq-400"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRevisionDialog(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleRevision}
                disabled={!revisionFeedback.trim() || requestRevision.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 disabled:opacity-50"
              >
                {requestRevision.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Request Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
