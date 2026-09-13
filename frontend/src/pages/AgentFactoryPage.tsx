import { useState } from 'react'
import { useAgentFactory } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner } from '../components/ui/PageHeader'
import type { Agent } from '../types'
import { Wand2, Sparkles, Wrench, Settings, CheckCircle2, AlertCircle } from 'lucide-react'

const categories = ['engineering', 'analysis', 'testing', 'security', 'deployment', 'review', 'documentation']

export default function AgentFactoryPage() {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('engineering')
  const factory = useAgentFactory()

  const handleGenerate = () => {
    if (!description.trim()) return
    factory.mutate({ description, category })
  }

  const result = factory.data as Agent | undefined

  return (
    <>
      <PageHeader
        title="Agent Factory"
        description="Describe an agent in natural language and ForgeIQ will generate an Agent with Contract, Skills, Tools, and Harness compatibility"
      />

      <div className="p-6 space-y-6">
        {/* Input */}
        <div className="fi-card p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Agent Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="e.g. An agent that reviews pull requests for security vulnerabilities, checks for common OWASP issues, and suggests remediations..."
                className="fi-input w-full resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="fi-input"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || factory.isPending}
                className="fi-button-primary"
              >
                <Wand2 className="h-4 w-4" />
                {factory.isPending ? 'Generating...' : 'Generate Agent'}
              </button>
              {factory.isError && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Failed to generate agent
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Result */}
        {factory.isPending && <LoadingSpinner />}

        {result && (
          <div className="fi-card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Generated Agent
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-forgeiq-50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-forgeiq-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{result.display_name || result.name}</h4>
                  <p className="text-sm text-slate-500">{result.purpose}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Category</p>
                  <p className="text-sm font-medium text-slate-900">{result.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Role</p>
                  <p className="text-sm font-medium text-slate-900">{result.role}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Max Turns</p>
                  <p className="text-sm font-medium text-slate-900">{result.max_turns}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Token Budget</p>
                  <p className="text-sm font-medium text-slate-900">{result.token_budget.toLocaleString()}</p>
                </div>
              </div>

              {/* Skills & Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <Settings className="h-3.5 w-3.5" /> Skills ({result.skill_ids.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.skill_ids.map((s) => (
                      <span key={s} className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 font-mono text-xs">{s.slice(0, 8)}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <Wrench className="h-3.5 w-3.5" /> Tools ({result.tool_ids.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.tool_ids.map((t) => (
                      <span key={t} className="fi-badge bg-slate-50 text-slate-600 border border-slate-200 font-mono text-xs">{t.slice(0, 8)}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Instructions */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">System Instructions</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-md p-3 max-h-40 overflow-y-auto">{result.system_instructions}</p>
              </div>

              {/* Harness Compatibility */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Harness Compatibility</p>
                <span className={`fi-badge ${result.contract.harness_compatible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {result.contract.harness_compatible ? 'Compatible' : 'Incompatible'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
