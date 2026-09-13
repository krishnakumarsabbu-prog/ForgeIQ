import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface FilterBarProps {
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  children?: ReactNode
}

export function FilterBar({ searchValue, onSearchChange, searchPlaceholder = 'Search...', children }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-2.5 border-b border-slate-200 bg-white">
      <div className="relative flex-1 max-w-xs">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="fi-input pl-8 py-1.5 text-sm"
        />
      </div>
      {children}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="fi-input pl-8 py-1.5 text-sm"
      />
    </div>
  )
}
