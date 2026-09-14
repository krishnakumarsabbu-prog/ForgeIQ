import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat, Zap, AlertTriangle, ArrowUpCircle, Plus, Clock, DollarSign, Activity, GitBranch, Shield, RefreshCw, CheckCircle2, XCircle, ArrowRight, Settings2, ChevronRight, MoreVertical, Trash2 } from 'lucide-react'
import { useLoops, useDeleteLoop, usePublishLoop } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Loop, LoopStep } from '../types'

const LOOP_TYPE_META: Record<string, { bg: string; color: string; border: string; icon: any }> = {
  retry:                   { bg: 'rgba(249,115,22,0.1)',  color: '#ea580c', border: 'rgba(249,115,22,0.25)',  icon: RefreshCw },
  fix:                     { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', border: 'rgba(14,165,233,0.25)',  icon: GitBranch },
  validation:              { bg: 'rgba(16,185,129,0.1)',  color: '#059669', border: 'rgba(16,185,129,0.25)',  icon: CheckCircle2 },
  security_remediation:    { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)',   icon: Shield },
  deployment_verification: { bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed', border: 'rgba(124,58,237,0.25)', icon: Activity },
  rollback:                { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)',  icon: ArrowUpCircle },
  incident_remediation:    { bg: 'rgba(244,63,94,0.1)',   color: '#e11d48', border: 'rgba(244,63,94,0.25)',   icon: AlertTriangle },
  human_escalation:        { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.2)', icon: ArrowUpCircle },
  continuous_improvement:  { bg: 'rgba(6,182,212,0.1)',   color: '#0891b2', border: 'rgba(6,182,212,0.25)',  icon: Activity },
}
const DEFAULT_LOOP = { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.2)', icon: Repeat }

function formatCost(cents: number): string {
  return cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`
}

function formatBackoff(strategy: string, initial: number, max: number): string {
  if (strategy === 'none') return 'No backoff'
  if (strategy === 'fixed') return `Fixed ${initial}ms`
  if (strategy === 'linear') return `Linear ${initial}–${max}ms`
  return `Exponential ${initial}–${max}ms`
}

export default function LoopEngineeringPage() {
  const navigate = useNavigate()
  const { data: loops, isLoading } = useLoops()
  const deleteLoop = useDeleteLoop()
  const publishLoop = usePublishLoop()
  const [selectedLoop, setSelectedLoop] = useState<Loop | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const published = loops?.filter(l => l.published).length ?? 0
  const draft = loops?.filter(l => !l.published).length ?? 0

  const confirmDelete = () => {
    if (!selectedLoop) return
    deleteLoop.mutate(selectedLoop.id, {
      onSuccess: () => {
        setSelectedLoop(null)
        setShowDeleteConfirm(false)
      }
    })
  }

  return (
    <>
      <PageHeader
        title="Feedback Loops"
        description="Autonomous remediation, retry orchestration, and continuous improvement loops for resilient delivery."
        icon={<Repeat size={18} />}
        badge="Resilience"
        badgeVariant="violet"
        actions={
          <button onClick={() => navigate('/loop-builder')} className="fi-btn-primary">
            <Plus size={13} /> New Loop
          </button>
        }
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Loops"   value={loops?.length ?? 0}  sub="Registered"  icon={Repeat}       gradient={['#7c3aed','#4f46e5']} />
          <StatCard label="Published"     value={published}            sub="Active"      icon={CheckCircle2}  gradient={['#10b981','#0891b2']} />
          <StatCard label="Draft"         value={draft}                sub="In design"   icon={Clock}        gradient={['#f59e0b','#f97316']} />
          <StatCard label="Loop Types"    value={new Set(loops?.map(l=>l.loop_type).filter(Boolean)).size} sub="Patterns" icon={Activity} gradient={['#00adef','#0a68f4']} />
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading feedback loops..." />
        ) : !loops?.length ? (
          <EnterpriseCard>
            <EmptyState
              message="No feedback loops defined"
              description="Design autonomous retry, remediation, and validation loops."
              icon={<Repeat size={24} className="text-slate-300" />}
              action={<button className="fi-btn-primary" onClick={() => navigate('/loop-builder')}><Plus size={13} /> New Loop</button>}
            />
          </EnterpriseCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loops.map((loop: Loop) => {
              const meta = LOOP_TYPE_META[loop.loop_type] ?? DEFAULT_LOOP
              const MetaIcon = meta.icon
              return (
                <div
                  key={loop.id}
                  className="rounded-2xl p-5 cursor-pointer transition-all duration-200 group relative overflow-hidden"
                  style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  onClick={() => setSelectedLoop(loop)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(0,14,35,0.1)'; e.currentTarget.style.borderColor = meta.border }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)' }}
                >
                  {/* Accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}80)` }} />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                        <MetaIcon size={16} style={{ color: meta.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">{loop.display_name || loop.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                          {loop.loop_type?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={loop.published ? 'PUBLISHED' : 'DRAFT'} />
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{loop.description || 'No description.'}</p>

                  <div className="flex items-center justify-between text-[11px] pt-3" style={{ borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="flex items-center gap-1">
                        <ArrowRight size={10} /> {loop.steps?.length ?? 0} steps
                      </span>
                      <span className="flex items-center gap-1">
                        <RefreshCw size={10} /> Max {loop.max_iterations ?? '∞'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        className="fi-btn-primary fi-btn-sm"
                        onClick={() => navigate(`/loops/${loop.id}`)}
                      >
                        Configure
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        onClick={() => { setSelectedLoop(loop); setShowDeleteConfirm(true) }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Loop Detail Drawer */}
      <SideDrawer
        open={!!selectedLoop && !showDeleteConfirm}
        onClose={() => setSelectedLoop(null)}
        title={selectedLoop?.display_name || ''}
        subtitle={selectedLoop?.loop_type?.replace('_', ' ')}
      >
        {selectedLoop && (
          <div className="p-5 space-y-5">
            <DetailsPanel columns={2} items={[
              { label: 'Loop ID',         value: <span className="font-mono text-xs">{selectedLoop.id}</span> },
              { label: 'Type',            value: <span className="capitalize text-xs">{selectedLoop.loop_type?.replace('_', ' ')}</span> },
              { label: 'Max Iterations',  value: String(selectedLoop.max_iterations ?? '∞') },
              { label: 'Trigger Event',   value: selectedLoop.trigger_event || selectedLoop.trigger || '—' },
              { label: 'Status',          value: <StatusBadge status={selectedLoop.published ? 'PUBLISHED' : 'DRAFT'} /> },
              { label: 'Steps',           value: `${selectedLoop.steps?.length ?? 0} steps` },
            ]} />
            {selectedLoop.steps && selectedLoop.steps.length > 0 && (
              <div>
                <h3 className="fi-section-label mb-3">Loop Steps</h3>
                <div className="space-y-2">
                  {selectedLoop.steps.map((step: LoopStep, i: number) => (
                    <div key={step.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.7)' }}>
                      <span className="font-mono text-[11px] font-bold text-slate-400 w-5">#{i+1}</span>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-800">{step.name || step.label || step.step_type}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{step.step_type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => navigate(`/loops/${selectedLoop.id}`)} className="fi-btn-primary flex-1">Configure</button>
              {!selectedLoop.published && (
                <button
                  onClick={() => publishLoop.mutate(selectedLoop.id)}
                  disabled={publishLoop.isPending}
                  className="fi-btn-success flex-1"
                >
                  Publish
                </button>
              )}
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Delete Confirm */}
      <SideDrawer
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Loop"
        subtitle={selectedLoop?.display_name}
        footer={
          <>
            <button onClick={() => setShowDeleteConfirm(false)} className="fi-btn-secondary">Cancel</button>
            <button onClick={confirmDelete} disabled={deleteLoop.isPending} className="fi-btn-danger">
              {deleteLoop.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <div className="p-5">
          <div className="p-4 rounded-xl text-sm text-slate-700 leading-relaxed" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}>
            This will permanently delete the loop <strong>"{selectedLoop?.display_name}"</strong>. Any harnesses referencing this loop will need to be reconfigured.
          </div>
        </div>
      </SideDrawer>
    </>
  )
}
