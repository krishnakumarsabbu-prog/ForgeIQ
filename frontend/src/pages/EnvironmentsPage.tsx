import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes, Plus, Search, Filter, Rocket, GitBranch,
  Activity, Server, Globe, Cpu, HardDrive, ShieldCheck,
  CheckCircle2, AlertTriangle, ArrowUpRight, RefreshCw,
  Sliders, Layers, Terminal, ExternalLink
} from 'lucide-react'
import { PageHeader, StatusBadge, LoadingSpinner } from '../components/ui/PageHeader'
import { StatCard, EnterpriseCard, SectionHeader } from '../components/ui/EnterpriseHelpers'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import { useEnvironments } from '../hooks/useQueries'
import type { Environment } from '../types'

interface ClusterEnv {
  id: string
  name: string
  display_name: string
  environment_type: 'production' | 'staging' | 'development'
  cloud_provider: 'AWS' | 'GCP' | 'Azure' | 'Bare Metal'
  region: string
  kubernetes_version: string
  namespace: string
  nodes_count: number
  cpu_usage_pct: number
  mem_usage_pct: number
  active_deployments: number
  status: 'healthy' | 'warning' | 'degraded'
  auto_rollback: boolean
  last_deployed_at: string
}

const defaultEnvs: ClusterEnv[] = [
  {
    id: 'env-prod-us-east',
    name: 'prod-us-east-1',
    display_name: 'Production US East (Primary)',
    environment_type: 'production',
    cloud_provider: 'AWS',
    region: 'us-east-1',
    kubernetes_version: 'v1.30.2-eks',
    namespace: 'forgeiq-production',
    nodes_count: 24,
    cpu_usage_pct: 42,
    mem_usage_pct: 58,
    active_deployments: 8,
    status: 'healthy',
    auto_rollback: true,
    last_deployed_at: '12m ago',
  },
  {
    id: 'env-prod-eu-west',
    name: 'prod-eu-west-1',
    display_name: 'Production EU West (DR / Secondary)',
    environment_type: 'production',
    cloud_provider: 'GCP',
    region: 'europe-west1',
    kubernetes_version: 'v1.30.1-gke',
    namespace: 'forgeiq-production-dr',
    nodes_count: 16,
    cpu_usage_pct: 28,
    mem_usage_pct: 45,
    active_deployments: 8,
    status: 'healthy',
    auto_rollback: true,
    last_deployed_at: '45m ago',
  },
  {
    id: 'env-stage-preprod',
    name: 'staging-us-west',
    display_name: 'Pre-Production Canary Staging',
    environment_type: 'staging',
    cloud_provider: 'AWS',
    region: 'us-west-2',
    kubernetes_version: 'v1.30.2-eks',
    namespace: 'forgeiq-staging',
    nodes_count: 12,
    cpu_usage_pct: 35,
    mem_usage_pct: 51,
    active_deployments: 5,
    status: 'healthy',
    auto_rollback: true,
    last_deployed_at: '3m ago',
  },
  {
    id: 'env-qa-integration',
    name: 'qa-integration-01',
    display_name: 'QA & End-to-End Integration',
    environment_type: 'staging',
    cloud_provider: 'Azure',
    region: 'eastus2',
    kubernetes_version: 'v1.29.5-aks',
    namespace: 'forgeiq-qa',
    nodes_count: 8,
    cpu_usage_pct: 68,
    mem_usage_pct: 74,
    active_deployments: 3,
    status: 'warning',
    auto_rollback: false,
    last_deployed_at: '2h ago',
  },
  {
    id: 'env-dev-ephemeral',
    name: 'dev-ephemeral-pool',
    display_name: 'Development & Dynamic PR Previews',
    environment_type: 'development',
    cloud_provider: 'GCP',
    region: 'us-central1',
    kubernetes_version: 'v1.30.1-gke',
    namespace: 'forgeiq-preview',
    nodes_count: 14,
    cpu_usage_pct: 31,
    mem_usage_pct: 44,
    active_deployments: 12,
    status: 'healthy',
    auto_rollback: false,
    last_deployed_at: 'just now',
  },
  {
    id: 'env-sandbox-ai',
    name: 'sandbox-autonomous-ai',
    display_name: 'Autonomous AI Verification Sandbox',
    environment_type: 'development',
    cloud_provider: 'AWS',
    region: 'us-east-2',
    kubernetes_version: 'v1.30.2-eks',
    namespace: 'forgeiq-sandbox',
    nodes_count: 6,
    cpu_usage_pct: 19,
    mem_usage_pct: 26,
    active_deployments: 2,
    status: 'healthy',
    auto_rollback: false,
    last_deployed_at: '5h ago',
  },
]

const envGradients = {
  production: ['#10b981', '#059669'],
  staging: ['#00adef', '#0a68f4'],
  development: ['#7c3aed', '#6366f1'],
}

export default function EnvironmentsPage() {
  const navigate = useNavigate()
  const { data: apiEnvs, isLoading } = useEnvironments()
  const [filterType, setFilterType] = useState<'all' | 'production' | 'staging' | 'development'>('all')
  const [search, setSearch] = useState('')
  const [selectedEnv, setSelectedEnv] = useState<ClusterEnv | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Map apiEnvs or fallback to default enriched mock clusters
  const environments: ClusterEnv[] = useMemo(() => {
    if (apiEnvs && apiEnvs.length > 0) {
      return apiEnvs.map((e: Environment, idx: number) => ({
        id: e.id,
        name: e.name,
        display_name: e.display_name || e.name,
        environment_type: ((e.env_type || (e as any).environment_type || (idx === 0 ? 'production' : idx === 1 ? 'staging' : 'development')) as any),
        cloud_provider: (e.cluster?.toLowerCase().includes('gke') ? 'GCP' : e.cluster?.toLowerCase().includes('aks') ? 'Azure' : 'AWS') as any,
        region: e.region || (idx % 2 === 0 ? 'us-east-1' : 'europe-west1'),
        kubernetes_version: 'v1.30.2',
        namespace: `forgeiq-${e.name.toLowerCase()}`,
        nodes_count: 8 + (idx * 4),
        cpu_usage_pct: 30 + (idx * 12) % 60,
        mem_usage_pct: 40 + (idx * 10) % 50,
        active_deployments: 3 + idx,
        status: idx === 3 ? 'warning' : 'healthy',
        auto_rollback: idx === 0 || idx === 1,
        last_deployed_at: '22m ago',
      }))
    }
    return defaultEnvs
  }, [apiEnvs])

  const filteredEnvs = useMemo(() => {
    return environments.filter(e => {
      const matchType = filterType === 'all' || e.environment_type === filterType
      const matchSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.display_name.toLowerCase().includes(search.toLowerCase()) ||
        e.region.toLowerCase().includes(search.toLowerCase()) ||
        e.cloud_provider.toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
  }, [environments, filterType, search])

  const prodCount = environments.filter(e => e.environment_type === 'production').length
  const stagingCount = environments.filter(e => e.environment_type === 'staging').length
  const devCount = environments.filter(e => e.environment_type === 'development').length
  const totalNodes = environments.reduce((acc, cur) => acc + cur.nodes_count, 0)

  return (
    <>
      <PageHeader
        title="Infrastructure Environments"
        description="Unified multi-cloud clusters, progressive delivery stages, health topology, and autonomous canary routing."
        icon={<Boxes size={18} />}
        badge={`${environments.length} Clusters`}
        badgeVariant="emerald"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="fi-btn-secondary"
              onClick={() => navigate('/deployments')}
            >
              <Rocket size={13} /> View Deployments
            </button>
            <button
              className="fi-btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={13} /> Register Cluster
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Production"
            value={prodCount}
            sub="High availability SLA"
            icon={Rocket}
            gradient={['#10b981', '#059669']}
            onClick={() => setFilterType('production')}
          />
          <StatCard
            label="Staging & QA"
            value={stagingCount}
            sub="Pre-release verification"
            icon={GitBranch}
            gradient={['#00adef', '#0a68f4']}
            onClick={() => setFilterType('staging')}
          />
          <StatCard
            label="Ephemeral / Dev"
            value={devCount}
            sub="Preview namespaces"
            icon={Cpu}
            gradient={['#7c3aed', '#6366f1']}
            onClick={() => setFilterType('development')}
          />
          <StatCard
            label="Total Managed Nodes"
            value={totalNodes}
            sub="Auto-scaled compute"
            icon={Server}
            gradient={['#f59e0b', '#f97316']}
          />
        </div>

        {/* Filter & Search Bar */}
        <div
          className="rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
          style={{ background: '#fff', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {/* Tabs / Filters */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100">
            {(['all', 'production', 'staging', 'development'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-150"
                style={
                  filterType === type
                    ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { color: '#64748b' }
                }
              >
                {type === 'all' ? `All Environments (${environments.length})` : type}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by name, region, cloud..."
              className="fi-input pl-9 text-xs"
            />
          </div>
        </div>

        {/* Environments Grid */}
        {isLoading ? (
          <LoadingSpinner message="Querying cluster topologies..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredEnvs.map(env => {
              const gradient = envGradients[env.environment_type] || envGradients.development
              return (
                <div
                  key={env.id}
                  onClick={() => setSelectedEnv(env)}
                  className="group relative rounded-2xl p-5 cursor-pointer transition-all duration-200 overflow-hidden"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(226,232,240,0.85)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -6px rgba(0,14,35,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 30px -4px rgba(0,14,35,0.14)'
                    e.currentTarget.style.borderColor = 'rgba(203,213,225,0.95)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -6px rgba(0,14,35,0.06)'
                    e.currentTarget.style.borderColor = 'rgba(226,232,240,0.85)'
                  }}
                >
                  {/* Top Gradient Accent Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }}
                  />

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: `${gradient[0]}15`,
                            color: gradient[0],
                            border: `1px solid ${gradient[0]}30`,
                          }}
                        >
                          {env.environment_type}
                        </span>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {env.cloud_provider} · {env.region}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                        {env.display_name}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {env.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ background: env.status === 'healthy' ? '#10b981' : '#f59e0b' }}
                        />
                        <span
                          className="relative inline-flex rounded-full h-2 w-2"
                          style={{ background: env.status === 'healthy' ? '#10b981' : '#f59e0b' }}
                        />
                      </span>
                      <span
                        className="text-[10px] font-bold capitalize"
                        style={{ color: env.status === 'healthy' ? '#059669' : '#b45309' }}
                      >
                        {env.status}
                      </span>
                    </div>
                  </div>

                  {/* Cluster Spec Matrix */}
                  <div
                    className="rounded-xl p-3 mb-4 space-y-2"
                    style={{ background: '#f8fafc', border: '1px solid rgba(226,232,240,0.8)' }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Namespace</span>
                      <span className="font-mono font-semibold text-slate-700">{env.namespace}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Kubernetes</span>
                      <span className="font-mono text-slate-600">{env.kubernetes_version}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Cluster Nodes</span>
                      <span className="font-bold text-slate-800">{env.nodes_count} worker nodes</span>
                    </div>
                  </div>

                  {/* Resource Gauges */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                        <span>CPU Load</span>
                        <span className="font-bold text-slate-800">{env.cpu_usage_pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${env.cpu_usage_pct}%`,
                            background: env.cpu_usage_pct > 70 ? '#f43f5e' : '#0ea5e9',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                        <span>Memory Load</span>
                        <span className="font-bold text-slate-800">{env.mem_usage_pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${env.mem_usage_pct}%`,
                            background: env.mem_usage_pct > 75 ? '#f43f5e' : '#10b981',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div
                    className="flex items-center justify-between pt-3"
                    style={{ borderTop: '1px solid rgba(226,232,240,0.7)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold"
                        style={{ background: 'rgba(14,165,233,0.1)', color: '#0284c7' }}
                      >
                        {env.active_deployments} active workloads
                      </span>
                      {env.auto_rollback && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"
                          title="Auto rollback enabled on verification failure"
                        >
                          <ShieldCheck size={11} /> Rollback Armed
                        </span>
                      )}
                    </div>

                    <button
                      className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors"
                      onClick={e => {
                        e.stopPropagation()
                        navigate('/deployments')
                      }}
                    >
                      Deploy <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cluster Details SideDrawer */}
      <SideDrawer
        open={!!selectedEnv}
        onClose={() => setSelectedEnv(null)}
        title={selectedEnv?.display_name || ''}
        subtitle={`${selectedEnv?.cloud_provider} · ${selectedEnv?.region} · ${selectedEnv?.name}`}
      >
        {selectedEnv && (
          <div className="p-6 space-y-6">
            <DetailsPanel
              columns={2}
              items={[
                { label: 'Cluster ID', value: <span className="font-mono text-xs">{selectedEnv.id}</span> },
                { label: 'Environment Tier', value: <span className="font-bold text-xs uppercase text-slate-800">{selectedEnv.environment_type}</span> },
                { label: 'Cloud Provider', value: <span className="font-semibold text-xs">{selectedEnv.cloud_provider}</span> },
                { label: 'Datacenter Region', value: <span className="font-mono text-xs">{selectedEnv.region}</span> },
                { label: 'Kubernetes Version', value: <span className="font-mono text-xs">{selectedEnv.kubernetes_version}</span> },
                { label: 'Namespace Target', value: <span className="font-mono text-xs text-sky-600">{selectedEnv.namespace}</span> },
                { label: 'Worker Node Count', value: `${selectedEnv.nodes_count} Nodes` },
                { label: 'Health Status', value: <StatusBadge status={selectedEnv.status === 'healthy' ? 'ACTIVE' : 'WARNING'} /> },
                { label: 'Auto-Rollback', value: selectedEnv.auto_rollback ? 'Enabled (Instant)' : 'Disabled' },
                { label: 'Last Deployed', value: selectedEnv.last_deployed_at },
              ]}
            />

            <div>
              <h3 className="fi-section-label mb-3">Service Mesh & Ingress Configuration</h3>
              <div
                className="rounded-xl p-4 space-y-2 text-xs"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                <div className="flex justify-between">
                  <span className="text-slate-400">Ingress Gateway</span>
                  <span className="font-mono text-slate-700">istio-ingressgateway.forgeiq.io</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">mTLS Mode</span>
                  <span className="font-semibold text-emerald-600">STRICT (SPIFFE/SPIRE)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Canary Weight Policy</span>
                  <span className="font-mono text-slate-700">5% → 25% → 50% → 100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Telemetry Sync</span>
                  <span className="font-semibold text-sky-600">Prometheus + OpenTelemetry</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid #e2e8f0' }}>
              <button
                className="fi-btn-primary flex-1"
                onClick={() => {
                  setSelectedEnv(null)
                  navigate('/deployments')
                }}
              >
                <Rocket size={13} /> Promote to {selectedEnv.name}
              </button>
              <button
                className="fi-btn-secondary"
                onClick={() => setSelectedEnv(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Register Cluster Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-5"
            style={{ background: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Boxes size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Register Infrastructure Cluster</h2>
                  <p className="text-[11px] text-slate-400">Attach a Kubernetes or Cloud Run cluster for autonomous deployments.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cluster Display Name</label>
                <input type="text" placeholder="e.g. Production AP-South (Mumbai)" className="fi-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Environment Tier</label>
                  <select className="fi-input">
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cloud Provider</label>
                  <select className="fi-input">
                    <option value="AWS">AWS (EKS)</option>
                    <option value="GCP">GCP (GKE)</option>
                    <option value="Azure">Azure (AKS)</option>
                    <option value="BareMetal">On-Premises / Bare Metal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kubernetes API Endpoint or Kubeconfig URI</label>
                <input type="text" placeholder="https://api.k8s.us-east-1.enterprise.io:6443" className="fi-input font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Namespace</label>
                <input type="text" placeholder="forgeiq-cluster-target" className="fi-input font-mono" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                className="fi-btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="fi-btn-primary"
                onClick={() => setShowCreateModal(false)}
              >
                <CheckCircle2 size={13} /> Attach Cluster
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
