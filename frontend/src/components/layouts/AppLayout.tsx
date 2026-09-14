import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderGit2, ListTodo, Bot, Sparkles, Wrench,
  Cpu, Layers, Network, RefreshCw, GitBranch, Workflow, Activity,
  ScrollText, Shield, FileLock2, Building2, Users, Settings,
  Package, Rocket, Server, ChevronDown, ChevronRight, ChevronLeft,
  Boxes, Gauge, Lock, FileCheck, DollarSign, Search, Plus, Bell,
  HelpCircle, Check, UserCog, Repeat, Code2, ShieldCheck, AlertTriangle,
  Zap, Star, Command, ArrowRight, TrendingUp, Circle, Calendar,
  BarChart3, Target, MessageSquare, Clock, Flame, GitFork,
} from 'lucide-react'
import { CommandPalette } from '../ui/CommandPalette'
import { useDashboard, useTenants, useExecutions } from '../../hooks/useQueries'
import { ExecutionStatus } from '../ui/StatusBadge'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  badge?: string
  badgeColor?: string
}

interface NavSection {
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Engineering',
    icon: Code2,
    items: [
      { to: '/', label: 'Command Center', icon: LayoutDashboard },
      { to: '/requirements', label: 'Requirements', icon: ListTodo },
      { to: '/applications', label: 'Applications', icon: FolderGit2 },
      { to: '/start-engineering', label: 'Start Engineering', icon: Rocket, badge: 'AI', badgeColor: 'cyan' },
      { to: '/peer-engineering', label: 'AI Peer Engineering', icon: Code2 },
      { to: '/brownfield-import', label: 'Import Application', icon: FolderGit2 },
      { to: '/pipelines', label: 'Engineering Pipelines', icon: Workflow },
      { to: '/pipeline-templates', label: 'Pipeline Templates', icon: FileLock2 },
      { to: '/executions', label: 'Executions', icon: Activity },
    ],
  },
  {
    label: 'Delivery Intelligence',
    icon: Target,
    items: [
      { to: '/delivery-intelligence', label: 'Delivery Cockpit', icon: LayoutDashboard, badge: 'Scrum', badgeColor: 'cyan' },
      { to: '/delivery-intelligence/story-weaver', label: 'Story Weaver Harness', icon: Sparkles, badge: 'Harness', badgeColor: 'violet' },
      { to: '/delivery-intelligence/sprint-health', label: 'Sprint Health', icon: Activity },
      { to: '/delivery-intelligence/sprint-planner', label: 'Sprint Planner', icon: Calendar },
      { to: '/delivery-intelligence/story-intelligence', label: 'Story Intelligence', icon: ListTodo },
      { to: '/delivery-intelligence/team-allocation', label: 'Team Allocation', icon: Users },
      { to: '/delivery-intelligence/velocity', label: 'Velocity Intelligence', icon: BarChart3 },
      { to: '/delivery-intelligence/dependency-graph', label: 'Dependency Graph', icon: GitBranch },
      { to: '/delivery-intelligence/risk-center', label: 'Risk Center', icon: AlertTriangle, badge: 'AI Risk', badgeColor: 'amber' },
      { to: '/delivery-intelligence/forecast', label: 'Release Forecast', icon: TrendingUp },
      { to: '/delivery-intelligence/daily-scrum', label: 'Daily Scrum', icon: Clock },
      { to: '/delivery-intelligence/copilot', label: 'Delivery Copilot', icon: MessageSquare, badge: 'AI', badgeColor: 'violet' },
    ],
  },
  {
    label: 'AI Factory',
    icon: Sparkles,
    items: [
      { to: '/agents', label: 'Agent Catalog', icon: Bot },
      { to: '/agent-factory', label: 'Agent Factory', icon: Sparkles, badge: 'New', badgeColor: 'violet' },
      { to: '/skills', label: 'Skills', icon: Boxes },
      { to: '/tools', label: 'Tools', icon: Wrench },
      { to: '/models', label: 'Models', icon: Cpu },
      { to: '/agent-executions', label: 'Agent Executions', icon: Activity },
    ],
  },
  {
    label: 'Harness Engineering',
    icon: Network,
    items: [
      { to: '/harnesses', label: 'Harness Catalog', icon: Layers },
      { to: '/harness-builder', label: 'Harness Builder', icon: Network },
      { to: '/graph-engineering', label: 'Graph Engineering', icon: GitBranch },
      { to: '/loop-engineering', label: 'Loop Engineering', icon: RefreshCw },
      { to: '/loop-builder', label: 'Loop Builder', icon: Repeat },
      { to: '/harness-templates', label: 'Harness Templates', icon: FileLock2 },
      { to: '/harness-versions', label: 'Harness Versions', icon: Layers },
    ],
  },
  {
    label: 'Automation',
    icon: Rocket,
    items: [
      { to: '/approvals', label: 'Approvals', icon: ShieldCheck },
      { to: '/build-automation', label: 'Build Automation', icon: Package },
      { to: '/release-automation', label: 'Release Automation', icon: Rocket },
      { to: '/deployments', label: 'Deployments', icon: Server },
      { to: '/environments', label: 'Environments', icon: Server },
    ],
  },
  {
    label: 'Operations',
    icon: AlertTriangle,
    items: [
      { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
    ],
  },
  {
    label: 'Intelligence',
    icon: TrendingUp,
    items: [
      { to: '/engineering-state', label: 'Engineering State', icon: Network },
      { to: '/delivery-intelligence/state', label: 'Delivery State', icon: Target, badge: 'New', badgeColor: 'cyan' },
      { to: '/evidence', label: 'Evidence', icon: ScrollText },
      { to: '/quality', label: 'Quality', icon: Gauge },
      { to: '/security', label: 'Security', icon: Shield },
      { to: '/engineering-economics', label: 'Eng. Economics', icon: DollarSign },
    ],
  },
  {
    label: 'Governance',
    icon: Shield,
    items: [
      { to: '/policies', label: 'Policies', icon: Shield },
      { to: '/permissions', label: 'Permissions', icon: Lock },
      { to: '/audit', label: 'Audit', icon: FileLock2 },
      { to: '/governance', label: 'Governance', icon: FileCheck },
    ],
  },
  {
    label: 'Administration',
    icon: Settings,
    items: [
      { to: '/tenants', label: 'Tenants', icon: Building2 },
      { to: '/users', label: 'Users & Roles', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const createMenuItems = [
  { label: 'Start Engineering', to: '/start-engineering', icon: Rocket, desc: 'Launch AI-powered engineering' },
  { label: 'New Application', to: '/applications', icon: FolderGit2, desc: 'Register a new application' },
  { label: 'New Requirement', to: '/requirements', icon: ListTodo, desc: 'Capture engineering requirements' },
  { label: 'Create Agent', to: '/agent-factory', icon: Bot, desc: 'Build autonomous AI agent' },
  { label: 'Create Harness', to: '/harness-builder', icon: Layers, desc: 'Design harness workflow' },
  { label: 'Create Pipeline', to: '/pipeline-builder', icon: Workflow, desc: 'Configure CI/CD pipeline' },
  { label: 'Import Application', to: '/brownfield-import', icon: FolderGit2, desc: 'Import brownfield app' },
]

const badgeStyles: Record<string, string> = {
  cyan: 'bg-sky-500/15 text-sky-500 border border-sky-500/25',
  violet: 'bg-violet-500/15 text-violet-400 border border-violet-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
}

function useClickOutside<T extends HTMLElement>(callback: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) callback()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [callback])
  return ref
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [commandOpen, setCommandOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [tenantOpen, setTenantOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState('Acme Corp')

  const { data: dashboard } = useDashboard()
  const { data: tenants } = useTenants()
  const { data: executions } = useExecutions()

  const createRef = useClickOutside<HTMLDivElement>(() => setCreateOpen(false))
  const notifRef = useClickOutside<HTMLDivElement>(() => setNotifOpen(false))
  const userRef = useClickOutside<HTMLDivElement>(() => setUserOpen(false))
  const tenantRef = useClickOutside<HTMLDivElement>(() => setTenantOpen(false))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleSection = (label: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const runningExecutions = executions?.filter(e => e.status === 'RUNNING').length ?? 0
  const failedExecutions = executions?.filter(e => e.status === 'FAILED').length ?? 0
  const approvalExecutions = executions?.filter(e => e.status === 'AWAITING_APPROVAL').length ?? 0
  const notifications = executions?.filter(e => e.status === 'AWAITING_APPROVAL' || e.status === 'FAILED').slice(0, 10) ?? []

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: '#f1f5f9' }}>
      {/* ─── Left Navigation — Dark Enterprise Sidebar ─── */}
      <aside
        className={`flex flex-col overflow-hidden transition-all duration-300 ease-out z-20 shrink-0 ${
          navCollapsed ? 'w-[60px]' : 'w-[240px]'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0b0f19 0%, #0d1424 60%, #0b0f19 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand Header */}
        <div
          className="h-16 flex items-center justify-between shrink-0 px-3.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo Mark */}
            <div
              className="relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #00adef 0%, #0a68f4 100%)',
                boxShadow: '0 0 16px rgba(0,173,239,0.5)',
              }}
            >
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            {!navCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-sm tracking-tight">ForgeIQ</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                    style={{
                      background: 'rgba(0,173,239,0.15)',
                      color: '#00adef',
                      border: '1px solid rgba(0,173,239,0.3)',
                    }}
                  >
                    Enterprise
                  </span>
                </div>
                <div className="text-[10px] font-medium mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                  AI Engineering Factory
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map(section => {
            const isCollapsed = collapsedSections.has(section.label)
            return (
              <div key={section.label}>
                {!navCollapsed && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between px-2 py-1 mb-1 text-left group"
                  >
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: 'rgba(100,116,139,0.9)' }}
                    >
                      {section.label}
                    </span>
                    <ChevronDown
                      size={10}
                      style={{ color: 'rgba(100,116,139,0.6)' }}
                      className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                  </button>
                )}
                {navCollapsed && (
                  <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                )}
                {(!isCollapsed || navCollapsed) && (
                  <div className="space-y-0.5">
                    {section.items.map(item => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          title={navCollapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            `relative flex items-center gap-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-150 group ${
                              navCollapsed ? 'px-2 justify-center' : 'px-2.5'
                            } ${
                              isActive
                                ? 'text-white'
                                : 'hover:text-white'
                            }`
                          }
                          style={({ isActive }) => ({
                            background: isActive
                              ? 'linear-gradient(135deg, rgba(0,173,239,0.18) 0%, rgba(10,104,244,0.12) 100%)'
                              : undefined,
                            border: isActive
                              ? '1px solid rgba(0,173,239,0.25)'
                              : '1px solid transparent',
                            color: isActive ? '#e2e8f0' : 'rgba(148,163,184,0.8)',
                          })}
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span
                                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full"
                                  style={{ background: 'linear-gradient(180deg, #00adef, #0a68f4)' }}
                                />
                              )}
                              <Icon
                                size={14}
                                className="shrink-0"
                                style={{ color: isActive ? '#00adef' : 'rgba(100,116,139,0.9)' }}
                              />
                              {!navCollapsed && (
                                <span className="truncate flex-1">{item.label}</span>
                              )}
                              {!navCollapsed && item.badge && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider ${
                                    badgeStyles[item.badgeColor ?? 'cyan']
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Cluster Runtime Status */}
        {!navCollapsed && (
          <div
            className="p-3 shrink-0 mx-2 mb-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-semibold flex items-center gap-1.5" style={{ color: '#e2e8f0' }}>
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
                />
                US-East-1 Cluster
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                99.98%
              </span>
            </div>
            <div className="text-[10px]" style={{ color: 'rgba(100,116,139,0.8)' }}>
              Orchestrator v2.4 • Autonomous Guard active
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <div className="px-2 py-2 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setNavCollapsed(!navCollapsed)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150"
            style={{ color: 'rgba(100,116,139,0.8)' }}
            onMouseEnter={e => {
              ;(e.target as HTMLElement).closest('button')!.style.background = 'rgba(255,255,255,0.05)'
              ;(e.target as HTMLElement).closest('button')!.style.color = '#e2e8f0'
            }}
            onMouseLeave={e => {
              ;(e.target as HTMLElement).closest('button')!.style.background = 'transparent'
              ;(e.target as HTMLElement).closest('button')!.style.color = 'rgba(100,116,139,0.8)'
            }}
          >
            {navCollapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Collapse</>}
          </button>
        </div>
      </aside>

      {/* ─── Main Workspace ─── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header — Glassmorphic Enterprise Bar */}
        <header
          className="h-16 flex items-center gap-3 px-5 shrink-0 z-10"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* Tenant Selector */}
          <div className="relative" ref={tenantRef}>
            <button
              onClick={() => setTenantOpen(!tenantOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150"
              style={{
                background: 'rgba(248,250,252,0.8)',
                borderColor: '#e2e8f0',
                color: '#0f172a',
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #00adef, #0a68f4)' }}
              >
                <Building2 size={11} />
              </div>
              <span className="font-bold">{selectedTenant}</span>
              <ChevronDown size={11} className="text-slate-400 ml-0.5" />
            </button>
            {tenantOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-64 rounded-2xl z-50 py-2 animate-scale-in"
                style={{
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(226,232,240,0.9)',
                  boxShadow: '0 8px 32px -4px rgba(0,0,0,0.15)',
                }}
              >
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Organizations
                </div>
                {tenants?.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTenant(t.display_name || t.name); setTenantOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Building2 size={13} className="text-slate-400" />
                    <span className="flex-1 text-left font-medium">{t.display_name || t.name}</span>
                    {(t.display_name ?? t.name) === selectedTenant && <Check size={13} className="text-sky-600" />}
                  </button>
                )) ?? (
                  <div className="px-4 py-2.5 text-xs text-slate-500">Acme Corp</div>
                )}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button onClick={() => { navigate('/tenants'); setTenantOpen(false) }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50">
                    <Plus size={13} className="text-slate-400" /> Add Organization
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Agent Status Pill */}
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border"
            style={{
              background: 'rgba(16,185,129,0.06)',
              borderColor: 'rgba(16,185,129,0.2)',
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold" style={{ color: '#059669' }}>6 Agents Autonomous</span>
          </div>

          {/* Global Search */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs rounded-xl border transition-all duration-150 w-72 md:w-96"
            style={{
              background: 'rgba(248,250,252,0.8)',
              borderColor: '#e2e8f0',
              color: '#94a3b8',
            }}
            onMouseEnter={e => {
              const btn = e.currentTarget
              btn.style.borderColor = '#cbd5e1'
              btn.style.background = '#fff'
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget
              btn.style.borderColor = '#e2e8f0'
              btn.style.background = 'rgba(248,250,252,0.8)'
            }}
          >
            <Search size={13} className="text-slate-400 shrink-0" />
            <span className="flex-1 text-left text-xs text-slate-400">Search pipelines, agents, runs...</span>
            <kbd
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#94a3b8' }}
            >
              ⌘K
            </kbd>
          </button>

          <div className="flex-1" />

          {/* Execution Status Indicators */}
          <div className="flex items-center gap-2">
            {runningExecutions > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border cursor-pointer"
                style={{ background: 'rgba(14,165,233,0.08)', borderColor: 'rgba(14,165,233,0.25)', color: '#0284c7' }}
                onClick={() => navigate('/executions')}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="font-bold text-[11px]">{runningExecutions} Active</span>
              </div>
            )}
            {approvalExecutions > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border cursor-pointer"
                style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', color: '#b45309' }}
                onClick={() => navigate('/approvals')}
              >
                <Bell size={11} />
                <span className="font-bold text-[11px]">{approvalExecutions} Pending</span>
              </div>
            )}
            {failedExecutions > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border cursor-pointer"
                style={{ background: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.25)', color: '#e11d48' }}
                onClick={() => navigate('/executions')}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="font-bold text-[11px]">{failedExecutions} Failed</span>
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="relative" ref={createRef}>
            <button
              onClick={() => setCreateOpen(!createOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl transition-all duration-150"
              style={{
                background: 'linear-gradient(135deg, #00adef 0%, #0a68f4 100%)',
                boxShadow: '0 2px 8px rgba(0,173,239,0.4)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,173,239,0.55)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,173,239,0.4)'
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Create
              <ChevronDown size={11} />
            </button>
            {createOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-72 rounded-2xl z-50 py-2 animate-scale-in"
                style={{
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(226,232,240,0.9)',
                  boxShadow: '0 8px 32px -4px rgba(0,0,0,0.15)',
                }}
              >
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Actions
                </div>
                {createMenuItems.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      onClick={() => { navigate(item.to); setCreateOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors group"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(14,165,233,0.1)' }}
                      >
                        <Icon size={14} className="text-sky-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                      </div>
                      <ArrowRight size={12} className="text-slate-300 group-hover:text-sky-500 ml-auto transition-colors" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f1f5f9'
                e.currentTarget.style.color = '#0f172a'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              <Bell size={17} />
              {notifications.length > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white"
                  style={{ background: '#f43f5e' }}
                />
              )}
            </button>
            {notifOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-88 rounded-2xl z-50 animate-scale-in overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(226,232,240,0.9)',
                  boxShadow: '0 8px 32px -4px rgba(0,0,0,0.15)',
                  width: '336px',
                }}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Notifications</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(14,165,233,0.1)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }}
                  >
                    {notifications.length} active
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">All systems operating within bounds</div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => { navigate(`/executions/${n.id}`); setNotifOpen(false) }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0`}
                          style={{ background: n.status === 'FAILED' ? '#f43f5e' : '#f59e0b' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            Execution {n.id.slice(0, 8)} — {n.status === 'AWAITING_APPROVAL' ? 'Approval required' : 'Execution failed'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{n.trigger_reason}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button
            className="p-2 rounded-xl transition-colors"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.color = '#64748b'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            <HelpCircle size={17} />
          </button>

          {/* User Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm"
                style={{ background: 'linear-gradient(135deg, #00adef, #7c3aed)' }}
              >
                SC
              </div>
              <ChevronDown size={11} className="text-slate-400" />
            </button>
            {userOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-60 rounded-2xl z-50 py-2 animate-scale-in"
                style={{
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(226,232,240,0.9)',
                  boxShadow: '0 8px 32px -4px rgba(0,0,0,0.15)',
                }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm mb-2"
                    style={{ background: 'linear-gradient(135deg, #00adef, #7c3aed)' }}
                  >
                    SC
                  </div>
                  <div className="text-xs font-bold text-slate-900">Sarah Chen</div>
                  <div className="text-[11px] text-slate-500">sarah@acme.com</div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-flex"
                    style={{ background: 'rgba(0,173,239,0.1)', color: '#0284c7', border: '1px solid rgba(0,173,239,0.2)' }}
                  >
                    Platform Admin
                  </span>
                </div>
                <button onClick={() => { navigate('/settings'); setUserOpen(false) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                  <UserCog size={13} className="text-slate-400" /> Profile & Keys
                </button>
                <button onClick={() => { navigate('/settings'); setUserOpen(false) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                  <Settings size={13} className="text-slate-400" /> Platform Settings
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button onClick={() => { navigate('/'); setUserOpen(false) }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors">
                    <Lock size={13} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-harness-dots">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  )
}
