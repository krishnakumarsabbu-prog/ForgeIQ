import { Link } from 'react-router-dom'
import { ChevronRight, AlertCircle, Sparkles, Loader2, InboxIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: { label: string; to?: string }[]
  badge?: string
  badgeVariant?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose' | 'red' | 'dark'
  icon?: ReactNode
  gradient?: boolean
}

const badgeVariants: Record<string, { bg: string; color: string; border: string }> = {
  cyan:    { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)' },
  emerald: { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  violet:  { bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
  amber:   { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  rose:    { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  red:     { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  dark:    { bg: 'rgba(15,23,42,0.9)',    color: '#e2e8f0', border: 'rgba(255,255,255,0.1)' },
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  badge,
  badgeVariant = 'cyan',
  icon,
  gradient = false,
}: PageHeaderProps) {
  const bv = badgeVariants[badgeVariant]
  return (
    <div
      className="px-6 py-4 shrink-0 relative overflow-hidden"
      style={{
        background: gradient
          ? 'linear-gradient(135deg, #0b0f19 0%, #0f1d35 100%)'
          : 'rgba(255,255,255,0.97)',
        borderBottom: gradient
          ? '1px solid rgba(255,255,255,0.07)'
          : '1px solid rgba(226,232,240,0.75)',
        backdropFilter: 'blur(12px)',
        boxShadow: gradient
          ? '0 4px 24px rgba(0,0,0,0.2)'
          : '0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Gradient accent shimmer bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: gradient
            ? 'linear-gradient(90deg, #00adef, #0a68f4, #7c3aed, #00adef)'
            : 'linear-gradient(90deg, rgba(0,173,239,0.7), rgba(10,104,244,0.5), rgba(124,58,237,0.3), transparent)',
          backgroundSize: '200% 100%',
          animation: 'gradient-shift 4s ease infinite',
        }}
      />

      {/* Subtle ambient glow for gradient mode */}
      {gradient && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,173,239,0.1) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            opacity: 0.5,
          }}
        />
      )}

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-2.5 relative z-10">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight size={11} style={{ color: gradient ? 'rgba(148,163,184,0.4)' : '#cbd5e1' }} />}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: gradient ? 'rgba(148,163,184,0.7)' : '#94a3b8' }}
                  onMouseEnter={e => e.currentTarget.style.color = gradient ? '#e2e8f0' : '#0284c7'}
                  onMouseLeave={e => e.currentTarget.style.color = gradient ? 'rgba(148,163,184,0.7)' : '#94a3b8'}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[11px] font-bold" style={{ color: gradient ? '#e2e8f0' : '#0f172a' }}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: gradient
                  ? 'linear-gradient(135deg, rgba(0,173,239,0.25), rgba(10,104,244,0.2))'
                  : 'linear-gradient(135deg, rgba(0,173,239,0.12), rgba(10,104,244,0.08))',
                border: gradient
                  ? '1px solid rgba(0,173,239,0.4)'
                  : '1px solid rgba(0,173,239,0.2)',
                boxShadow: gradient
                  ? '0 0 16px rgba(0,173,239,0.3)'
                  : '0 2px 8px rgba(0,173,239,0.12)',
              }}
            >
              <span style={{ color: gradient ? '#7dd3fc' : '#0284c7' }}>
                {icon}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="text-xl font-black tracking-tight"
                style={{
                  color: gradient ? '#f1f5f9' : '#0f172a',
                  textShadow: gradient ? '0 0 30px rgba(0,173,239,0.2)' : undefined,
                }}
              >
                {title}
              </h1>
              {badge && (
                <span
                  className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
                  style={{
                    background: bv.bg,
                    color: bv.color,
                    border: `1px solid ${bv.border}`,
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: gradient ? 'rgba(148,163,184,0.85)' : '#64748b' }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   STATUS BADGE — Unified across the portal
   ============================================================ */

export type StatusVariant =
  | 'success' | 'warning' | 'error' | 'running'
  | 'paused' | 'blocked' | 'approval' | 'neutral' | 'info' | 'agent'

interface StatusConfig {
  bg: string
  color: string
  border: string
  dot?: string
  glow?: string
}

const statusConfig: Record<StatusVariant, StatusConfig> = {
  success:  { bg: 'rgba(16,185,129,0.09)',  color: '#059669', border: 'rgba(16,185,129,0.25)',  dot: '#10b981', glow: '0 0 6px rgba(16,185,129,0.4)' },
  warning:  { bg: 'rgba(245,158,11,0.09)',  color: '#b45309', border: 'rgba(245,158,11,0.3)',   dot: '#f59e0b' },
  error:    { bg: 'rgba(244,63,94,0.09)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)',   dot: '#f43f5e', glow: '0 0 6px rgba(244,63,94,0.35)' },
  running:  { bg: 'rgba(14,165,233,0.09)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)',  dot: '#0ea5e9', glow: '0 0 6px rgba(14,165,233,0.4)' },
  paused:   { bg: 'rgba(100,116,139,0.09)', color: '#475569', border: 'rgba(100,116,139,0.2)',  dot: '#94a3b8' },
  blocked:  { bg: 'rgba(244,63,94,0.07)',   color: '#be123c', border: 'rgba(244,63,94,0.2)',    dot: '#f43f5e' },
  approval: { bg: 'rgba(245,158,11,0.09)',  color: '#92400e', border: 'rgba(245,158,11,0.25)',  dot: '#f59e0b' },
  neutral:  { bg: 'rgba(226,232,240,0.6)',  color: '#475569', border: 'rgba(203,213,225,0.7)',  dot: '#94a3b8' },
  info:     { bg: 'rgba(14,165,233,0.07)',  color: '#0369a1', border: 'rgba(14,165,233,0.2)',   dot: '#38bdf8' },
  agent:    { bg: 'rgba(124,58,237,0.09)',  color: '#6d28d9', border: 'rgba(124,58,237,0.25)', dot: '#7c3aed', glow: '0 0 6px rgba(124,58,237,0.4)' },
}

const statusLabels: Record<string, { label: string; variant: StatusVariant }> = {
  COMPLETED:        { label: 'Completed', variant: 'success' },
  SUCCESS:          { label: 'Success', variant: 'success' },
  PASSED:           { label: 'Passed', variant: 'success' },
  RUNNING:          { label: 'Running', variant: 'running' },
  IN_PROGRESS:      { label: 'In Progress', variant: 'running' },
  FAILED:           { label: 'Failed', variant: 'error' },
  ERROR:            { label: 'Error', variant: 'error' },
  PENDING:          { label: 'Pending', variant: 'neutral' },
  QUEUED:           { label: 'Queued', variant: 'neutral' },
  PAUSED:           { label: 'Paused', variant: 'paused' },
  CANCELLED:        { label: 'Cancelled', variant: 'paused' },
  BLOCKED:          { label: 'Blocked', variant: 'blocked' },
  AWAITING_APPROVAL:{ label: 'Approval', variant: 'approval' },
  DRAFT:            { label: 'Draft', variant: 'neutral' },
  ACTIVE:           { label: 'Active', variant: 'success' },
  INACTIVE:         { label: 'Inactive', variant: 'paused' },
  PUBLISHED:        { label: 'Published', variant: 'success' },
  DEPRECATED:       { label: 'Deprecated', variant: 'warning' },
  CRITICAL:         { label: 'Critical', variant: 'error' },
  HIGH:             { label: 'High', variant: 'error' },
  MEDIUM:           { label: 'Medium', variant: 'warning' },
  LOW:              { label: 'Low', variant: 'info' },
  OPEN:             { label: 'Open', variant: 'error' },
  RESOLVED:         { label: 'Resolved', variant: 'success' },
  CLOSED:           { label: 'Closed', variant: 'paused' },
  MITIGATED:        { label: 'Mitigated', variant: 'warning' },
}

export function StatusBadge({ status, showIcon = true }: { status: string; showIcon?: boolean }) {
  const mapped = statusLabels[status] ?? statusLabels[status?.toUpperCase()] ?? { label: status, variant: 'neutral' as StatusVariant }
  const cfg = statusConfig[mapped.variant]
  const isPulsing = mapped.variant === 'running' || mapped.variant === 'agent'

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {showIcon && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPulsing ? 'animate-pulse' : ''}`}
          style={{
            background: cfg.dot,
            boxShadow: cfg.glow,
          }}
        />
      )}
      {mapped.label}
    </span>
  )
}

export function RiskBadge({ level }: { level: string }) {
  return <StatusBadge status={level} />
}

export function ExecutionStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

/* ============================================================
   STAGE STEP INDICATOR — Multi-step progress visualization
   ============================================================ */
export interface StageStep {
  label: string
  status: 'completed' | 'running' | 'pending' | 'failed'
}

export interface StageStepIndicatorProps {
  steps?: StageStep[]
  currentStage?: string
  status?: string
  stages?: string[]
}

export function StageStepIndicator({ steps, currentStage, status, stages }: StageStepIndicatorProps) {
  const defaultStages = ['Setup', 'Build', 'Test', 'Security', 'Governance', 'Deploy']
  const stageList = stages && stages.length > 0 ? stages : defaultStages

  const computedSteps: StageStep[] = steps ?? stageList.map((stageName, idx) => {
    const curIdx = stageList.findIndex(s => s.toLowerCase() === (currentStage || '').toLowerCase())
    const isPast = curIdx > idx || status === 'COMPLETED' || status === 'SUCCESS'
    const isCurrent = curIdx === idx && (status === 'RUNNING' || status === 'IN_PROGRESS')
    const isFailed = curIdx === idx && (status === 'FAILED' || status === 'ERROR')

    let st: StageStep['status'] = 'pending'
    if (isPast) st = 'completed'
    else if (isFailed) st = 'failed'
    else if (isCurrent) st = 'running'

    return { label: stageName, status: st }
  })

  const colors = {
    completed: { bg: '#10b981', border: 'rgba(16,185,129,0.3)', text: '#059669' },
    running:   { bg: '#0ea5e9', border: 'rgba(14,165,233,0.4)', text: '#0284c7' },
    pending:   { bg: '#e2e8f0', border: '#cbd5e1', text: '#94a3b8' },
    failed:    { bg: '#f43f5e', border: 'rgba(244,63,94,0.3)', text: '#e11d48' },
  }
  return (
    <div className="flex items-center gap-1">
      {computedSteps.map((step, idx) => {
        const c = colors[step.status]
        return (
          <div key={idx} className="flex items-center gap-1">
            <div
              className="relative w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: `${c.bg}20`,
                border: `1px solid ${c.border}`,
              }}
              title={step.label}
            >
              <span
                className={`w-2 h-2 rounded-full ${step.status === 'running' ? 'animate-pulse' : ''}`}
                style={{ background: c.bg }}
              />
            </div>
            {idx < computedSteps.length - 1 && (
              <div className="w-4 h-px" style={{ background: '#e2e8f0' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   PAGE TABS — Enterprise-grade tab navigation
   ============================================================ */
export interface PageTab {
  key: string
  label: string
  count?: number
  icon?: ReactNode
}

export interface PageTabsProps {
  tabs: PageTab[]
  activeTab?: string
  active?: string
  onChange?: (key: string) => void
  onTabChange?: (key: string) => void
}

export function PageTabs({ tabs, activeTab, active, onChange, onTabChange }: PageTabsProps) {
  const current = activeTab ?? active ?? tabs[0]?.key
  const handleChange = onChange ?? onTabChange ?? (() => {})

  return (
    <div
      className="flex items-center px-6 gap-0.5"
      style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}
    >
      {tabs.map(tab => {
        const isActive = tab.key === current
        return (
          <button
            key={tab.key}
            onClick={() => handleChange(tab.key)}
            className="relative flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold transition-all duration-150"
            style={{ color: isActive ? '#0284c7' : '#64748b' }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.color = '#0f172a'
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.color = '#64748b'
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={
                  isActive
                    ? { background: 'rgba(14,165,233,0.12)', color: '#0284c7' }
                    : { background: '#f1f5f9', color: '#94a3b8' }
                }
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                style={{ background: 'linear-gradient(90deg, #00adef, #0a68f4)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ErrorState({
  message = 'Something went wrong',
  description,
  onRetry,
}: {
  message?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}
      >
        <AlertCircle size={28} className="text-rose-500" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-bold text-slate-800">{message}</p>
        {description && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>}
        {onRetry && (
          <button onClick={onRetry} className="fi-btn-primary mt-4">
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   LOADING & EMPTY STATES
   ============================================================ */
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 gap-5">
      {/* Animated orbit rings */}
      <div className="relative w-16 h-16">
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#00adef',
            borderRightColor: 'rgba(0,173,239,0.3)',
            animation: 'spin 1s linear infinite',
          }}
        />
        {/* Mid ring */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#7c3aed',
            borderLeftColor: 'rgba(124,58,237,0.2)',
            animation: 'spin 1.4s linear infinite reverse',
          }}
        />
        {/* Inner glow */}
        <div
          className="absolute inset-4 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,173,239,0.15), rgba(10,104,244,0.1))',
            border: '1px solid rgba(0,173,239,0.2)',
            boxShadow: '0 0 16px rgba(0,173,239,0.25)',
          }}
        >
          <Loader2 size={12} style={{ color: '#00adef' }} className="animate-spin" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-700">{message}</p>
        <div className="flex items-center gap-1.5 justify-center mt-2">
          {[0, 0.2, 0.4].map((delay, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#00adef',
                animation: `pulse 1s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({
  message = 'No data available',
  description,
  icon,
  action,
}: {
  message?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 gap-5 px-6">
      {/* Glowing container */}
      <div className="relative">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(226,232,240,0.5), rgba(241,245,249,0.3))',
            border: '1px solid rgba(203,213,225,0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
          }}
        >
          {icon ?? <InboxIcon size={28} className="text-slate-300" />}
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full" style={{ background: 'rgba(0,173,239,0.15)', border: '1px solid rgba(0,173,239,0.2)' }} />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.18)' }} />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-black text-slate-700 tracking-tight">{message}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-5 flex items-center justify-center gap-2">{action}</div>}
      </div>
    </div>
  )
}

/* ============================================================
   SEARCH BAR — Reusable search input
   ============================================================ */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-3.5 py-2 text-xs rounded-xl border bg-white outline-none transition-all duration-150 w-full"
        style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
        onFocus={e => {
          e.target.style.borderColor = '#0ea5e9'
          e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1)'
        }}
        onBlur={e => {
          e.target.style.borderColor = '#e2e8f0'
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
