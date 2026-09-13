import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Plus, Activity, Search, Shield, Server,
  CheckCircle2, XCircle, Clock, Loader2,
} from 'lucide-react'
import {
  useIncidents, useApplications, useEnvironments,
  useCreateIncident, useIncidentSeverities, useIncidentSources,
} from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import type { Incident } from '../types'

function severityColor(sev: string): string {
  switch (sev) {
    case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200'
    case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'LOW': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    default: return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function statusVariant(status: string): string {
  const resolved = ['resolved', 'closed']
  const failed = ['failed', 'escalated']
  const active = ['investigating', 'remediation_in_progress', 'deploying_fix', 'verifying', 'rolling_back']
  const approval = ['awaiting_approval']
  const planned = ['root_cause_identified', 'remediation_planned']
  const rolledBack = ['rolled_back']
  if (resolved.includes(status)) return 'success'
  if (failed.includes(status)) return 'error'
  if (active.includes(status)) return 'running'
  if (approval.includes(status)) return 'approval'
  if (rolledBack.includes(status)) return 'warning'
  if (planned.includes(status)) return 'info'
  return 'neutral'
}

function formatTime(ts?: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(ts: string): string {
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function IncidentsPage() {
  const navigate = useNavigate()
  const { data: incidents, isLoading } = useIncidents()
  const { data: applications } = useApplications()
  const { data: environments } = useEnvironments()
  const { data: severities } = useIncidentSeverities()
  const { data: sources } = useIncidentSources()
  const createIncident = useCreateIncident()

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    source: 'observability',
    application_id: '',
    environment_id: '',
    component: '',
    assigned_to: '',
  })

  const items = (incidents ?? []) as Incident[]
  const appMap = new Map((applications ?? []).map(a => [a.id, a.display_name] as [string, string]))
  const envMap = new Map((environments ?? []).map(e => [e.id, e.display_name] as [string, string]))

  const filtered = items.filter(inc => {
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false
    if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !inc.component.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: items.length,
    critical: items.filter(i => i.severity === 'CRITICAL').length,
    active: items.filter(i => !['resolved', 'closed', 'rolled_back'].includes(i.status)).length,
    resolved: items.filter(i => ['resolved', 'closed'].includes(i.status)).length,
  }

  function handleCreate() {
    if (!createForm.title || !createForm.application_id) return
    createIncident.mutate({
      title: createForm.title,
      description: createForm.description,
      severity: createForm.severity,
      source: createForm.source,
      application_id: createForm.application_id,
      environment_id: createForm.environment_id,
      component: createForm.component,
      assigned_to: createForm.assigned_to,
    }, {
      onSuccess: () => {
        setShowCreate(false)
        setCreateForm({ title: '', description: '', severity: 'HIGH', source: 'observability', application_id: '', environment_id: '', component: '', assigned_to: '' })
      },
    })
  }

  if (isLoading) {
    return (
      <div className="fi-card">
        <PageHeader title="Operations & Incidents" description="Incident detection, root cause analysis, and remediation lifecycle" />
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="fi-card">
      <PageHeader
        title="Operations & Incidents"
        description="Incident detection, root cause analysis, and remediation lifecycle"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{items.length} incidents</span>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forgeiq-600 rounded hover:bg-forgeiq-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Report Incident
            </button>
          </div>
        }
      />

      <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md flex-1 max-w-xs">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        >
          <option value="all">All Statuses</option>
          <option value="detected">Detected</option>
          <option value="investigating">Investigating</option>
          <option value="root_cause_identified">Root Cause Found</option>
          <option value="remediation_planned">Remediation Planned</option>
          <option value="awaiting_approval">Awaiting Approval</option>
          <option value="remediation_in_progress">Remediation In Progress</option>
          <option value="deploying_fix">Deploying Fix</option>
          <option value="verifying">Verifying</option>
          <option value="resolved">Resolved</option>
          <option value="rolled_back">Rolled Back</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-forgeiq-500"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="px-6 py-3 grid grid-cols-4 gap-3 border-b border-slate-200 bg-slate-50">
        <div className="fi-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Activity className="h-3.5 w-3.5" /> Total Incidents</div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="fi-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Critical</div>
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
        </div>
        <div className="fi-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Loader2 className="h-3.5 w-3.5 text-blue-500" /> Active</div>
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
        </div>
        <div className="fi-card p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Resolved</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.resolved}</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No incidents match the current filters" icon={<Shield className="h-12 w-12" />} />
      ) : (
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Application</th>
                <th>Component</th>
                <th>Status</th>
                <th>Source</th>
                <th>Symptoms</th>
                <th>Root Cause</th>
                <th>Detected</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td>
                    <span className={`fi-badge ${severityColor(inc.severity)}`}>{inc.severity}</span>
                  </td>
                  <td className="text-sm text-slate-800 font-medium max-w-xs truncate">{inc.title}</td>
                  <td className="text-sm text-slate-600">{appMap.get(inc.application_id) ?? '—'}</td>
                  <td className="text-xs text-slate-600 font-mono">{inc.component || '—'}</td>
                  <td><StatusBadge status={inc.status} /></td>
                  <td className="text-xs text-slate-500 capitalize">{inc.source.replace(/_/g, ' ')}</td>
                  <td className="text-center">
                    {inc.symptoms.length > 0 ? (
                      <span className="fi-badge bg-blue-50 text-blue-700 border border-blue-200">{inc.symptoms.length}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    {inc.root_cause ? (
                      <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">{inc.root_cause.category.replace(/_/g, ' ')}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="text-xs text-slate-500 whitespace-nowrap">{timeAgo(inc.detected_at)}</td>
                  <td className="text-xs text-slate-600">{inc.assigned_to || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SideDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Report Incident"
        subtitle="Create a new production incident for investigation"
        width="480px"
        footer={
          <button
            onClick={handleCreate}
            disabled={createIncident.isPending || !createForm.title || !createForm.application_id}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forgeiq-600 rounded hover:bg-forgeiq-700 disabled:opacity-50"
          >
            {createIncident.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            Create Incident
          </button>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={createForm.title}
              onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="Brief incident title..."
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Description</label>
            <textarea
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Detailed description of the incident..."
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Severity</label>
              <select
                value={createForm.severity}
                onChange={e => setCreateForm({ ...createForm, severity: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
              >
                {(severities ?? []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Source</label>
              <select
                value={createForm.source}
                onChange={e => setCreateForm({ ...createForm, source: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
              >
                {(sources ?? []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Application</label>
            <select
              value={createForm.application_id}
              onChange={e => setCreateForm({ ...createForm, application_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            >
              <option value="">Select application...</option>
              {(applications ?? []).map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Environment</label>
            <select
              value={createForm.environment_id}
              onChange={e => setCreateForm({ ...createForm, environment_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
            >
              <option value="">Select environment...</option>
              {(environments ?? []).map(e => <option key={e.id} value={e.id}>{e.display_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Component</label>
              <input
                type="text"
                value={createForm.component}
                onChange={e => setCreateForm({ ...createForm, component: e.target.value })}
                placeholder="e.g. payment-service"
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Assigned To</label>
              <input
                type="text"
                value={createForm.assigned_to}
                onChange={e => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                placeholder="e.g. On-call engineer"
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-forgeiq-500"
              />
            </div>
          </div>
          {createIncident.isError && (
            <div className="fi-card p-3 border-red-200 bg-red-50">
              <span className="text-sm text-red-700">Failed to create incident. Check inputs and try again.</span>
            </div>
          )}
        </div>
      </SideDrawer>
    </div>
  )
}
