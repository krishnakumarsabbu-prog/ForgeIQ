import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineTemplates, useCreatePipelineFromTemplate } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import type { PipelineTemplate } from '../types'
import {
  LayoutTemplate, GitBranch, Plus, Star, Zap, Shield, Package,
  Search, Filter, X, ChevronRight, CheckCircle2, ArrowUpRight,
} from 'lucide-react'

const categoryStyle: Record<string, { bg: string; color: string; border: string; icon: any }> = {
  development:  { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)',  icon: GitBranch },
  testing:      { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)',  icon: CheckCircle2 },
  security:     { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)',   icon: Shield },
  build:        { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)',  icon: Package },
  release:      { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)',  icon: Zap },
  deployment:   { bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed', border: 'rgba(124,58,237,0.25)', icon: Zap },
  full_sdlc:    { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)',  icon: Star },
}
const DEFAULT_CAT = { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.2)', icon: LayoutTemplate }

export default function PipelineTemplatesPage() {
  const navigate = useNavigate()
  const { data: templates, isLoading } = usePipelineTemplates()
  const createFromTemplate = useCreatePipelineFromTemplate()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const categories = useMemo(() => {
    if (!templates) return []
    return [...new Set(templates.map(t => t.category).filter(Boolean))]
  }, [templates])

  const filtered = useMemo(() => {
    if (!templates) return []
    return templates.filter(t => {
      const matchSearch = !search ||
        t.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      const matchCat = !categoryFilter || t.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [templates, search, categoryFilter])

  const handleUseTemplate = (template: PipelineTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    createFromTemplate.mutate(
      { template_id: template.id, body: { display_name: `${template.display_name} Pipeline` } },
      { onSuccess: (pipeline: any) => navigate(`/pipelines/${pipeline?.id ?? ''}`) }
    )
  }

  return (
    <>
      <PageHeader
        title="Pipeline Templates"
        description="Battle-tested pipeline blueprints for full SDLC, security-first, and specialized engineering workflows."
        icon={<LayoutTemplate size={18} />}
        badge="Templates"
        badgeVariant="violet"
        actions={
          <button onClick={() => navigate('/pipeline-builder')} className="fi-btn-primary">
            <Plus size={13} /> Build Custom Pipeline
          </button>
        }
      />

      <div className="p-6 space-y-4 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Templates"  value={templates?.length ?? 0}  sub="Available"   icon={LayoutTemplate} gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Full SDLC"        value={templates?.filter(t=>t.category==='full_sdlc').length ?? 0}   sub="End-to-end" icon={Star}          gradient={['#00adef','#0a68f4']} />
          <StatCard label="Security First"   value={templates?.filter(t=>t.category==='security').length ?? 0}    sub="Hardened"  icon={Shield}        gradient={['#f43f5e','#e11d48']} />
          <StatCard label="Deploy Templates" value={templates?.filter(t=>t.category==='deployment').length ?? 0}  sub="CD focused" icon={Zap}           gradient={['#10b981','#0891b2']} />
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)' }}>
          <Filter size={14} className="text-slate-400" />
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="fi-input pl-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="fi-input w-auto">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full ml-auto" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>
            {filtered.length} templates
          </span>
        </div>

        {/* Template Grid */}
        {isLoading ? (
          <LoadingSpinner message="Loading template library..." />
        ) : !filtered.length ? (
          <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)' }}>
            <EmptyState message="No templates found" description="Try clearing your filters or build a custom pipeline." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template: PipelineTemplate) => {
              const cs = categoryStyle[template.category?.toLowerCase() ?? ''] ?? DEFAULT_CAT
              const CatIcon = cs.icon
              return (
                <div
                  key={template.id}
                  className="rounded-2xl p-5 cursor-pointer transition-all duration-200 group relative overflow-hidden"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(226,232,240,0.8)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onClick={() => navigate(`/pipeline-templates/${template.id}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 30px -4px rgba(0,14,35,0.12)'
                    e.currentTarget.style.borderColor = cs.border
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'
                  }}
                >
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${cs.color}, ${cs.color}80)` }} />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
                        <CatIcon size={16} style={{ color: cs.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">{template.display_name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: cs.bg, color: cs.color, border: `1px solid ${cs.border}` }}>
                          {template.category?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-200 group-hover:text-sky-500 transition-colors shrink-0 mt-1" />
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">{template.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(100,116,139,0.08)', color: '#64748b', border: '1px solid rgba(100,116,139,0.15)' }}>
                        {template.stages?.length ?? template.stage_definitions?.length ?? 0} stages
                      </span>
                      {(template.built_in || template.category === 'standard') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>
                          ⭐ Official
                        </span>
                      )}
                    </div>
                    <button
                      onClick={e => handleUseTemplate(template, e)}
                      className="fi-btn-primary fi-btn-sm"
                      disabled={createFromTemplate.isPending}
                    >
                      {createFromTemplate.isPending ? 'Creating…' : 'Use Template'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
