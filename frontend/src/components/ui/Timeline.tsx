import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface TimelineEntry {
  id: string
  timestamp: string
  title: string
  description?: string
  icon?: ReactNode
  status?: string
  meta?: ReactNode
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="relative">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              {entry.icon}
            </div>
            {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">{entry.title}</span>
              <span className="text-xs text-slate-400 shrink-0">{entry.timestamp}</span>
            </div>
            {entry.description && <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>}
            {entry.meta && <div className="mt-1">{entry.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export interface ActivityFeedItem {
  id: string
  actor: string
  action: string
  target: string
  timestamp: string
  icon?: ReactNode
}

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{item.actor}</span>
              {' '}{item.action}{' '}
              <span className="font-medium text-forgeiq-700">{item.target}</span>
            </p>
            <p className="text-xs text-slate-400">{item.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20" onClick={onCancel} role="presentation">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()} role="alertdialog" aria-label={title} aria-modal="true">
        <div className="px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1.5">{message}</p>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button className="fi-btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`fi-btn ${destructive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-forgeiq-600 text-white hover:bg-forgeiq-700'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="flex items-center gap-1 text-xs text-slate-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-forgeiq-600">{item.label}</Link>
          ) : (
            <span className="text-slate-700 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
