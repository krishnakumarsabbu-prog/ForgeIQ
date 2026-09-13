import { CheckCircle2, XCircle, Clock, Play, Pause, AlertTriangle, Lock, Ban, Loader2 } from 'lucide-react'

type StatusVariant = 'success' | 'warning' | 'error' | 'running' | 'paused' | 'blocked' | 'approval' | 'neutral' | 'info'

const variantConfig: Record<StatusVariant, { bg: string; text: string; border: string; icon: React.ComponentType<{ size?: number; className?: string }> | null }> = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  running: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Play },
  paused: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: Pause },
  blocked: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: Ban },
  approval: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Lock },
  neutral: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: null },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: null },
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
}

export function StatusBadge({ status, showIcon = true }: { status: string; showIcon?: boolean }) {
  const variant = statusMap[status] ?? 'neutral'
  const config = variantConfig[variant]
  const Icon = showIcon ? config.icon : null
  return (
    <span className={`fi-badge ${config.bg} ${config.text} ${config.border}`}>
      {Icon && <Icon size={11} />}
      {status}
    </span>
  )
}

export function RiskBadge({ level }: { level: string }) {
  return <StatusBadge status={level} />
}

export function ExecutionStatus({ status, progress }: { status: string; progress?: number }) {
  const variant = statusMap[status] ?? 'neutral'
  const config = variantConfig[variant]
  const Icon = config.icon
  return (
    <div className="flex items-center gap-2">
      <span className={`fi-badge ${config.bg} ${config.text} ${config.border}`}>
        {Icon && <Icon size={11} />}
        {status}
      </span>
      {progress !== undefined && status === 'RUNNING' && (
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-slate-500">{progress}%</span>
        </div>
      )}
    </div>
  )
}

export function HealthIndicator({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'
  const bg = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${bg} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${color}`}>{score.toFixed(0)}</span>
    </div>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-forgeiq-600" />
}
