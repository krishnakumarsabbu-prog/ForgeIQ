import { X, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface SideDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  width?: string
  children: ReactNode
  footer?: ReactNode
  accentColor?: string
}

export function SideDrawer({
  open,
  onClose,
  title,
  subtitle,
  width = '480px',
  children,
  footer,
  accentColor = '#00adef',
}: SideDrawerProps) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(11,15,25,0.35)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width,
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid rgba(226,232,240,0.9)`,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12), -1px 0 0 rgba(0,0,0,0.04)',
          animation: 'slideInRight 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80, transparent)` }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(226,232,240,0.7)', background: 'rgba(248,250,252,0.5)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}30`,
              }}
            >
              <Sparkles size={14} style={{ color: accentColor }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 truncate tracking-tight">{title}</h2>
              {subtitle && (
                <p
                  className="text-[11px] font-semibold truncate mt-0.5"
                  style={{ color: accentColor }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all duration-150 text-slate-400"
            aria-label="Close drawer"
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(226,232,240,0.7)'
              e.currentTarget.style.color = '#0f172a'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-5 py-4 shrink-0 flex items-center justify-end gap-2"
            style={{
              borderTop: '1px solid rgba(226,232,240,0.7)',
              background: 'linear-gradient(180deg, rgba(248,250,252,0.5), rgba(255,255,255,0.9))',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  )
}

interface DetailsPanelProps {
  items: { label: string; value: ReactNode }[]
  columns?: 1 | 2
}

export function DetailsPanel({ items, columns = 2 }: DetailsPanelProps) {
  return (
    <dl
      className={`grid gap-x-6 gap-y-0 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="py-3"
          style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}
        >
          <dt
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#94a3b8',
              marginBottom: '3px',
            }}
          >
            {item.label}
          </dt>
          <dd className="text-sm font-semibold text-slate-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
