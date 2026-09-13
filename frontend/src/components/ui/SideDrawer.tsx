import { X } from 'lucide-react'
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
}

export function SideDrawer({ open, onClose, title, subtitle, width = '480px', children, footer }: SideDrawerProps) {
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
      <div className="fixed inset-0 bg-slate-900/20 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed right-0 top-0 bottom-0 bg-white border-l border-slate-200 z-50 flex flex-col shadow-xl"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
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
    <dl className={`grid gap-x-4 gap-y-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {items.map((item, i) => (
        <div key={i}>
          <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{item.label}</dt>
          <dd className="text-sm text-slate-900 mt-0.5">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
