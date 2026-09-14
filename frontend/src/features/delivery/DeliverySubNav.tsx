import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Calendar, ListTodo, Users, BarChart3,
  GitBranch, AlertTriangle, TrendingUp, Clock, MessageSquare,
  Sparkles, Bot, Zap, RefreshCw
} from 'lucide-react'

interface DeliverySubNavProps {
  activeTab?: string
  onQuickCrawl?: () => void
  onQuickWeave?: () => void
  crawling?: boolean
}

export const DELIVERY_TABS = [
  { to: '/delivery-intelligence', label: 'Cockpit', icon: LayoutDashboard, exact: true },
  { to: '/delivery-intelligence/story-weaver', label: 'Story Weaver Harness', icon: Sparkles, badge: 'Agent Pipeline' },
  { to: '/delivery-intelligence/sprint-health', label: 'Sprint Health', icon: Activity },
  { to: '/delivery-intelligence/daily-scrum', label: 'Daily Scrum & Scheduler', icon: Clock, badge: 'Harness' },
  { to: '/delivery-intelligence/sprint-planner', label: 'Sprint Planner', icon: Calendar },
  { to: '/delivery-intelligence/story-intelligence', label: 'Story Intelligence & DoR', icon: ListTodo },
  { to: '/delivery-intelligence/team-allocation', label: 'Team Allocation', icon: Users },
  { to: '/delivery-intelligence/velocity', label: 'Velocity Intelligence', icon: BarChart3 },
  { to: '/delivery-intelligence/dependency-graph', label: 'Dependency Graph', icon: GitBranch },
  { to: '/delivery-intelligence/risk-center', label: 'Risk Center', icon: AlertTriangle, badge: 'AI Risk' },
  { to: '/delivery-intelligence/forecast', label: 'Release Forecast', icon: TrendingUp },
  { to: '/delivery-intelligence/copilot', label: 'Delivery Copilot', icon: MessageSquare },
]

export default function DeliverySubNav({ activeTab, onQuickCrawl, onQuickWeave, crawling }: DeliverySubNavProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Top Banner: Autonomous Delivery Harness Engine Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700/60 shadow-lg shadow-indigo-950/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Delivery Harness Active
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-400">Pipeline:</span>
            <span className="text-cyan-300 font-medium">StoryWeaver</span>
            <span className="text-slate-500">→</span>
            <span className="text-blue-300 font-medium">Jira Agent</span>
            <span className="text-slate-500">→</span>
            <span className="text-emerald-300 font-medium">Code Analyzer</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-300 font-medium">Daily Scheduler (09:00 UTC)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onQuickWeave && (
            <button
              onClick={onQuickWeave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles size={13} />
              Weave Stories
            </button>
          )}
          {onQuickCrawl && (
            <button
              disabled={crawling}
              onClick={onQuickCrawl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            >
              <RefreshCw size={13} className={crawling ? 'animate-spin text-cyan-400' : ''} />
              {crawling ? 'Crawling Jira...' : 'Crawl Jira Daily'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        {DELIVERY_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.exact}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-[1.02]'
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800'
                }`
              }
            >
              <Icon size={14} className="shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                  {tab.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
