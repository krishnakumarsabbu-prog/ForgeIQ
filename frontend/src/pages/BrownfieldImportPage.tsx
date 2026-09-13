import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCreateBrownfieldImport, useBrownfieldImport,
  useBrownfieldImportSemanticModel, useBrownfieldImportDocumentation, useBrownfieldImportRecommendations,
} from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import {
  GitBranch, FolderGit2, Search, FileText, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ArrowRight, Layers, Cpu, Shield, Activity, BookOpen, Network,
  Package, Server, Database, Code2, FlaskConical, Lock, Boxes, Zap,
} from 'lucide-react'
import type { BrownfieldImport, BrownfieldPhase } from '../types'

const PHASE_ICONS: Record<string, typeof GitBranch> = {
  repository_discovery: GitBranch,
  technology_detection: Cpu,
  architecture_analysis: Layers,
  dependency_analysis: Package,
  api_analysis: Network,
  code_analysis: Code2,
  test_analysis: FlaskConical,
  security_analysis: Shield,
  documentation_generation: BookOpen,
  semantic_model_build: Boxes,
  engineering_state_build: Activity,
}

const EXAMPLE_REPOS = [
  'https://github.com/forgeiq/ecommerce-platform',
  'https://github.com/forgeiq/payment-gateway',
  'https://github.com/forgeiq/analytics-dashboard',
]

export default function BrownfieldImportPage() {
  const navigate = useNavigate()
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [provider, setProvider] = useState('github')
  const [appName, setAppName] = useState('')
  const [importId, setImportId] = useState<string | null>(null)

  const createImport = useCreateBrownfieldImport()
  const { data: importData, isLoading } = useBrownfieldImport(importId ?? '')

  const handleImport = () => {
    if (!repoUrl.trim()) return
    createImport.mutate(
      {
        repository_url: repoUrl.trim(),
        branch,
        provider,
        application_name: appName.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setImportId(data.id)
        },
      },
    )
  }

  const handleReset = () => {
    setImportId(null)
    setRepoUrl('')
    setAppName('')
    setBranch('main')
  }

  if (importId && importData) {
    return <ImportProgressView importData={importData} onReset={handleReset} onNavigate={navigate} isLoading={isLoading} />
  }

  return (
    <>
      <PageHeader
        title="Import Existing Application"
        description="Import and analyze an existing Git repository to build a semantic model and engineering state"
        breadcrumbs={[
          { label: 'Applications', to: '/applications' },
          { label: 'Import Application' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="fi-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-forgeiq-50 rounded-lg">
              <FolderGit2 className="h-5 w-5 text-forgeiq-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Repository Configuration</h2>
              <p className="text-xs text-slate-500">Provide the Git repository details to begin the discovery pipeline.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Repository URL</label>
              <div className="mt-1 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/your-org/your-repo"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forgeiq-500/20 focus:border-forgeiq-400 font-mono text-slate-900 placeholder:text-slate-400"
                  disabled={createImport.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Branch</label>
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forgeiq-500/20 focus:border-forgeiq-400 text-slate-900"
                  disabled={createImport.isPending}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forgeiq-500/20 text-slate-900"
                  disabled={createImport.isPending}
                >
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                  <option value="bitbucket">Bitbucket</option>
                  <option value="azure">Azure DevOps</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Application Name (optional)</label>
              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Auto-detected from repository"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forgeiq-500/20 focus:border-forgeiq-400 text-slate-900 placeholder:text-slate-400"
                disabled={createImport.isPending}
              />
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2">Quick examples:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_REPOS.map((repo) => (
                  <button
                    key={repo}
                    onClick={() => setRepoUrl(repo)}
                    className="px-3 py-1.5 text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-md hover:bg-white hover:border-forgeiq-300 transition-colors font-mono text-left max-w-[280px] truncate"
                  >
                    {repo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleImport}
              disabled={!repoUrl.trim() || createImport.isPending}
              className="fi-button-primary"
            >
              {createImport.isPending ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Starting Import...</>
              ) : (
                <><Search className="h-4 w-4" /> Start Discovery</>
              )}
            </button>
          </div>
        </div>

        <div className="fi-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Discovery Pipeline</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">The discovery pipeline runs 11 phases to build a complete semantic model and persistent engineering state.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { label: 'Repository Discovery', desc: 'Clone and analyze repo structure' },
              { label: 'Technology Detection', desc: 'Identify languages and frameworks' },
              { label: 'Architecture Analysis', desc: 'Map architecture and components' },
              { label: 'Dependency Analysis', desc: 'Catalog external dependencies' },
              { label: 'API Analysis', desc: 'Discover REST/GraphQL endpoints' },
              { label: 'Code Analysis', desc: 'Analyze modules, classes, functions' },
              { label: 'Test Analysis', desc: 'Identify tests and coverage gaps' },
              { label: 'Security Analysis', desc: 'SAST, dependency, secret scanning' },
              { label: 'Documentation Generation', desc: 'Generate wikis and guides' },
              { label: 'Semantic Model Build', desc: 'Construct semantic entity graph' },
              { label: 'Engineering State Build', desc: 'Create persistent eng. state' },
            ].map((phase, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-forgeiq-100 text-forgeiq-700 text-[10px] font-semibold shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{phase.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{phase.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function ImportProgressView({
  importData,
  onReset,
  onNavigate,
  isLoading,
}: {
  importData: BrownfieldImport
  onReset: () => void
  onNavigate: (path: string) => void
  isLoading: boolean
}) {
  const [activeTab, setActiveTab] = useState('progress')
  const isRunning = importData.status === 'running' || importData.status === 'pending'
  const isCompleted = importData.status === 'completed'
  const isFailed = importData.status === 'failed'

  const { data: semanticModel } = useBrownfieldImportSemanticModel(importData.id)
  const { data: documentation } = useBrownfieldImportDocumentation(importData.id)
  const { data: recommendations } = useBrownfieldImportRecommendations(importData.id)

  const tabs = [
    { key: 'progress', label: 'Discovery Progress' },
    { key: 'overview', label: 'Application Overview', disabled: isRunning },
    { key: 'architecture', label: 'Architecture', disabled: isRunning },
    { key: 'semantic', label: 'Semantic Model', disabled: isRunning },
    { key: 'engineering-state', label: 'Engineering State', disabled: isRunning },
    { key: 'documentation', label: 'Documentation', disabled: isRunning },
    { key: 'recommendations', label: 'Recommendations', disabled: isRunning },
  ].filter(t => !t.disabled || t.key === activeTab)

  return (
    <>
      <PageHeader
        title="Brownfield Import"
        description={importData.config.repository_url}
        breadcrumbs={[
          { label: 'Applications', to: '/applications' },
          { label: 'Import' },
        ]}
        actions={
          <button onClick={onReset} className="fi-button-secondary">
            New Import
          </button>
        }
      />

      <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-200 bg-white">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-forgeiq-600 text-forgeiq-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {activeTab === 'progress' && (
          <ProgressTab importData={importData} onNavigate={onNavigate} />
        )}
        {activeTab === 'overview' && isCompleted && <OverviewTab importData={importData} onNavigate={onNavigate} />}
        {activeTab === 'architecture' && isCompleted && <ArchitectureTab importData={importData} />}
        {activeTab === 'semantic' && isCompleted && <SemanticModelTab semanticModel={semanticModel} />}
        {activeTab === 'engineering-state' && isCompleted && <EngineeringStateTab importData={importData} onNavigate={onNavigate} />}
        {activeTab === 'documentation' && isCompleted && <DocumentationTab documentation={documentation} />}
        {activeTab === 'recommendations' && isCompleted && <RecommendationsTab recommendations={recommendations} onNavigate={onNavigate} />}
      </div>
    </>
  )
}

function ProgressTab({ importData, onNavigate }: { importData: BrownfieldImport; onNavigate: (path: string) => void }) {
  const isCompleted = importData.status === 'completed'
  const isFailed = importData.status === 'failed'

  return (
    <div className="space-y-4">
      <div className="fi-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
            {importData.status === 'running' && <Loader2 className="h-5 w-5 text-forgeiq-600 animate-spin" />}
            {importData.status === 'pending' && <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />}
            <h2 className="text-sm font-semibold text-slate-900">
              {isCompleted ? 'Discovery Completed' : isFailed ? 'Discovery Failed' : 'Discovery Running'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{importData.progress.toFixed(0)}%</span>
            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFailed ? 'bg-red-500' : 'bg-forgeiq-600'}`}
                style={{ width: `${importData.progress}%` }}
              />
            </div>
          </div>
        </div>

        {isFailed && importData.error_message && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 mb-3">
            {importData.error_message}
          </div>
        )}

        {isCompleted && importData.application_id && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-sm text-emerald-700">Application imported successfully. Semantic model and engineering state created.</span>
          </div>
        )}
      </div>

      <div className="fi-card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Discovery Phases</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {importData.phases.map((phase, idx) => (
            <PhaseRow key={phase.name} phase={phase} index={idx} />
          ))}
        </div>
      </div>

      {isCompleted && importData.application_id && (
        <div className="fi-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-900">Import Complete</span>
              <span className="text-xs text-slate-500">Application, semantic model, and engineering state are ready.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate(`/applications/${importData.application_id}`)}
                className="fi-button-secondary"
              >
                View Application
              </button>
              <button
                onClick={() => onNavigate(`/peer-engineering`)}
                className="fi-button-primary"
              >
                Start Peer Engineering <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PhaseRow({ phase, index }: { phase: BrownfieldPhase; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = PHASE_ICONS[phase.name] || FileText
  const hasDetails = phase.findings.length > 0 || phase.warnings.length > 0 || phase.errors.length > 0 || phase.artifacts.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-3 ${hasDetails ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold shrink-0">
          {index + 1}
        </span>
        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{phase.label}</span>
            {phase.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            {phase.status === 'running' && <Loader2 className="h-3.5 w-3.5 text-forgeiq-600 animate-spin" />}
            {phase.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
            {phase.status === 'pending' && <div className="h-3.5 w-3.5 rounded-full border border-slate-200" />}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{phase.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {phase.warnings.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {phase.warnings.length}
            </span>
          )}
          {phase.errors.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <XCircle className="h-3 w-3" />
              {phase.errors.length}
            </span>
          )}
          {phase.artifacts.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FileText className="h-3 w-3" />
              {phase.artifacts.length}
            </span>
          )}
          {phase.summary && <span className="text-xs text-slate-500 hidden lg:block max-w-[300px] truncate">{phase.summary}</span>}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="px-4 pb-3 pl-12 space-y-3">
          {phase.summary && (
            <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-200">{phase.summary}</p>
          )}

          {phase.findings.length > 0 && (
            <div className="space-y-2">
              {phase.findings.map((finding, i) => (
                <FindingDetail key={i} finding={finding} phaseName={phase.name} />
              ))}
            </div>
          )}

          {phase.warnings.length > 0 && (
            <div className="space-y-1">
              {phase.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {phase.errors.length > 0 && (
            <div className="space-y-1">
              {phase.errors.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-red-700">
                  <XCircle className="h-3 w-3 shrink-0" />
                  {e}
                </div>
              ))}
            </div>
          )}

          {phase.artifacts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {phase.artifacts.map((a, i) => (
                <span key={i} className="fi-badge bg-slate-50 text-slate-500 border border-slate-200 text-xs font-mono">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FindingDetail({ finding, phaseName }: { finding: Record<string, unknown>; phaseName: string }) {
  const entries = Object.entries(finding)

  return (
    <div className="bg-slate-50 rounded-md border border-slate-200 p-3 space-y-1.5">
      {entries.map(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length === 0) return null
          if (typeof value[0] === 'object' && value[0] !== null) {
            return (
              <div key={key}>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{key.replace(/_/g, ' ')}</p>
                <div className="space-y-1">
                  {(value as Record<string, unknown>[]).slice(0, 5).map((item, i) => (
                    <div key={i} className="text-xs text-slate-700 bg-white px-2 py-1.5 rounded border border-slate-100">
                      {Object.entries(item).slice(0, 4).map(([k, v]) => (
                        <span key={k} className="mr-3">
                          <span className="text-slate-400">{k}:</span> <span className="font-medium">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  ))}
                  {value.length > 5 && <p className="text-xs text-slate-400">...and {value.length - 5} more</p>}
                </div>
              </div>
            )
          }
          return (
            <div key={key} className="flex items-start gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wide shrink-0">{key.replace(/_/g, ' ')}:</span>
              <div className="flex flex-wrap gap-1">
                {(value as unknown[]).slice(0, 10).map((v, i) => (
                  <span key={i} className="fi-badge bg-white text-slate-600 border border-slate-200 text-xs">
                    {String(v)}
                  </span>
                ))}
                {value.length > 10 && <span className="text-xs text-slate-400">+{value.length - 10}</span>}
              </div>
            </div>
          )
        }
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key} className="flex items-start gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wide shrink-0">{key.replace(/_/g, ' ')}:</span>
              <span className="text-xs text-slate-700">{JSON.stringify(value)}</span>
            </div>
          )
        }
        return (
          <div key={key} className="flex items-start gap-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-wide shrink-0">{key.replace(/_/g, ' ')}:</span>
            <span className="text-xs text-slate-700 font-medium">{String(value)}</span>
          </div>
        )
      })}
    </div>
  )
}

function OverviewTab({ importData, onNavigate }: { importData: BrownfieldImport; onNavigate: (path: string) => void }) {
  const repoFinding = importData.phases[0]?.findings[0] as Record<string, unknown> | undefined
  const techFinding = importData.phases[1]?.findings[0] as Record<string, unknown> | undefined
  const archFinding = importData.phases[2]?.findings[0] as Record<string, unknown> | undefined
  const codeFinding = importData.phases[5]?.findings[0] as Record<string, unknown> | undefined
  const testFinding = importData.phases[6]?.findings[0] as Record<string, unknown> | undefined
  const secFinding = importData.phases[7]?.findings[0] as Record<string, unknown> | undefined

  return (
    <div className="space-y-4">
      <div className="fi-card p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-forgeiq-50 rounded-lg">
            <FolderGit2 className="h-6 w-6 text-forgeiq-600" />
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Repository</p>
              <p className="text-sm font-mono text-slate-900 truncate">{repoFinding?.repository_name as string || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Type</p>
              <p className="text-sm font-medium text-slate-900">Brownfield</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Version</p>
              <p className="text-sm font-medium text-slate-900">1.4.2</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Health Score</p>
              <p className="text-sm font-medium text-slate-900">78%</p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Technologies</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(techFinding?.languages as Record<string, unknown>[] | undefined)?.map((lang) => (
                  <span key={lang.name as string} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">
                    {lang.name as string} ({lang.percentage as number}%)
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Code Structure</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Files</span><span className="font-medium text-slate-900">{codeFinding?.total_files as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Classes</span><span className="font-medium text-slate-900">{codeFinding?.total_classes as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Functions</span><span className="font-medium text-slate-900">{codeFinding?.total_functions as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Lines of Code</span><span className="font-medium text-slate-900">{(codeFinding?.total_loc as number ?? 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Modules</span><span className="font-medium text-slate-900">{(codeFinding?.modules as string[] | undefined)?.length ?? 0}</span></div>
          </div>
        </div>

        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Test Coverage</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Tests</span><span className="font-medium text-slate-900">{testFinding?.total_tests as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Passed</span><span className="font-medium text-emerald-600">{testFinding?.passed as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Failed</span><span className="font-medium text-red-600">{testFinding?.failed as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Coverage</span><span className="font-medium text-slate-900">{testFinding?.coverage_pct as number ?? 0}%</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Frameworks</span><span className="font-medium text-slate-900">{(testFinding?.frameworks as string[] | undefined)?.join(', ') || 'N/A'}</span></div>
          </div>
        </div>

        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Security</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-slate-500">SAST Findings</span><span className="font-medium text-amber-600">{secFinding?.sast_findings as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Dep. Vulnerabilities</span><span className="font-medium text-red-600">{secFinding?.dependency_vulnerabilities as number ?? 'N/A'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Secret Detections</span><span className="font-medium text-emerald-600">{secFinding?.secret_detections as number ?? 0}</span></div>
          </div>
        </div>
      </div>

      {importData.application_id && (
        <div className="fi-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-slate-600">Application registered in ForgeIQ with persistent engineering state.</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate(`/applications/${importData.application_id}`)} className="fi-button-secondary">
                View Application
              </button>
              <button onClick={() => onNavigate(`/peer-engineering`)} className="fi-button-primary">
                Start Peer Engineering <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ArchitectureTab({ importData }: { importData: BrownfieldImport }) {
  const archFinding = importData.phases[2]?.findings[0] as Record<string, unknown> | undefined
  const apiFinding = importData.phases[4]?.findings[0] as Record<string, unknown> | undefined
  const depFinding = importData.phases[3]?.findings[0] as Record<string, unknown> | undefined

  return (
    <div className="space-y-4">
      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">Architecture Pattern</h3>
        </div>
        <p className="text-sm text-slate-700">{archFinding?.pattern as string || 'Not analyzed'}</p>
        {archFinding?.layers != null && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(archFinding.layers as string[]).map((layer) => (
              <span key={layer} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">{layer}</span>
            ))}
          </div>
        )}
      </div>

      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Components</h3>
        {archFinding?.components != null && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(archFinding.components as string[]).map((comp) => (
              <div key={comp} className="px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-sm text-slate-700 text-center">{comp}</div>
            ))}
          </div>
        )}
      </div>

      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Network className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">APIs ({(apiFinding?.endpoints as Record<string, unknown>[] | undefined)?.length ?? 0})</h3>
        </div>
        {apiFinding?.endpoints != null && (
          <div className="space-y-1">
            {(apiFinding.endpoints as Record<string, unknown>[]).map((api, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                <span className={`fi-badge text-xs ${api.method === 'GET' ? 'bg-blue-50 text-blue-700 border border-blue-200' : api.method === 'POST' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : api.method === 'DELETE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {api.method as string}
                </span>
                <span className="text-sm font-mono text-slate-700">{api.path as string}</span>
                <span className="text-xs text-slate-400">{api.controller as string}</span>
                {api.authenticated as boolean && <Lock className="h-3 w-3 text-amber-500" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">Dependencies ({depFinding?.total as number ?? 0})</h3>
        </div>
        {depFinding?.dependencies != null && (
          <div className="space-y-1">
            {(depFinding.dependencies as Record<string, unknown>[]).map((dep, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-sm font-medium text-slate-700">{dep.name as string}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{dep.version as string} ({dep.type as string})</span>
                  {dep.vulnerable as boolean && <span className="fi-badge bg-red-50 text-red-700 border border-red-200 text-xs">Vulnerable</span>}
                  {dep.outdated as boolean && !dep.vulnerable && <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">Outdated</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Services</h3>
          </div>
          {archFinding?.services != null && (
            <div className="space-y-1">
              {(archFinding.services as Record<string, unknown>[]).map((svc, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                  <span className="text-sm font-medium text-slate-700">{svc.name as string}</span>
                  <span className="text-xs text-slate-500">{svc.type as string} / {svc.language as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fi-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-forgeiq-600" />
            <h3 className="text-sm font-semibold text-slate-900">Databases</h3>
          </div>
          {archFinding?.databases != null && (
            <div className="space-y-1">
              {(archFinding.databases as Record<string, unknown>[]).map((db, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                  <span className="text-sm font-medium text-slate-700">{db.name as string}</span>
                  <span className="text-xs text-slate-500">{db.type as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SemanticModelTab({ semanticModel }: { semanticModel: { entities: Record<string, unknown>[]; relationships: Record<string, unknown>[]; summary: Record<string, unknown> } | undefined }) {
  if (!semanticModel) return <EmptyState message="Semantic model not available" icon={<Boxes className="h-12 w-12" />} />

  const entityTypes = (semanticModel.summary.entity_types as string[]) || []
  const entities = semanticModel.entities || []
  const relationships = semanticModel.relationships || []

  const typeCounts = entityTypes.map(type => ({
    type,
    label: type.replace(/_/g, ' '),
    count: entities.filter(e => String(e.entity_type).toLowerCase().includes(type.toLowerCase())).length,
    icon: PHASE_ICONS[type] || FileText,
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Entities</p>
          <p className="text-lg font-semibold text-slate-900">{entities.length}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Relationships</p>
          <p className="text-lg font-semibold text-slate-900">{relationships.length}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Entity Types</p>
          <p className="text-lg font-semibold text-slate-900">{entityTypes.length}</p>
        </div>
        <div className="fi-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Model Status</p>
          <p className="text-sm font-medium text-emerald-600">Built</p>
        </div>
      </div>

      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Entities by Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {typeCounts.map(({ type, label, count, icon: Icon }) => (
            <div key={type} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
              <Icon className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 capitalize truncate">{label}</p>
                <p className="text-[10px] text-slate-500">{count} entities</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fi-card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Semantic Entities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="fi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Qualified Name</th>
                <th>File Path</th>
              </tr>
            </thead>
            <tbody>
              {entities.slice(0, 50).map((e, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-900">{e.name as string}</td>
                  <td>
                    <span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 text-xs">
                      {String(e.entity_type).replace('SemanticEntityType.', '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-600 truncate max-w-[300px]">{e.qualified_name as string}</td>
                  <td className="text-xs text-slate-500">{(e.file_path as string) || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entities.length > 50 && (
          <div className="px-4 py-2 border-t border-slate-200 text-xs text-slate-400 text-center">
            Showing 50 of {entities.length} entities
          </div>
        )}
      </div>
    </div>
  )
}

function EngineeringStateTab({ importData, onNavigate }: { importData: BrownfieldImport; onNavigate: (path: string) => void }) {
  const esFinding = importData.phases[10]?.findings[0] as Record<string, unknown> | undefined

  return (
    <div className="space-y-4">
      <div className="fi-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Health Score</p>
          <p className="text-lg font-semibold text-slate-900">{((esFinding?.health_score as number) * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Coverage</p>
          <p className="text-lg font-semibold text-slate-900">{esFinding?.coverage_pct as number ?? 0}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Security Findings</p>
          <p className="text-lg font-semibold text-slate-900">{esFinding?.security_findings as number ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Open Vulnerabilities</p>
          <p className="text-lg font-semibold text-slate-900">{esFinding?.open_vulnerabilities as number ?? 0}</p>
        </div>
      </div>

      {importData.engineering_state_id && (
        <div className="fi-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-slate-600">Engineering state is persistent and continuously updated as new evidence is generated.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate(`/engineering-state`)}
                className="fi-button-secondary"
              >
                View Engineering State
              </button>
              <button
                onClick={() => onNavigate('/peer-engineering')}
                className="fi-button-primary"
              >
                Start Peer Engineering <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentationTab({ documentation }: { documentation: Record<string, unknown> | undefined }) {
  if (!documentation || Object.keys(documentation).length === 0) {
    return <EmptyState message="No documentation generated yet" icon={<BookOpen className="h-12 w-12" />} />
  }

  const docs = Object.values(documentation) as Record<string, unknown>[]

  return (
    <div className="space-y-4">
      <div className="fi-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-forgeiq-600" />
          <h3 className="text-sm font-semibold text-slate-900">Generated Documentation ({docs.length})</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {docs.map((doc) => (
            <div key={doc.title as string} className="px-3 py-2.5 bg-slate-50 rounded-md border border-slate-200 hover:bg-white hover:border-forgeiq-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm text-slate-700">{doc.title as string}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(doc.sections as string[]).map((section) => (
                  <span key={section} className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                    {section}
                  </span>
                ))}
              </div>
              <div className="mt-1.5">
                <span className={`fi-badge text-[10px] ${doc.type === 'wiki' ? 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200' : doc.type === 'guide' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {doc.type as string}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RecommendationsTab({ recommendations, onNavigate }: { recommendations: { harnesses: Array<{ id: string; name: string; type: string; environment: string; reason: string }>; pipelines: Array<{ id: string; name: string; reason: string; stages: string[] }> } | undefined; onNavigate: (path: string) => void }) {
  if (!recommendations) return <EmptyState message="No recommendations available" icon={<Zap className="h-12 w-12" />} />

  return (
    <div className="space-y-4">
      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Recommended Harnesses</h3>
        <div className="space-y-2">
          {recommendations.harnesses.map((h) => (
            <div key={h.id} className="flex items-start gap-3 px-3 py-2.5 bg-slate-50 rounded-md border border-slate-200">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{h.name}</span>
                  <span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200 text-xs">{h.type}</span>
                  <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 text-xs">{h.environment}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{h.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Recommended Pipelines</h3>
        <div className="space-y-2">
          {recommendations.pipelines.map((p) => (
            <div key={p.id} className="px-3 py-2.5 bg-slate-50 rounded-md border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">{p.name}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{p.reason}</p>
              <div className="mt-2 flex items-center gap-1 flex-wrap">
                {p.stages.map((stage, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="fi-badge bg-white text-slate-600 border border-slate-200 text-xs">{stage}</span>
                    {i < p.stages.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fi-card p-4 bg-forgeiq-50 border-forgeiq-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-forgeiq-600" />
            <div>
              <span className="text-sm font-semibold text-slate-900">Ready to Engineer</span>
              <p className="text-xs text-slate-500">Start a peer engineering session to make changes using the brownfield engineering context.</p>
            </div>
          </div>
          <button onClick={() => onNavigate('/peer-engineering')} className="fi-button-primary">
            Start Peer Engineering <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
