import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: { label: string; to?: string }[]
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-1.5 text-xs text-slate-500">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
              {bc.to ? (
                <Link to={bc.to} className="hover:text-forgeiq-600 transition-colors">{bc.label}</Link>
              ) : (
                <span className="text-slate-700 font-medium">{bc.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 leading-tight">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

interface PageTabsProps {
  tabs: { key: string; label: string; count?: number }[]
  active: string
  onChange: (key: string) => void
}

export function PageTabs({ tabs, active, onChange }: PageTabsProps) {
  return (
    <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            active === tab.key
              ? 'border-forgeiq-600 text-forgeiq-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs text-slate-400">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forgeiq-600" />
    </div>
  )
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      {icon && <div className="mb-3 opacity-40">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-red-500">
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

export { StatusBadge, RiskBadge } from './StatusBadge'
