import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, FolderGit2, Bot, Layers, Workflow, Activity, ScrollText, Network } from 'lucide-react'
import { useDashboard, useApplications, useAgents, useHarnesses, usePipelines, useExecutions, useEvidence, useEngineeringStates } from '../../hooks/useQueries'

interface SearchResult {
  id: string
  label: string
  type: string
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Application: FolderGit2,
  Agent: Bot,
  Harness: Layers,
  Pipeline: Workflow,
  Execution: Activity,
  Evidence: ScrollText,
  'Engineering State': Network,
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: dashboard } = useDashboard()
  const { data: applications } = useApplications()
  const { data: agents } = useAgents()
  const { data: harnesses } = useHarnesses()
  const { data: pipelines } = usePipelines()
  const { data: executions } = useExecutions()
  const { data: evidence } = useEvidence()
  const { data: engStates } = useEngineeringStates()

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const out: SearchResult[] = []

    applications?.forEach(a => {
      if (a.name.toLowerCase().includes(q) || a.display_name.toLowerCase().includes(q))
        out.push({ id: a.id, label: a.display_name || a.name, type: 'Application', to: `/applications/${a.id}`, icon: FolderGit2 })
    })
    agents?.forEach(a => {
      if (a.name.toLowerCase().includes(q) || a.display_name.toLowerCase().includes(q))
        out.push({ id: a.id, label: a.display_name || a.name, type: 'Agent', to: `/agents/${a.id}`, icon: Bot })
    })
    harnesses?.forEach(h => {
      if (h.name.toLowerCase().includes(q) || h.display_name.toLowerCase().includes(q))
        out.push({ id: h.id, label: h.display_name || h.name, type: 'Harness', to: `/harnesses/${h.id}`, icon: Layers })
    })
    pipelines?.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q))
        out.push({ id: p.id, label: p.display_name || p.name, type: 'Pipeline', to: `/pipelines/${p.id}`, icon: Workflow })
    })
    executions?.forEach(e => {
      if (e.id.toLowerCase().includes(q))
        out.push({ id: e.id, label: e.id.slice(0, 12), type: 'Execution', to: `/executions/${e.id}`, icon: Activity })
    })
    evidence?.slice(0, 50).forEach(ev => {
      if (ev.id.toLowerCase().includes(q) || ev.evidence_type.toLowerCase().includes(q))
        out.push({ id: ev.id, label: `${ev.evidence_type} — ${ev.id.slice(0, 8)}`, type: 'Evidence', to: `/evidence`, icon: ScrollText })
    })
    engStates?.forEach(es => {
      if (es.repository.toLowerCase().includes(q) || es.branch.toLowerCase().includes(q))
        out.push({ id: es.id, label: `${es.repository} (${es.branch})`, type: 'Engineering State', to: `/engineering-state`, icon: Network })
    })

    return out.slice(0, 30)
  }, [query, applications, agents, harnesses, pipelines, executions, evidence, engStates])

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach(r => {
      if (!groups[r.type]) groups[r.type] = []
      groups[r.type].push(r)
    })
    return groups
  }, [results])

  const flatResults = results

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])
  // cleanup handled in effect return

  useEffect(() => { setSelectedIndex(0) }, [query])

  if (!open) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const r = flatResults[selectedIndex]
      if (r) { navigate(r.to); onClose() }
    } else if (e.key === 'Escape') { onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-slate-900/20" onClick={onClose} role="presentation">
      <div
        className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search applications, agents, harnesses, pipelines, executions, evidence..."
            className="flex-1 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
          />
          <kbd className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {!query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Start typing to search across the platform...
            </div>
          )}
          {query.trim() && flatResults.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No results found for "{query}"
            </div>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="px-4 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50">
                {type}
              </div>
              {items.map(r => {
                const idx = flatResults.indexOf(r)
                const Icon = r.icon
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => { navigate(r.to); onClose() }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      idx === selectedIndex ? 'bg-forgeiq-50 text-forgeiq-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} className={idx === selectedIndex ? 'text-forgeiq-600' : 'text-slate-400'} />
                    <span className="flex-1 text-left">{r.label}</span>
                    {idx === selectedIndex && <CornerDownLeft size={12} className="text-forgeiq-400" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
