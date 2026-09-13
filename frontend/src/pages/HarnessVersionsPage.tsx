import { useState } from 'react'
import { useHarnesses, useCompareHarnessVersions, useRollbackHarness, useDeprecateHarnessVersion, usePublishHarness, useCreateHarnessVersion } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { SideDrawer, DetailsPanel } from '../components/ui/SideDrawer'
import { Layers, GitCommit, Lock, ArrowRight, RotateCcw, Ban, Plus, GitCompare, FileText, Shield } from 'lucide-react'
import type { Harness, HarnessVersion, HarnessVersionComparison } from '../types'

export default function HarnessVersionsPage() {
  const { data: harnesses, isLoading } = useHarnesses()

  const [selectedHarnessId, setSelectedHarnessId] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [versionA, setVersionA] = useState<string>('')
  const [versionB, setVersionB] = useState<string>('')
  const [newVersionHarnessId, setNewVersionHarnessId] = useState<string | null>(null)

  if (isLoading) return (<><PageHeader title="Harness Versions" description="Immutable published versions with comparison, rollback, and deprecation" /><LoadingSpinner /></>)
  if (!harnesses || harnesses.length === 0) return (<><PageHeader title="Harness Versions" description="Immutable published versions with comparison, rollback, and deprecation" /><EmptyState message="No harness versions found" /></>)

  const allVersions = harnesses.flatMap(h =>
    (h.versions ?? []).map(v => ({
      ...v,
      harnessName: h.display_name || h.name,
      harnessId: h.id,
      harnessLifecycle: h.lifecycle,
    }))
  ).sort((a, b) => b.created_at.localeCompare(a.created_at))

  const publishedCount = allVersions.filter(v => v.published).length
  const immutableCount = allVersions.filter(v => v.is_immutable).length
  const draftCount = allVersions.filter(v => !v.published).length
  const deprecatedCount = allVersions.filter(v => v.deprecated).length

  return (
    <>
      <PageHeader title="Harness Versions" description="Immutable published versions with comparison, rollback, and deprecation" />

      <div className="p-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <div className="fi-card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Versions</p>
            <p className="text-lg font-semibold text-slate-900">{allVersions.length}</p>
          </div>
          <div className="fi-card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Published</p>
            <p className="text-lg font-semibold text-emerald-600">{publishedCount}</p>
          </div>
          <div className="fi-card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Immutable</p>
            <p className="text-lg font-semibold text-forgeiq-600 flex items-center gap-1">
              <Lock size={14} />{immutableCount}
            </p>
          </div>
          <div className="fi-card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Drafts</p>
            <p className="text-lg font-semibold text-slate-600">{draftCount}</p>
          </div>
          <div className="fi-card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Deprecated</p>
            <p className="text-lg font-semibold text-amber-600">{deprecatedCount}</p>
          </div>
        </div>

        {/* Version table */}
        <div className="fi-card">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <GitCommit size={14} className="text-forgeiq-600" />
              All Harness Versions
            </h3>
            <button
              className="text-xs font-medium text-forgeiq-600 hover:text-forgeiq-700"
              onClick={() => setCompareMode(!compareMode)}
            >
              {compareMode ? 'Exit Compare' : 'Compare Versions'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="fi-table">
              <thead>
                <tr>
                  {compareMode && <th className="w-8"></th>}
                  <th>Harness</th>
                  <th>Version</th>
                  <th className="text-right">Agents</th>
                  <th className="text-right">Skills</th>
                  <th className="text-right">Tools</th>
                  <th className="text-right">Loops</th>
                  <th className="text-right">Policies</th>
                  <th>Environment</th>
                  <th>Approval</th>
                  <th>Immutable</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allVersions.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    {compareMode && (
                      <td>
                        <input
                          type="radio"
                          name="versionA"
                          checked={versionA === v.version && selectedHarnessId === v.harnessId}
                          onChange={() => { setVersionA(v.version); setSelectedHarnessId(v.harnessId) }}
                          className="h-3 w-3"
                        />
                        <input
                          type="radio"
                          name="versionB"
                          checked={versionB === v.version && selectedHarnessId === v.harnessId}
                          onChange={() => { setVersionB(v.version); setSelectedHarnessId(v.harnessId) }}
                          className="h-3 w-3 ml-1"
                        />
                      </td>
                    )}
                    <td className="font-medium text-slate-900 flex items-center gap-2">
                      <Layers size={14} className="text-forgeiq-600" />
                      {v.harnessName}
                    </td>
                    <td className="font-mono text-sm text-slate-700">{v.version}</td>
                    <td className="text-right text-slate-600">{v.agent_ids.length}</td>
                    <td className="text-right text-slate-600">{v.skill_ids.length}</td>
                    <td className="text-right text-slate-600">{v.tool_ids.length}</td>
                    <td className="text-right text-slate-600">{v.loop_ids.length}</td>
                    <td className="text-right text-slate-600">{(v.policy_ids || []).length}</td>
                    <td className="text-slate-600">{v.environment}</td>
                    <td>
                      {v.approval_required
                        ? <StatusBadge status="AWAITING_APPROVAL" showIcon={false} />
                        : <span className="text-slate-400 text-xs">Not required</span>}
                    </td>
                    <td>
                      {v.is_immutable ? (
                        <Lock size={14} className="text-forgeiq-600" />
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      {v.deprecated ? (
                        <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">deprecated</span>
                      ) : v.is_default ? (
                        <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>
                      ) : v.published ? (
                        <StatusBadge status="published" />
                      ) : (
                        <StatusBadge status="draft" />
                      )}
                    </td>
                    <td className="text-xs text-slate-500">{new Date(v.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="text-xs text-slate-500 hover:text-forgeiq-600"
                        onClick={() => setNewVersionHarnessId(v.harnessId)}
                        title="Create new version"
                      >
                        <Plus size={12} className="inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compare action bar */}
        {compareMode && versionA && versionB && selectedHarnessId && (
          <div className="fi-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="font-mono font-medium text-slate-900">{versionA}</span>
              <GitCompare size={14} className="text-forgeiq-600" />
              <span className="font-mono font-medium text-slate-900">{versionB}</span>
            </div>
            <VersionCompareButton harnessId={selectedHarnessId} va={versionA} vb={versionB} />
          </div>
        )}

        {/* New version drawer */}
        {newVersionHarnessId && (
          <NewVersionDrawer
            harnessId={newVersionHarnessId}
            harnessName={harnesses.find(h => h.id === newVersionHarnessId)?.display_name || ''}
            onClose={() => setNewVersionHarnessId(null)}
          />
        )}
      </div>
    </>
  )
}

function VersionCompareButton({ harnessId, va, vb }: { harnessId: string; va: string; vb: string }) {
  const compare = useCompareHarnessVersions()
  const [result, setResult] = useState<HarnessVersionComparison | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)

  return (
    <>
      <button
        className="px-4 py-1.5 text-sm font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 disabled:opacity-50"
        disabled={compare.isPending || va === vb}
        onClick={() => {
          compare.mutate(
            { id: harnessId, va, vb },
            {
              onSuccess: (data) => {
                setResult(data)
                setShowDrawer(true)
              }
            }
          )
        }}
      >
        {compare.isPending ? 'Comparing...' : 'View Diff'}
      </button>
      {showDrawer && result && (
        <VersionDiffDrawer
          comparison={result}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </>
  )
}

function VersionDiffDrawer({ comparison, onClose }: { comparison: HarnessVersionComparison; onClose: () => void }) {
  const va = comparison.version_a
  const vb = comparison.version_b
  const diffs = comparison.differences
  const resolved = comparison.resolved

  const diffFields: { key: string; label: string; type: 'list' | 'scalar' | 'bool' }[] = [
    { key: 'graph_id', label: 'Graph', type: 'scalar' },
    { key: 'agent_ids', label: 'Agents', type: 'list' },
    { key: 'skill_ids', label: 'Skills', type: 'list' },
    { key: 'tool_ids', label: 'Tools', type: 'list' },
    { key: 'loop_ids', label: 'Loops', type: 'list' },
    { key: 'model_config_ids', label: 'Models', type: 'list' },
    { key: 'policy_ids', label: 'Policies', type: 'list' },
    { key: 'environment', label: 'Environment', type: 'scalar' },
    { key: 'cost_limit_cents', label: 'Cost Limit', type: 'scalar' },
    { key: 'time_limit_seconds', label: 'Time Limit', type: 'scalar' },
    { key: 'approval_required', label: 'Approval Required', type: 'bool' },
    { key: 'changelog', label: 'Changelog', type: 'scalar' },
  ]

  return (
    <SideDrawer
      open
      onClose={onClose}
      title="Version Comparison"
      subtitle={`${va.version} vs ${vb.version}`}
      width="640px"
    >
      <div className="p-4 space-y-4">
        {/* Version headers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="fi-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-slate-900">{va.version}</span>
              {va.is_immutable && <Lock size={11} className="text-slate-400" />}
              {va.is_default && <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>}
            </div>
            <p className="text-xs text-slate-500">{va.changelog}</p>
            <p className="text-xs text-slate-400 mt-1">{new Date(va.created_at).toLocaleDateString()}</p>
          </div>
          <div className="fi-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-slate-900">{vb.version}</span>
              {vb.is_immutable && <Lock size={11} className="text-slate-400" />}
              {vb.is_default && <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>}
            </div>
            <p className="text-xs text-slate-500">{vb.changelog}</p>
            <p className="text-xs text-slate-400 mt-1">{new Date(vb.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Diff summary */}
        <div className="fi-card p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Differences</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(diffs).filter(([, isDiff]) => isDiff).length === 0 ? (
              <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                No differences
              </span>
            ) : (
              Object.entries(diffs).filter(([, isDiff]) => isDiff).map(([field]) => (
                <span key={field} className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">
                  {field}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Detailed diff */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Detailed Comparison</h3>
          {diffFields.map(({ key, label, type }) => {
            const isDiff = diffs[key]
            if (!isDiff) return null

            return (
              <div key={key} className="fi-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-900">{label}</span>
                  <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">changed</span>
                </div>
                {type === 'list' && resolved ? (() => {
                  const resKey = key === 'agent_ids' ? 'agents' : key === 'tool_ids' ? 'tools' : key === 'skill_ids' ? 'skills' : key === 'loop_ids' ? 'loops' : key === 'policy_ids' ? 'policies' : key === 'model_config_ids' ? 'models' : key
                  const listA = (resolved.version_a as Record<string, unknown>)[resKey] as Array<{id: string; name: string}> | undefined
                  const listB = (resolved.version_b as Record<string, unknown>)[resKey] as Array<{id: string; name: string}> | undefined
                  return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">{va.version}</p>
                      <div className="space-y-1">
                        {listA && listA.length > 0 ? listA.map((item) => (
                          <div key={item.id} className="text-xs text-slate-600 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-slate-400" />
                            {item.name}
                          </div>
                        )) : <span className="text-xs text-slate-400">None</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">{vb.version}</p>
                      <div className="space-y-1">
                        {listB && listB.length > 0 ? listB.map((item) => (
                          <div key={item.id} className="text-xs text-slate-600 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-slate-400" />
                            {item.name}
                          </div>
                        )) : <span className="text-xs text-slate-400">None</span>}
                      </div>
                    </div>
                  </div>
                  )
                })() : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">{va.version}</p>
                      <p className="text-sm text-slate-700">
                        {String((comparison.detailed_diff[key] as { version_a: unknown })?.version_a ?? '—')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">{vb.version}</p>
                      <p className="text-sm text-slate-700">
                        {String((comparison.detailed_diff[key] as { version_b: unknown })?.version_b ?? '—')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Evidence requirements */}
        <div className="fi-card p-3">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Shield size={12} className="text-forgeiq-600" />
            Immutability
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">{va.version}</p>
              {va.is_immutable ? (
                <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                  <Lock size={10} className="inline mr-1" />Immutable
                </span>
              ) : (
                <span className="fi-badge bg-slate-100 text-slate-500 border border-slate-200">Mutable</span>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">{vb.version}</p>
              {vb.is_immutable ? (
                <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                  <Lock size={10} className="inline mr-1" />Immutable
                </span>
              ) : (
                <span className="fi-badge bg-slate-100 text-slate-500 border border-slate-200">Mutable</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </SideDrawer>
  )
}

function NewVersionDrawer({ harnessId, harnessName, onClose }: { harnessId: string; harnessName: string; onClose: () => void }) {
  const createVersion = useCreateHarnessVersion()
  const publishVersion = usePublishHarness()
  const rollback = useRollbackHarness()
  const deprecate = useDeprecateHarnessVersion()
  const { data: harnesses } = useHarnesses()
  const harness = harnesses?.find(h => h.id === harnessId)
  const [changelog, setChangelog] = useState('')

  return (
    <SideDrawer
      open
      onClose={onClose}
      title={harnessName}
      subtitle="Version management"
      width="480px"
    >
      <div className="p-4 space-y-4">
        {/* Existing versions */}
        {harness && harness.versions && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <GitCommit size={14} className="text-forgeiq-600" />
              Existing Versions
            </h3>
            <div className="space-y-2">
              {harness.versions.map((v: HarnessVersion) => (
                <div key={v.id} className="fi-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-slate-900">{v.version}</span>
                      {v.is_default && <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">default</span>}
                      {v.is_immutable && <Lock size={11} className="text-slate-400" />}
                      {v.deprecated && <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">deprecated</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {v.published && !v.is_default && !v.deprecated && (
                        <button
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-forgeiq-600"
                          title="Set as default (rollback)"
                          onClick={() => { rollback.mutate({ id: harnessId, version: v.version }); onClose() }}
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                      {v.published && !v.deprecated && (
                        <button
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600"
                          title="Deprecate version"
                          onClick={() => { deprecate.mutate({ id: harnessId, version: v.version }); onClose() }}
                        >
                          <Ban size={12} />
                        </button>
                      )}
                      {!v.published && !v.is_immutable && (
                        <button
                          className="px-2 py-0.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700"
                          onClick={() => { publishVersion.mutate({ id: harnessId, version: v.version }); onClose() }}
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{v.changelog}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(v.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create new version */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Plus size={14} className="text-forgeiq-600" />
            Create New Version
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            New versions start as mutable drafts. Publishing makes them immutable.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Changelog</label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="Describe changes in this version..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-forgeiq-400"
                rows={3}
              />
            </div>
            <button
              className="w-full px-3 py-2 text-sm font-medium text-white bg-forgeiq-600 rounded-md hover:bg-forgeiq-700 disabled:opacity-50"
              disabled={!changelog || createVersion.isPending}
              onClick={() => {
                createVersion.mutate(
                  { id: harnessId, body: { changelog } },
                  { onSuccess: () => { setChangelog(''); onClose() } }
                )
              }}
            >
              {createVersion.isPending ? 'Creating...' : 'Create Version'}
            </button>
          </div>
        </div>
      </div>
    </SideDrawer>
  )
}
