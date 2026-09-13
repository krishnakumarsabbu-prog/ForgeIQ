import { Settings, ShieldCheck, Cpu, Bell } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'

interface ConfigItem {
  label: string
  value: string
}

interface ConfigSection {
  icon: typeof Settings
  title: string
  description: string
  items: ConfigItem[]
}

const sections: ConfigSection[] = [
  {
    icon: Settings,
    title: 'General',
    description: 'Platform-wide configuration',
    items: [
      { label: 'Platform Name', value: 'ForgeIQ' },
      { label: 'Default Tenant', value: 'tenant_forgeiq' },
      { label: 'API Version', value: 'v1' },
      { label: 'Environment', value: 'production' },
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Security',
    description: 'Authentication, authorization, and audit',
    items: [
      { label: 'Auth Provider', value: 'Supabase Auth' },
      { label: 'RLS Enabled', value: 'true' },
      { label: 'Evidence Hashing', value: 'SHA-256' },
      { label: 'Session Timeout', value: '3600s' },
    ],
  },
  {
    icon: Cpu,
    title: 'Models',
    description: 'LLM model configurations',
    items: [
      { label: 'Default Provider', value: 'OpenAI' },
      { label: 'Default Model', value: 'gpt-4o' },
      { label: 'Fallback Model', value: 'gpt-4o-mini' },
      { label: 'Max Context', value: '128000 tokens' },
    ],
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Alerts and notification channels',
    items: [
      { label: 'Execution Failures', value: 'enabled' },
      { label: 'Approval Requests', value: 'enabled' },
      { label: 'Security Alerts', value: 'enabled' },
      { label: 'Channel', value: 'in-app + email' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="fi-card">
      <PageHeader title="Settings" description="Platform configuration and system preferences" />
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="fi-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-forgeiq-50 border border-forgeiq-200 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-forgeiq-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                  <p className="text-xs text-slate-500">{s.description}</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {s.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-sm font-medium text-slate-800 font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
