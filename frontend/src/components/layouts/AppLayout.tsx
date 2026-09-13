import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, FolderGit2, ListTodo, Bot, Sparkles, Wrench,
  Cpu, Layers, Network, RefreshCw, GitBranch, Workflow, Activity,
  ScrollText, Shield, FileLock2, Building2, Users, Settings,
  Package, Rocket, Server, ChevronDown, ChevronRight, Boxes,
} from 'lucide-react'

interface NavSection {
  label: string
  items: { to: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[]
}

const navSections: NavSection[] = [
  {
    label: 'Engineering',
    items: [
      { to: '/', label: 'Command Center', icon: LayoutDashboard },
      { to: '/requirements', label: 'Requirements', icon: ListTodo },
      { to: '/applications', label: 'Applications', icon: FolderGit2 },
      { to: '/pipelines', label: 'Engineering Pipelines', icon: Workflow },
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
      { to: '/harness-templates', label: 'Harness Templates', icon: FileLock2 },
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
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/policies', label: 'Policies', icon: Shield },
      { to: '/audit', label: 'Audit', icon: FileLock2 },
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

export function AppLayout() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (label: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-forgeiq-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight">ForgeIQ</div>
            <div className="text-[10px] text-slate-500 leading-tight">AI Engineering Factory</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navSections.map(section => {
            const isCollapsed = collapsed.has(section.label)
            return (
              <div key={section.label} className="mb-1">
                <button
                  onClick={() => toggle(section.label)}
                  className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600"
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {section.label}
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {section.items.map(item => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-1.5 text-sm mx-1 rounded-md transition-colors ${
                              isActive
                                ? 'bg-forgeiq-50 text-forgeiq-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`
                          }
                        >
                          <Icon size={15} />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="px-3 py-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-xs font-medium text-slate-600">SC</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700 truncate">Sarah Chen</div>
              <div className="text-[10px] text-slate-400 truncate">Tenant Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
