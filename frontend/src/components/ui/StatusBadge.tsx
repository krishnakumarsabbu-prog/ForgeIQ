import { CheckCircle2, XCircle, Play, Pause, AlertTriangle, Lock, Ban, Loader2, Sparkles } from 'lucide-react'

type StatusVariant = 'success' | 'warning' | 'error' | 'running' | 'paused' | 'blocked' | 'approval' | 'neutral' | 'info' | 'agent'

const variantConfig: Record<StatusVariant, { bg: string; text: string; border: string; dot: string; icon: React.ComponentType<{ size?: number; className?: string }> | null }> = {
  success: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', dot: 'bg-emerald-500', icon: CheckCircle2 },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', dot: 'bg-amber-500', icon: AlertTriangle },
  error: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', dot: 'bg-rose-500', icon: XCircle },
  running: { bg: 'bg-sky-500/10', text: 'text-sky-600', border: 'border-sky-500/30', dot: 'bg-sky-500 animate-ping', icon: Play },
  paused: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20', dot: 'bg-slate-400', icon: Pause },
  blocked: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', dot: 'bg-rose-500', icon: Ban },
  approval: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', dot: 'bg-amber-500', icon: Lock },
  neutral: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', icon: null },
  info: { bg: 'bg-sky-500/10', text: 'text-sky-600', border: 'border-sky-500/20', dot: 'bg-sky-500', icon: null },
  agent: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', dot: 'bg-sky-500', icon: Sparkles },
}

const statusMap: Record<string, StatusVariant> = {
  COMPLETED: 'success',
  RUNNING: 'running',
  FAILED: 'error',
  PENDING: 'neutral',
  AWAITING_APPROVAL: 'approval',
  WAITING_FOR_APPROVAL: 'approval',
  CHANGES_REQUESTED: 'warning',
  REJECTED: 'error',
  CANCELLED: 'neutral',
  PAUSED: 'paused',
  BLOCKED: 'blocked',
  active: 'success',
  published: 'success',
  draft: 'neutral',
  archived: 'neutral',
  pending: 'approval',
  approved: 'success',
  rejected: 'error',
  escalated: 'warning',
  changes_requested: 'warning',
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'warning',
  CRITICAL: 'error',
  Agent: 'agent',
  Automated: 'success',
}

export function StatusBadge({ status, showIcon = true }: { status: string; showIcon?: boolean }) {
  const variant = statusMap[status] ?? 'neutral'
  const config = variantConfig[variant]
  const Icon = showIcon ? config.icon : null
  const isRunning = variant === 'running'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight border ${config.bg} ${config.text} ${config.border}`}>
      <span className="relative flex h-1.5 w-1.5">
        {isRunning && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
      </span>
      {Icon && !isRunning && <Icon size={11} className="shrink-0" />}
      <span>{status}</span>
    </span>
  )
}

export function RiskBadge({ level }: { level: string }) {
  return <StatusBadge status={level} />
}

export function ExecutionStatus({ status, progress }: { status: string; progress?: number }) {
  const variant = statusMap[status] ?? 'neutral'
  const config = variantConfig[variant]
  const isRunning = variant === 'running'

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        <span className="relative flex h-1.5 w-1.5">
          {isRunning && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
        </span>
        {status}
      </span>
      {progress !== undefined && isRunning && (
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] font-medium text-slate-500">{progress}%</span>
        </div>
      )}
    </div>
  )
}

export function StageStepIndicator({
  stages,
  currentStage,
  status
}: {
  stages?: string[]
  currentStage?: string
  status?: string
}) {
  const defaultStages = ['Setup', 'Build', 'Test', 'Security', 'Governance', 'Deploy']
  const stageList = stages && stages.length > 0 ? stages : defaultStages
  const currentIndex = stageList.findIndex(s => s.toLowerCase() === (currentStage || '').toLowerCase())

  return (
    <div className="inline-flex items-center gap-1">
      {stageList.map((stg, i) => {
        const isPast = currentIndex > i || status === 'COMPLETED'
        const isCurrent = currentIndex === i && status === 'RUNNING'
        const isFailed = currentIndex === i && status === 'FAILED'

        let dotClass = 'bg-slate-200 text-slate-400'
        if (isPast) dotClass = 'bg-emerald-500 text-white'
        else if (isCurrent) dotClass = 'bg-sky-500 text-white animate-pulse'
        else if (isFailed) dotClass = 'bg-rose-500 text-white'

        return (
          <div key={stg} className="flex items-center" title={`${stg}${isCurrent ? ' (Active)' : isPast ? ' (Passed)' : ''}`}>
            <span className={`w-2 h-2 rounded-full transition-all ${dotClass}`} />
            {i < stageList.length - 1 && (
              <span className={`w-2 h-0.5 ${isPast ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function HealthIndicator({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'
  const bg = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${bg} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${color}`}>{score.toFixed(0)}%</span>
    </div>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-sky-500" />
}

