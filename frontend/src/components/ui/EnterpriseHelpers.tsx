/**
 * Shared enterprise UI helpers used across all pages
 * - EnterpriseCard: premium card wrapper
 * - StatCard: metric stat card with gradient accent + holographic hover
 * - SectionHeader: card section title bar with gradient underline
 * - ViewAllBtn: "View All →" navigation link
 * - ColorBadge: colored text badge
 */

import type { ReactNode, CSSProperties } from 'react'
import { ChevronRight } from 'lucide-react'

/* ── Enterprise Card ─────────────────────────────────── */
export function EnterpriseCard({
  children,
  className = '',
  style,
  onClick,
  hoverable = false,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
  hoverable?: boolean
}) {
  const base: CSSProperties = {
    background: '#fff',
    border: '1px solid rgba(226,232,240,0.8)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)',
    borderRadius: '16px',
    overflow: 'hidden',
    ...style,
  }

  if (onClick || hoverable) {
    return (
      <div
        className={`cursor-pointer transition-all duration-200 group ${className}`}
        style={base}
        onClick={onClick}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 4px 24px -4px rgba(0,14,35,0.12), 0 0 0 1px rgba(0,173,239,0.08)'
          e.currentTarget.style.borderColor = 'rgba(0,173,239,0.2)'
          if (hoverable) e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px -4px rgba(0,14,35,0.06)'
          e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={className} style={base}>
      {children}
    </div>
  )
}

/* ── Stat Card — Holographic Edition ───────────────────── */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient = ['#0ea5e9', '#0a68f4'],
  onClick,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ size?: number; style?: CSSProperties }>
  gradient?: string[]
  onClick?: () => void
}) {
  return (
    <div
      className="relative rounded-2xl p-4 cursor-pointer overflow-hidden group stat-card-glow"
      style={{
        background: '#fff',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'
        e.currentTarget.style.boxShadow = `0 8px 32px -4px rgba(0,14,35,0.12), 0 0 0 1px ${gradient[0]}20`
        e.currentTarget.style.borderColor = `${gradient[0]}40`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'
      }}
    >
      {/* Top gradient bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }}
      />

      {/* Shimmer overlay on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${gradient[0]}06 0%, transparent 60%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${gradient[0]}18, ${gradient[1]}12)`,
              border: `1px solid ${gradient[0]}30`,
              boxShadow: `0 2px 8px ${gradient[0]}20`,
            }}
          >
            <Icon size={14} style={{ color: gradient[0] }} />
          </div>
        </div>

        <div
          className="text-2xl font-black tracking-tight"
          style={{
            background: `linear-gradient(135deg, #0f172a, #334155)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {value}
        </div>

        {sub && (
          <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: gradient[0] }}
            />
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Section Header ─────────────────────────────────────── */
export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  iconColor = '#0284c7',
}: {
  icon: React.ComponentType<{ size?: number; style?: CSSProperties }>
  title: string
  subtitle?: string
  action?: ReactNode
  iconColor?: string
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3.5 relative"
      style={{ borderBottom: '1px solid rgba(226,232,240,0.7)', background: 'rgba(248,250,252,0.5)' }}
    >
      {/* Gradient underline accent */}
      <div
        className="absolute bottom-0 left-5 h-px w-12"
        style={{ background: `linear-gradient(90deg, ${iconColor}, transparent)` }}
      />

      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: `${iconColor}15`,
            border: `1px solid ${iconColor}25`,
            boxShadow: `0 2px 8px ${iconColor}15`,
          }}
        >
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ── View All Button ──────────────────────────────────────── */
export function ViewAllBtn({ onClick, label = 'View All' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-bold transition-all duration-150 px-2.5 py-1 rounded-lg"
      style={{ color: '#0284c7' }}
      onMouseEnter={e => {
        e.currentTarget.style.color = '#0369a1'
        e.currentTarget.style.background = 'rgba(14,165,233,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = '#0284c7'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {label} <ChevronRight size={13} />
    </button>
  )
}

/* ── Color Badge ──────────────────────────────────────────── */
export function ColorBadge({
  label,
  bg,
  color,
  border,
}: {
  label: string
  bg: string
  color: string
  border: string
}) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  )
}
