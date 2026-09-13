interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 bg-white">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

interface StatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  RUNNING: 'bg-blue-50 text-blue-700 border border-blue-200',
  FAILED: 'bg-red-50 text-red-700 border border-red-200',
  PENDING: 'bg-slate-50 text-slate-600 border border-slate-200',
  AWAITING_APPROVAL: 'bg-amber-50 text-amber-700 border border-amber-200',
  CANCELLED: 'bg-slate-50 text-slate-500 border border-slate-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  draft: 'bg-slate-50 text-slate-600 border border-slate-200',
  LOW: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border border-red-200',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = statusColors[status] || 'bg-slate-50 text-slate-600 border border-slate-200'
  return <span className={`fi-badge ${cls}`}>{status}</span>
}

interface RiskBadgeProps {
  level: string
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const cls = statusColors[level] || 'bg-slate-50 text-slate-600 border border-slate-200'
  return <span className={`fi-badge ${cls}`}>{level}</span>
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forgeiq-600" />
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      {message}
    </div>
  )
}
