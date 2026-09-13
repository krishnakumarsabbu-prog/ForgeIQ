import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderGit2, ListTodo, Bot, Sparkles, Wrench,
  Cpu, Layers, Network, RefreshCw, GitBranch, Workflow, Activity,
  ScrollText, Shield, FileLock2, Building2, Users, Settings,
  Package, Rocket, Server, ChevronDown, ChevronRight, ChevronLeft,
  Boxes, Gauge, Lock, FileCheck, DollarSign, Search, Plus, Bell,
  HelpCircle, Check, UserCog, Repeat, Code2, ShieldCheck,
} from 'lucide-react'
import { CommandPalette } from '../ui/CommandPalette'
import { useDashboard, useTenants, useExecutions } from '../../hooks/useQueries'
import { ExecutionStatus } from '../ui/StatusBadge'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Engineering',
    items: [
      { to: '/', label: 'Command Center', icon: LayoutDashboard },
      { to: '/requirements', label: 'Requirements', icon: ListTodo },
      { to: '/applications', label: 'Applications', icon: FolderGit2 },
      { to: '/start-engineering', label: 'Start Engineering', icon: Rocket },
      { to: '/peer-engineering', label: 'Peer Engineering', icon: Code2 },
      { to: '/brownfield-import', label: 'Import Application', icon: FolderGit2 },
      { to: '/pipelines', label: 'Engineering Pipelines', icon: Workflow },
      { to: '/pipeline-templates', label: 'Pipeline Templates', icon: FileLock2 },
      { to: '/executions', label: 'Executions', icon: Activity },
    ],
  },
  {
    label: 'AI Factory',
    items: [
      { to: '/agents', label: 'Agent Catalog', icon: Bot },
      { to: '/agent-factory', label: 'Agent Factory', icon: Sparkles },
      { to: '/skills', label: 'Skills', icon: Boxes },
      { to: '/tools', label: 'Tools', icon: Wrench },
      { to: '/models', label: 'Models', icon: Cpu },
      { to: '/agent-executions', label: 'Agent Executions', icon: Activity },
    ],
  },
  {
    label: 'Harness Engineering',
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
    label: 'Delivery',
    items: [
      { to: '/build-automation', label: 'Build Automation', icon: Package },
      { to: '/release-automation', label: 'Release Automation', icon: Rocket },
      { to: '/deployments', label: 'Deployments', icon: Server },
      { to: '/environments', label: 'Environments', icon: Server },
    ],
  },
  {
    label: 'Engineering Intelligence',
    items: [
      { to: '/engineering-state', label: 'Engineering State', icon: Network },
      { to: '/evidence', label: 'Evidence', icon: ScrollText },
      { to: '/quality', label: 'Quality', icon: Gauge },
      { to: '/security', label: 'Security', icon: Shield },
      { to: '/engineering-economics', label: 'Engineering Economics', icon: DollarSign },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/policies', label: 'Policies', icon: Shield },
      { to: '/permissions', label: 'Permissions', icon: Lock },
      { to: '/audit', label: 'Audit', icon: FileLock2 },
      { to: '/governance', label: 'Governance', icon: FileCheck },
      { to: '/approvals', label: 'Approvals', icon: ShieldCheck },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/tenants', label: 'Tenants', icon: Building2 },
      { to: '/users', label: 'Users & Roles', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const createMenuItems = [
  { label: 'Start Engineering', to: '/start-engineering', icon: Rocket },
  { label: 'New Application', to: '/applications', icon: FolderGit2 },
  { label: 'New Requirement', to: '/requirements', icon: ListTodo },
  { label: 'Create Agent', to: '/agent-factory', icon: Bot },
  { label: 'Create Harness', to: '/harness-builder', icon: Layers },
  { label: 'Create Pipeline', to: '/pipeline-builder', icon: Workflow },
  { label: 'Import Application', to: '/brownfield-import', icon: FolderGit2 },
]

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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Left Navigation */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-all duration-200 ${navCollapsed ? 'w-14' : 'w-60'}`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-3 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-forgeiq-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          {!navCollapsed && (
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm leading-tight">ForgeIQ</div>
              <div className="text-[10px] text-slate-500 leading-tight">AI Engineering Factory</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-1">
          {navSections.map(section => {
            const isCollapsed = collapsedSections.has(section.label)
            return (
              <div key={section.label} className="mb-0.5">
                {!navCollapsed && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600"
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    {section.label}
                  </button>
                )}
                {navCollapsed && (
                  <div className="px-2 my-1 border-t border-slate-100" />
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
                            `flex items-center gap-2.5 py-1.5 text-sm rounded-md transition-colors ${
                              navCollapsed ? 'px-2.5 mx-1.5 justify-center' : 'px-3 mx-1'
                            } ${
                              isActive
                                ? 'bg-forgeiq-50 text-forgeiq-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`
                          }
                        >
                          <Icon size={15} className="shrink-0" />
                          {!navCollapsed && <span className="truncate">{item.label}</span>}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-2 py-2 border-t border-slate-200 shrink-0">
          <button
            onClick={() => setNavCollapsed(!navCollapsed)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md"
          >
            {navCollapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Collapse</>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 shrink-0">
          {/* Tenant Selector */}
          <div className="relative" ref={tenantRef}>
            <button
              onClick={() => setTenantOpen(!tenantOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              <div className="w-5 h-5 rounded bg-forgeiq-100 flex items-center justify-center">
                <Building2 size={11} className="text-forgeiq-700" />
              </div>
              <span className="font-medium">{selectedTenant}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {tenantOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                {tenants?.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTenant(t.display_name || t.name); setTenantOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Building2 size={14} className="text-slate-400" />
                    <span className="flex-1 text-left">{t.display_name || t.name}</span>
                    {t.display_name === selectedTenant && <Check size={14} className="text-forgeiq-600" />}
                  </button>
                )) ?? (
                  <div className="px-3 py-2 text-sm text-slate-500">Acme Corp</div>
                )}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Plus size={14} className="text-slate-400" /> Add Tenant
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Global Search */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 hover:bg-white transition-colors w-72"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] text-slate-400 bg-slate-200 px-1 py-0.5 rounded">⌘K</kbd>
          </button>

          <div className="flex-1" />

          {/* Execution Status Indicators */}
          <div className="flex items-center gap-1.5">
            {runningExecutions > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md" title={`${runningExecutions} running executions`}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-medium text-blue-700">{runningExecutions}</span>
              </div>
            )}
            {approvalExecutions > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md" title={`${approvalExecutions} awaiting approval`}>
                <Bell size={11} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700">{approvalExecutions}</span>
              </div>
            )}
            {failedExecutions > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-md" title={`${failedExecutions} failed executions`}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-700">{failedExecutions}</span>
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="relative" ref={createRef}>
            <button
              onClick={() => setCreateOpen(!createOpen)}
              className="fi-btn-primary"
            >
              <Plus size={14} /> Create
              <ChevronDown size={12} className="ml-0.5" />
            </button>
            {createOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                {createMenuItems.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      onClick={() => { navigate(item.to); setCreateOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Icon size={14} className="text-slate-400" />
                      {item.label}
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
              className="relative p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Notifications</span>
                  <span className="text-xs text-slate-400">{notifications.length} active</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-slate-400">No active notifications</div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => { navigate(`/executions/${n.id}`); setNotifOpen(false) }}
                        className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 text-left"
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate">
                            Execution {n.id.slice(0, 8)} — {n.status === 'AWAITING_APPROVAL' ? 'Approval required' : 'Execution failed'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{n.trigger_reason}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md">
            <HelpCircle size={18} />
          </button>

          {/* User Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-slate-100 rounded-md"
            >
              <div className="w-7 h-7 rounded-full bg-forgeiq-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-forgeiq-700">SC</span>
              </div>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {userOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-900">Sarah Chen</div>
                  <div className="text-xs text-slate-500">sarah@acme.com</div>
                </div>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <UserCog size={14} className="text-slate-400" /> Profile
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Settings size={14} className="text-slate-400" /> Settings
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Lock size={14} className="text-slate-400" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  )
}
