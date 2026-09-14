import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader'
import { EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { useNavigate } from 'react-router-dom'
import { Settings, Key, Globe, Bell, Shield, Palette, Database, ChevronRight, CheckCircle2 } from 'lucide-react'

const settingsSections = [
  {
    icon: Globe,
    title: 'General Settings',
    subtitle: 'Platform name, timezone, and locale',
    color: '#0284c7',
    items: ['Platform Name', 'Default Timezone', 'Date Format', 'Language'],
  },
  {
    icon: Key,
    title: 'API & Integrations',
    subtitle: 'API keys, webhooks, and external connectors',
    color: '#7c3aed',
    items: ['API Keys', 'Webhook Endpoints', 'Git Providers', 'Cloud Providers'],
  },
  {
    icon: Shield,
    title: 'Security & SSO',
    subtitle: 'Authentication, SSO, and MFA configuration',
    color: '#e11d48',
    items: ['SSO Configuration', 'MFA Settings', 'IP Allowlisting', 'Session Timeout'],
  },
  {
    icon: Bell,
    title: 'Notifications',
    subtitle: 'Alert channels, escalation policies',
    color: '#f59e0b',
    items: ['Email Alerts', 'Slack Integration', 'PagerDuty', 'Escalation Policies'],
  },
  {
    icon: Database,
    title: 'Data & Retention',
    subtitle: 'Log retention, data export, and archival',
    color: '#059669',
    items: ['Log Retention (days)', 'Audit Log Export', 'Backup Schedule', 'Data Residency'],
  },
  {
    icon: Palette,
    title: 'Appearance',
    subtitle: 'Theme, branding, and white-label settings',
    color: '#4338ca',
    items: ['Theme Mode', 'Custom Logo', 'Brand Colors', 'Portal Domain'],
  },
]

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Platform Settings"
        description="Configure global platform settings, integrations, security policies, and enterprise customizations."
        icon={<Settings size={18} />}
        badge="Administration"
        badgeVariant="violet"
      />

      <div className="p-6 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {settingsSections.map(section => (
            <EnterpriseCard key={section.title} hoverable onClick={() => {}}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${section.color}15`, border: `1px solid ${section.color}30` }}
                  >
                    <section.icon size={18} style={{ color: section.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{section.title}</h3>
                    <p className="text-[11px] text-slate-400">{section.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {section.items.map(item => (
                    <div
                      key={item}
                      className="flex items-center justify-between py-2 px-3 rounded-xl transition-all cursor-pointer"
                      style={{ border: '1px solid transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,250,252,0.8)'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.7)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <span className="text-xs font-medium text-slate-700">{item}</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <ChevronRight size={12} className="text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </EnterpriseCard>
          ))}
        </div>
      </div>
    </>
  )
}
