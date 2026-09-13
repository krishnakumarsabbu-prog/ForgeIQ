import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node,
  type NodeMouseHandler, type EdgeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Save, Play, CheckCircle2, AlertTriangle, XCircle, FileCheck,
  Settings, ChevronLeft, ChevronRight, Layers, Eye, EyeOff,
} from 'lucide-react'
import {
  useAgents, useSkills, useTools, useModels, useLoops, usePolicies,
  useHarnesses, useGraphs, useCreateHarness, useUpdateHarness, useCreateGraph,
  useUpdateGraphFull, useValidateGraph, useCreateExecution,
} from '../hooks/useQueries'
import { Spinner } from '../components/ui/StatusBadge'
import { NODE_PALETTE, harnessNodeTypes } from '../features/harnesses/HarnessNodeTypes'
import { NodeInspector } from '../features/harnesses/NodeInspector'
import { HarnessConfigPanel } from '../features/harnesses/HarnessConfigPanel'
import type { BuilderNode, HarnessConfig } from '../features/harnesses/types'
import type { GraphValidation, GraphNode, GraphEdge } from '../types'

let nodeIdCounter = 0
function genNodeId() {
  nodeIdCounter += 1
  return `node_${Date.now().toString(36)}_${nodeIdCounter}`
}

let edgeIdCounter = 0
function genEdgeId() {
  edgeIdCounter += 1
  return `edge_${Date.now().toString(36)}_${edgeIdCounter}`
}

const DEFAULT_CONFIG: HarnessConfig = {
  name: '',
  display_name: '',
  purpose: '',
  harness_type: 'development',
  environment: 'development',
  inputs: [],
  outputs: [],
  context: {},
  permissions: [],
  policy_ids: [],
  loop_ids: [],
  agent_ids: [],
  skill_ids: [],
  tool_ids: [],
  model_config_ids: [],
  retry_rules: { max_retries: 3 },
  failure_rules: { action: 'diagnose' },
  approval_rules: {},
  escalation_rules: {},
  execution_rules: {},
  cost_limit_cents: 10000,
  time_limit_seconds: 3600,
  approval_required: false,
  evidence_requirements: ['graph_execution', 'agent_outputs', 'tool_results'],
}

export default function HarnessBuilderPage() {
  return (
    <ReactFlowProvider>
      <HarnessBuilderInner />
    </ReactFlowProvider>
  )
}

function HarnessBuilderInner() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editingHarnessId = searchParams.get('harness')

  const { data: agents } = useAgents()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()
  const { data: models } = useModels()
  const { data: loops } = useLoops()
  const { data: policies } = usePolicies()
  const { data: harnesses } = useHarnesses()
  const { data: graphs } = useGraphs()
  const createHarness = useCreateHarness()
  const updateHarness = useUpdateHarness()
  const createGraph = useCreateGraph()
  const updateGraphFull = useUpdateGraphFull()
  const validateGraphMutation = useValidateGraph()
  const createExecution = useCreateExecution()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [config, setConfig] = useState<HarnessConfig>(DEFAULT_CONFIG)
  const [harnessId, setHarnessId] = useState<string | null>(editingHarnessId)
  const [graphId, setGraphId] = useState<string | null>(null)
  const [lifecycle, setLifecycle] = useState<string>('draft')
  const [version, setVersion] = useState<string>('v1')
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [diagnostics, setDiagnostics] = useState<GraphValidation | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Load existing harness for editing
  useEffect(() => {
    if (editingHarnessId && harnesses) {
      const h = harnesses.find((x) => x.id === editingHarnessId)
      if (h) {
        setHarnessId(h.id)
        setConfig({
          name: h.name,
          display_name: h.display_name,
          purpose: h.purpose,
          harness_type: h.harness_type,
          environment: h.environment,
          inputs: h.inputs,
          outputs: h.outputs,
          context: h.context,
          permissions: h.permissions,
          policy_ids: h.policy_ids,
          loop_ids: h.loop_ids,
          agent_ids: h.agent_ids,
          skill_ids: h.skill_ids,
          tool_ids: h.tool_ids,
          model_config_ids: h.model_config_ids,
          retry_rules: h.retry_rules,
          failure_rules: h.failure_rules,
          approval_rules: h.approval_rules,
          escalation_rules: h.escalation_rules,
          execution_rules: h.execution_rules,
          cost_limit_cents: h.cost_limit_cents,
          time_limit_seconds: h.time_limit_seconds,
          approval_required: h.approval_required,
          evidence_requirements: h.evidence_requirements,
        })
        setLifecycle(h.lifecycle)
        setVersion(h.current_version)
        setGraphId(h.graph_id || null)

        // Load graph nodes/edges
        if (h.graph_id && graphs) {
          const g = graphs.find((x) => x.id === h.graph_id)
          if (g) {
            const rfNodes: Node[] = g.nodes.map((n: GraphNode) => ({
              id: n.id,
              type: 'harnessNode',
              position: { x: n.position_x, y: n.position_y },
              data: {
                node_type: n.node_type,
                label: n.label,
                ref_id: n.ref_id,
                config: n.config,
                description: n.description,
              },
            }))
            const rfEdges: Edge[] = g.edges.map((e: GraphEdge) => ({
              id: e.id,
              source: e.source_node_id,
              target: e.target_node_id,
              label: e.condition || e.label || undefined,
              type: 'smoothstep',
              data: { condition: e.condition, edge_type: e.edge_type, label: e.label },
            }))
            setNodes(rfNodes)
            setEdges(rfEdges)
          }
        }
      }
    }
  }, [editingHarnessId, harnesses, graphs, setNodes, setEdges])

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) as BuilderNode | null, [nodes, selectedNodeId])

  const onConnect = useCallback((conn: Connection) => {
    const newEdge: Edge = {
      ...conn,
      id: genEdgeId(),
      type: 'smoothstep',
      data: { edge_type: 'sequential' },
    } as Edge
    setEdges((eds) => addEdge(newEdge, eds))
  }, [setEdges])

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    setSelectedNodeId(node.id)
    setShowConfigPanel(false)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const onEdgeClick: EdgeMouseHandler = useCallback((_evt, _edge) => {
    setSelectedNodeId(null)
  }, [])

  // Drag from palette
  const onDragStart = useCallback((e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/harness-node', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('application/harness-node')
    if (!nodeType || !wrapperRef.current) return

    const bounds = wrapperRef.current.getBoundingClientRect()
    const x = e.clientX - bounds.left - 90
    const y = e.clientY - bounds.top - 30

    const paletteItem = NODE_PALETTE.find((p) => p.type === nodeType)
    const label = paletteItem ? `${paletteItem.label} ${nodes.length + 1}` : nodeType

    const newNode: Node = {
      id: genNodeId(),
      type: 'harnessNode',
      position: { x, y },
      data: {
        node_type: nodeType,
        label,
        config: {},
      },
    }
    setNodes((nds) => [...nds, newNode])
    setSelectedNodeId(newNode.id)
  }, [nodes.length, setNodes])

  // Node update from inspector
  const handleNodeUpdate = useCallback((id: string, patch: Partial<BuilderNode['data']>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [setNodes])

  const handleNodeDelete = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setSelectedNodeId(null)
  }, [setNodes, setEdges])

  const updateConfig = useCallback((patch: Partial<HarnessConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  // Serialize nodes/edges to backend graph format
  const serializeGraph = useCallback(() => {
    const graphNodes: Record<string, unknown>[] = nodes.map((n) => {
      const d = n.data as unknown as BuilderNode['data']
      return {
        id: n.id,
        node_type: d.node_type,
        label: d.label,
        ref_id: d.ref_id || null,
        config: d.config || {},
        position_x: n.position.x,
        position_y: n.position.y,
        description: d.description || '',
      }
    })
    const graphEdges: Record<string, unknown>[] = edges.map((e) => ({
      id: e.id,
      source_node_id: e.source,
      target_node_id: e.target,
      label: (e.data as Record<string, unknown>)?.label || '',
      condition: (e.data as Record<string, unknown>)?.condition || null,
      edge_type: (e.data as Record<string, unknown>)?.edge_type || 'sequential',
    }))
    return { nodes: graphNodes, edges: graphEdges }
  }, [nodes, edges])

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      // Create or update graph
      let gid = graphId
      if (!gid) {
        const gName = config.name || 'harness-graph'
        const created = await createGraph.mutateAsync({ name: gName, display_name: gName })
        gid = created.id
        setGraphId(gid)
      }
      const serialized = serializeGraph()
      await updateGraphFull.mutateAsync({ id: gid!, body: { ...serialized, name: config.name || 'harness-graph', display_name: config.display_name || config.name } })

      // Create or update harness
      const harnessBody = {
        name: config.name || 'unnamed-harness',
        display_name: config.display_name || config.name || 'Unnamed Harness',
        purpose: config.purpose,
        harness_type: config.harness_type,
        graph_id: gid,
        loop_ids: config.loop_ids,
        agent_ids: config.agent_ids,
        skill_ids: config.skill_ids,
        tool_ids: config.tool_ids,
        model_config_ids: config.model_config_ids,
        environment: config.environment,
        cost_limit_cents: config.cost_limit_cents,
        time_limit_seconds: config.time_limit_seconds,
        approval_required: config.approval_required,
      }

      if (harnessId) {
        await updateHarness.mutateAsync({ id: harnessId, body: harnessBody })
        setSaveMsg({ type: 'success', text: 'Harness saved' })
      } else {
        const created = await createHarness.mutateAsync(harnessBody)
        setHarnessId(created.id)
        setSaveMsg({ type: 'success', text: 'Harness created' })
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: `Save failed: ${(err as Error).message}` })
    } finally {
      setSaving(false)
    }
  }, [config, graphId, harnessId, serializeGraph, createGraph, updateGraphFull, createHarness, updateHarness])

  // Validate
  const handleValidate = useCallback(async () => {
    if (!graphId) {
      // Local validation without backend graph
      const localDiags: GraphValidation = {
        valid: nodes.length > 0,
        errors: nodes.length === 0 ? [{ severity: 'error', code: 'EMPTY_GRAPH', message: 'Graph has no nodes' }] : [],
        warnings: [],
        diagnostics: nodes.length === 0 ? [{ severity: 'error', code: 'EMPTY_GRAPH', message: 'Graph has no nodes' }] : [],
        node_count: nodes.length,
        edge_count: edges.length,
      }
      setDiagnostics(localDiags)
      setShowDiagnostics(true)
      return
    }
    try {
      const result = await validateGraphMutation.mutateAsync(graphId)
      setDiagnostics(result)
      setShowDiagnostics(true)
    } catch (err) {
      setDiagnostics({ valid: false, errors: [{ severity: 'error', code: 'VALIDATION_ERROR', message: (err as Error).message }], warnings: [], diagnostics: [], node_count: 0, edge_count: 0 })
      setShowDiagnostics(true)
    }
  }, [graphId, nodes, edges, validateGraphMutation])

  // Publish
  const handlePublish = useCallback(async () => {
    if (!harnessId) {
      setSaveMsg({ type: 'error', text: 'Save the harness before publishing' })
      return
    }
    setPublishing(true)
    setSaveMsg(null)
    try {
      // Validate first
      if (graphId) {
        const valResult = await validateGraphMutation.mutateAsync(graphId)
        if (!valResult.valid) {
          setDiagnostics(valResult)
          setShowDiagnostics(true)
          setSaveMsg({ type: 'error', text: 'Cannot publish: graph has validation errors' })
          return
        }
      }
      // Publish via the existing publish endpoint
      const res = await fetch(`/api/harnesses/${harnessId}/publish/${version}`, { method: 'POST' })
      if (!res.ok) {
        const txt = await res.text()
        setSaveMsg({ type: 'error', text: `Publish failed: ${txt}` })
      } else {
        setLifecycle('published')
        setSaveMsg({ type: 'success', text: 'Harness published as immutable version' })
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: `Publish failed: ${(err as Error).message}` })
    } finally {
      setPublishing(false)
    }
  }, [harnessId, graphId, version, validateGraphMutation])

  // Run
  const handleRun = useCallback(async () => {
    if (!harnessId) {
      setSaveMsg({ type: 'error', text: 'Save the harness before running' })
      return
    }
    setRunning(true)
    setSaveMsg(null)
    try {
      await createExecution.mutateAsync({
        harness_id: harnessId,
        trigger: 'manual',
        trigger_reason: `Manual run from Harness Builder`,
      })
      setSaveMsg({ type: 'success', text: 'Execution started - view in Executions' })
    } catch (err) {
      setSaveMsg({ type: 'error', text: `Run failed: ${(err as Error).message}` })
    } finally {
      setRunning(false)
    }
  }, [harnessId, createExecution])

  const isLoading = !agents || !skills || !tools || !models || !loops || !policies

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-73px)]">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/harnesses')} className="fi-btn-secondary px-2 py-1">
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-forgeiq-600" />
            <input
              type="text"
              value={config.display_name || config.name}
              onChange={(e) => updateConfig({ display_name: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="Harness name..."
              className="text-sm font-semibold text-slate-900 bg-transparent border-none outline-none focus:bg-slate-50 rounded px-1 py-0.5 w-48"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200">{version}</span>
            <span className={`fi-badge ${lifecycle === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
              {lifecycle}
            </span>
            {graphId && <span className="fi-badge bg-blue-50 text-blue-700 border border-blue-200">graph linked</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {saveMsg.text}
            </span>
          )}
          <button
            onClick={handleValidate}
            disabled={validateGraphMutation.isPending}
            className="fi-btn-secondary"
          >
            {validateGraphMutation.isPending ? <Spinner size={14} /> : <CheckCircle2 size={14} />}
            Validate
          </button>
          <button onClick={() => setShowConfigPanel(!showConfigPanel)} className="fi-btn-secondary">
            {showConfigPanel ? <EyeOff size={14} /> : <Settings size={14} />}
            Config
          </button>
          <button onClick={handleSave} disabled={saving} className="fi-btn-secondary">
            {saving ? <Spinner size={14} /> : <Save size={14} />}
            Save
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || !harnessId}
            className="fi-btn-primary"
          >
            {publishing ? <Spinner size={14} /> : <FileCheck size={14} />}
            Publish
          </button>
          <button
            onClick={handleRun}
            disabled={running || !harnessId}
            className="fi-btn-primary bg-emerald-600 hover:bg-emerald-700"
          >
            {running ? <Spinner size={14} /> : <Play size={14} />}
            Run
          </button>
        </div>
      </div>

      {/* Main three-panel area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node palette */}
        <div className="w-44 border-r border-slate-200 bg-slate-50 overflow-y-auto flex-shrink-0">
          <div className="px-3 py-2 border-b border-slate-200 bg-white">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Node Palette</h3>
          </div>
          <div className="p-2 space-y-1">
            {NODE_PALETTE.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white border border-slate-200 hover:border-forgeiq-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded ${item.bg}`}>
                    <Icon size={12} className={item.color} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{item.label}</span>
                </div>
              )
            })}
          </div>
          <div className="px-3 py-2 mt-2 border-t border-slate-200">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Drag nodes onto the canvas. Connect nodes by dragging between handles.
            </p>
          </div>
        </div>

        {/* Center: React Flow canvas */}
        <div className="flex-1 relative" ref={wrapperRef} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={harnessNodeTypes}
            fitView
            defaultEdgeOptions={{ type: 'smoothstep' }}
            proOptions={{ hideAttribution: true }}
            className="bg-slate-50"
          >
            <Background gap={16} size={1} color="#cbd5e1" />
            <Controls className="!bg-white !border-slate-200" />
            <MiniMap
              className="!bg-white !border !border-slate-200"
              nodeColor="#c084fc"
              maskColor="rgba(0,0,0,0.05)"
            />
          </ReactFlow>

          {/* Toggle diagnostics button */}
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="absolute bottom-2 left-2 z-10 fi-btn-secondary text-xs"
          >
            {showDiagnostics ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            Diagnostics
          </button>
        </div>

        {/* Right: Inspector */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-hidden flex-shrink-0 flex flex-col">
          {showConfigPanel ? (
            <div className="h-full flex flex-col">
              <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900">Harness Configuration</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <HarnessConfigPanel
                  config={config}
                  agents={agents || []}
                  skills={skills || []}
                  tools={tools || []}
                  models={models || []}
                  loops={loops || []}
                  policies={policies || []}
                  onChange={updateConfig}
                />
              </div>
            </div>
          ) : (
            <NodeInspector
              node={selectedNode}
              agents={agents || []}
              skills={skills || []}
              tools={tools || []}
              models={models || []}
              loops={loops || []}
              policies={policies || []}
              onUpdate={handleNodeUpdate}
              onDelete={handleNodeDelete}
            />
          )}
        </div>
      </div>

      {/* Bottom: Diagnostics panel */}
      {showDiagnostics && (
        <div className="border-t border-slate-200 bg-white max-h-48 overflow-y-auto flex-shrink-0">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Validation Diagnostics</h3>
              {diagnostics && (
                <div className="flex items-center gap-2">
                  {diagnostics.valid ? (
                    <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={11} /> Valid
                    </span>
                  ) : (
                    <span className="fi-badge bg-red-50 text-red-700 border border-red-200">
                      <XCircle size={11} /> {diagnostics.errors.length} error(s)
                    </span>
                  )}
                  {diagnostics.warnings.length > 0 && (
                    <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertTriangle size={11} /> {diagnostics.warnings.length} warning(s)
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {diagnostics.node_count} nodes, {diagnostics.edge_count} edges
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => setShowDiagnostics(false)} className="text-slate-400 hover:text-slate-600">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="p-2">
            {!diagnostics ? (
              <p className="text-xs text-slate-400 px-2 py-3">
                Click "Validate" to run graph validation checks for disconnected nodes, missing references, circular dependencies, unreachable nodes, missing permissions, and missing evidence.
              </p>
            ) : diagnostics.diagnostics.length === 0 ? (
              <p className="text-xs text-emerald-600 px-2 py-3 flex items-center gap-1">
                <CheckCircle2 size={12} /> No issues found. Graph is valid.
              </p>
            ) : (
              <div className="space-y-1">
                {diagnostics.diagnostics.map((d, i) => (
                  <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
                    d.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {d.severity === 'error' ? <XCircle size={12} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />}
                    <div>
                      <span className="font-mono font-medium">{d.code}</span>
                      <span className="ml-2">{d.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
