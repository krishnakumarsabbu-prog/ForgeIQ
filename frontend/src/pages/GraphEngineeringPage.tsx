import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState,
  type Connection, type Edge, type Node,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Network, Share2, ChevronRight, Plus, Save, Play, CheckCircle2,
  AlertTriangle, XCircle, FileCheck, GitBranch, Layers, Eye,
  Clock, ArrowRightCircle, RotateCcw, FileJson, LogOut,
} from 'lucide-react'
import {
  useGraphs, useGraph, useCreateGraph, useUpdateGraphFull, useValidateGraph,
  useDeleteGraph, useGraphVersions, useCreateGraphVersion, usePublishGraph,
  useRollbackGraph, useSerializeGraph, useExecuteGraph,
  useAgents, useSkills, useTools,
} from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/StatusBadge'
import { SideDrawer } from '../components/ui/SideDrawer'
import { graphNodeTypes, GRAPH_NODE_PALETTE } from '../features/graphs/graphNodeTypes'
import { GraphNodeInspector } from '../features/graphs/GraphNodeInspector'
import type { Graph, GraphNode, GraphEdge, GraphValidation, GraphVersion, GraphExecutionResult, Agent, Skill, Tool } from '../types'

type Tab = 'catalog' | 'builder' | 'versions' | 'validation' | 'execution'

let nodeIdCounter = 0
function genNodeId() { return `node_${Date.now().toString(36)}_${++nodeIdCounter}` }
let edgeIdCounter = 0
function genEdgeId() { return `edge_${Date.now().toString(36)}_${++edgeIdCounter}` }

const NODE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 border-slate-300',
  ready: 'bg-blue-50 text-blue-700 border-blue-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  succeeded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-slate-50 text-slate-500 border-slate-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  waiting: 'bg-amber-50 text-amber-700 border-amber-200',
  retrying: 'bg-yellow-50 text-yellow-700 border-yellow-200',
}

export default function GraphEngineeringPage() {
  const [activeTab, setActiveTab] = useState<Tab>('catalog')
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: graphs, isLoading } = useGraphs()
  const { data: agents } = useAgents()
  const { data: skills } = useSkills()
  const { data: tools } = useTools()

  const selectedGraph = useMemo(
    () => (graphs || []).find((g) => g.id === selectedGraphId),
    [graphs, selectedGraphId],
  )

  const tabs: { key: Tab; label: string; icon: typeof Network }[] = [
    { key: 'catalog', label: 'Catalog', icon: Network },
    { key: 'builder', label: 'Builder', icon: Layers },
    { key: 'versions', label: 'Versions', icon: GitBranch },
    { key: 'validation', label: 'Validation', icon: CheckCircle2 },
    { key: 'execution', label: 'Execution', icon: Play },
  ]

  return (
    <div>
      <PageHeader
        title="Graph Engineering"
        description="Executable engineering graphs defining what work happens and how it is connected"
        actions={
          <button onClick={() => setShowCreate(true)} className="fi-btn-primary">
            <Plus size={14} /> New Graph
          </button>
        }
      />

      <div className="flex border-b border-slate-200 bg-white px-6">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          const disabled = !selectedGraphId && tab.key !== 'catalog'
          return (
            <button
              key={tab.key}
              onClick={() => !disabled && setActiveTab(tab.key)}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active ? 'border-forgeiq-600 text-forgeiq-700' :
                disabled ? 'border-transparent text-slate-300 cursor-not-allowed' :
                'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex h-[calc(100vh-113px)]">
        {/* Sidebar: graph list */}
        <div className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto flex-shrink-0">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-white">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Graphs</h3>
          </div>
          {isLoading ? (
            <LoadingSpinner />
          ) : !graphs?.length ? (
            <div className="p-4"><EmptyState message="No graphs defined" /></div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {graphs.map((g: Graph) => (
                <li
                  key={g.id}
                  onClick={() => { setSelectedGraphId(g.id); if (activeTab === 'catalog') setActiveTab('catalog') }}
                  className={`px-4 py-2.5 cursor-pointer transition-colors ${
                    selectedGraphId === g.id ? 'bg-white border-l-2 border-l-forgeiq-600' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-800 truncate">{g.display_name || g.name}</span>
                  </div>
                  <div className="ml-5.5 flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{g.version}</span>
                    <StatusBadge status={g.published ? 'published' : 'draft'} />
                    <span className="text-xs text-slate-400">{g.nodes.length} nodes</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {!selectedGraph ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState message="Select a graph to view its details" />
            </div>
          ) : activeTab === 'catalog' ? (
            <GraphCatalogView graph={selectedGraph} />
          ) : activeTab === 'builder' ? (
            <GraphBuilderView graph={selectedGraph} agents={agents || []} skills={skills || []} tools={tools || []} />
          ) : activeTab === 'versions' ? (
            <GraphVersionsView graph={selectedGraph} />
          ) : activeTab === 'validation' ? (
            <GraphValidationView graph={selectedGraph} />
          ) : activeTab === 'execution' ? (
            <GraphExecutionView graph={selectedGraph} />
          ) : null}
        </div>
      </div>

      {showCreate && (
        <CreateGraphDrawer onClose={() => setShowCreate(false)} onCreated={(id) => { setSelectedGraphId(id); setActiveTab('builder'); }} />
      )}
    </div>
  )
}


function GraphCatalogView({ graph }: { graph: Graph }) {
  const entryNode = graph.nodes.find(n => n.id === graph.entry_node_id)
  const terminalNodes = graph.nodes.filter(n => graph.terminal_node_ids.includes(n.id))

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Graph header */}
      <div className="fi-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{graph.display_name || graph.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{graph.description}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{graph.version}</span>
            <StatusBadge status={graph.published ? 'published' : 'draft'} />
            {graph.is_default && <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">Default</span>}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="fi-card p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <FileJson size={14} className="text-slate-400" /> Graph Metadata
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Inputs</dt>
            <dd className="text-sm text-slate-900 mt-0.5">{graph.metadata.inputs.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Outputs</dt>
            <dd className="text-sm text-slate-900 mt-0.5">{graph.metadata.outputs.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Environment</dt>
            <dd className="text-sm text-slate-900 mt-0.5">{graph.metadata.environment}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Failure Path</dt>
            <dd className="text-sm mt-0.5">
              <StatusBadge status={graph.metadata.failure_path_enabled ? 'COMPLETED' : 'PENDING'} showIcon={false} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Approval Path</dt>
            <dd className="text-sm mt-0.5">
              <StatusBadge status={graph.metadata.approval_path_enabled ? 'COMPLETED' : 'PENDING'} showIcon={false} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Dependencies</dt>
            <dd className="text-sm text-slate-900 mt-0.5">{graph.metadata.dependencies.join(', ') || '—'}</dd>
          </div>
        </div>
      </div>

      {/* Entry / Terminal */}
      <div className="grid grid-cols-2 gap-4">
        <div className="fi-card p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <ArrowRightCircle size={14} className="text-forgeiq-600" /> Entry Node
          </h3>
          {entryNode ? (
            <div className="text-sm text-slate-700">{entryNode.label} <span className="text-xs text-slate-400">({entryNode.node_type})</span></div>
          ) : (
            <span className="text-sm text-slate-400">Not set</span>
          )}
        </div>
        <div className="fi-card p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <LogOut size={14} className="text-rose-600" /> Terminal Nodes
          </h3>
          {terminalNodes.length ? (
            <div className="space-y-1">
              {terminalNodes.map(n => (
                <div key={n.id} className="text-sm text-slate-700">{n.label} <span className="text-xs text-slate-400">({n.node_type})</span></div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-slate-400">Not set</span>
          )}
        </div>
      </div>

      {/* Nodes Table */}
      <div className="fi-card">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Nodes ({graph.nodes.length})</h3>
        </div>
        {graph.nodes.length === 0 ? (
          <EmptyState message="No nodes in this graph" />
        ) : (
          <table className="fi-table">
            <thead>
              <tr>
                <th className="text-left">Label</th>
                <th className="text-left">Type</th>
                <th className="text-left">Ref</th>
                <th className="text-left">Inputs</th>
                <th className="text-left">Outputs</th>
                <th className="text-center">Entry</th>
                <th className="text-center">Terminal</th>
              </tr>
            </thead>
            <tbody>
              {graph.nodes.map((node: GraphNode) => (
                <tr key={node.id}>
                  <td className="font-medium text-slate-900">{node.label}</td>
                  <td><span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{node.node_type}</span></td>
                  <td className="text-slate-600 font-mono text-xs">{node.ref_id ? node.ref_id.slice(0, 12) + '...' : '—'}</td>
                  <td className="text-slate-600 text-xs">{node.inputs.join(', ') || '—'}</td>
                  <td className="text-slate-600 text-xs">{node.outputs.join(', ') || '—'}</td>
                  <td className="text-center">{node.is_entry && <CheckCircle2 size={14} className="text-forgeiq-600 inline" />}</td>
                  <td className="text-center">{node.is_terminal && <CheckCircle2 size={14} className="text-rose-600 inline" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edges Table */}
      <div className="fi-card">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Edges ({graph.edges.length})</h3>
        </div>
        {graph.edges.length === 0 ? (
          <EmptyState message="No edges in this graph" />
        ) : (
          <table className="fi-table">
            <thead>
              <tr>
                <th className="text-left">Source</th>
                <th className="text-left">Target</th>
                <th className="text-left">Label</th>
                <th className="text-left">Condition</th>
                <th className="text-left">Type</th>
                <th className="text-center">Failure</th>
              </tr>
            </thead>
            <tbody>
              {graph.edges.map((edge: GraphEdge) => {
                const src = graph.nodes.find(n => n.id === edge.source_node_id)
                const tgt = graph.nodes.find(n => n.id === edge.target_node_id)
                return (
                  <tr key={edge.id}>
                    <td className="font-medium text-slate-700">{src?.label || edge.source_node_id}</td>
                    <td className="font-medium text-slate-700">{tgt?.label || edge.target_node_id}</td>
                    <td className="text-slate-600">{edge.label || '—'}</td>
                    <td className="text-slate-600 font-mono text-xs">{edge.condition || '—'}</td>
                    <td><span className="fi-badge bg-slate-50 text-slate-600 border border-slate-200">{edge.edge_type}</span></td>
                    <td className="text-center">{edge.is_failure_path && <AlertTriangle size={12} className="text-red-500 inline" />}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


function GraphBuilderView({ graph, agents, skills, tools }: { graph: Graph; agents: Agent[]; skills: Skill[]; tools: Tool[] }) {
  const updateGraphFull = useUpdateGraphFull()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rfNodes: Node[] = graph.nodes.map((n: GraphNode) => ({
      id: n.id,
      type: 'graphNode',
      position: { x: n.position_x, y: n.position_y },
      data: {
        node_type: n.node_type,
        label: n.label,
        ref_id: n.ref_id,
        config: n.config,
        description: n.description,
        is_entry: n.is_entry,
        is_terminal: n.is_terminal,
        inputs: n.inputs,
        outputs: n.outputs,
      },
    }))
    const rfEdges: Edge[] = graph.edges.map((e: GraphEdge) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      label: e.condition || e.label || undefined,
      type: 'smoothstep',
      animated: e.is_failure_path,
      style: e.is_failure_path ? { stroke: '#ef4444', strokeDasharray: '5 3' } : undefined,
      data: { condition: e.condition, edge_type: e.edge_type, label: e.label, is_failure_path: e.is_failure_path },
    }))
    setNodes(rfNodes)
    setEdges(rfEdges)
  }, [graph.id, setNodes, setEdges])

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId])

  const onConnect = useCallback((conn: Connection) => {
    const newEdge: Edge = { ...conn, id: genEdgeId(), type: 'smoothstep', data: { edge_type: 'sequential' } } as Edge
    setEdges((eds) => addEdge(newEdge, eds))
  }, [setEdges])

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => setSelectedNodeId(node.id), [])

  const onPaneClick = useCallback(() => setSelectedNodeId(null), [])

  const onDragStart = useCallback((e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/graph-node', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('application/graph-node')
    if (!nodeType || !wrapperRef.current) return
    const bounds = wrapperRef.current.getBoundingClientRect()
    const x = e.clientX - bounds.left - 85
    const y = e.clientY - bounds.top - 30
    const paletteItem = GRAPH_NODE_PALETTE.find(p => p.type === nodeType)
    const label = paletteItem ? `${paletteItem.label} ${nodes.length + 1}` : nodeType
    const newNode: Node = { id: genNodeId(), type: 'graphNode', position: { x, y }, data: { node_type: nodeType, label, config: {} } }
    setNodes((nds) => [...nds, newNode])
    setSelectedNodeId(newNode.id)
  }, [nodes.length, setNodes])

  const handleNodeUpdate = useCallback((id: string, patch: Partial<Record<string, unknown>>) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [setNodes])

  const handleNodeDelete = useCallback((id: string) => {
    setNodes((nds) => nds.filter(n => n.id !== id))
    setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id))
    setSelectedNodeId(null)
  }, [setNodes, setEdges])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const graphNodes = nodes.map(n => {
        const d = n.data as Record<string, unknown>
        return {
          id: n.id, node_type: d.node_type, label: d.label, ref_id: d.ref_id || null,
          config: d.config || {}, position_x: n.position.x, position_y: n.position.y,
          description: d.description || '', is_entry: d.is_entry || false, is_terminal: d.is_terminal || false,
          inputs: d.inputs || [], outputs: d.outputs || [],
        }
      })
      const graphEdges = edges.map(e => {
        const d = (e.data || {}) as Record<string, unknown>
        return {
          id: e.id, source_node_id: e.source, target_node_id: e.target,
          label: (d.label as string) || '', condition: d.condition || null,
          edge_type: d.edge_type || 'sequential', is_failure_path: d.is_failure_path || false,
        }
      })
      const entryNode = graphNodes.find(n => n.is_entry)
      const terminalIds = graphNodes.filter(n => n.is_terminal).map(n => n.id)
      await updateGraphFull.mutateAsync({
        id: graph.id,
        body: { nodes: graphNodes, edges: graphEdges, entry_node_id: entryNode?.id || null, terminal_node_ids: terminalIds },
      })
      setSaveMsg({ type: 'success', text: 'Graph saved' })
    } catch (err) {
      setSaveMsg({ type: 'error', text: `Save failed: ${(err as Error).message}` })
    } finally {
      setSaving(false)
    }
  }, [graph.id, nodes, edges, updateGraphFull])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Layers size={16} className="text-forgeiq-600" />
          <span className="font-semibold text-slate-900">{graph.display_name}</span>
          <span className="fi-badge bg-slate-100 text-slate-600 border border-slate-200">{graph.version}</span>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className={`text-xs ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{saveMsg.text}</span>}
          <button onClick={handleSave} disabled={saving} className="fi-btn-secondary">
            {saving ? <Spinner size={14} /> : <Save size={14} />} Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node palette */}
        <div className="w-44 border-r border-slate-200 bg-slate-50 overflow-y-auto flex-shrink-0">
          <div className="px-3 py-2 border-b border-slate-200 bg-white">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Palette</h3>
          </div>
          <div className="p-2 space-y-1">
            {GRAPH_NODE_PALETTE.map(item => {
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
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={wrapperRef} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={graphNodeTypes}
            fitView
            defaultEdgeOptions={{ type: 'smoothstep' }}
            proOptions={{ hideAttribution: true }}
            className="bg-slate-50"
          >
            <Background gap={16} size={1} color="#cbd5e1" />
            <Controls className="!bg-white !border-slate-200" />
            <MiniMap className="!bg-white !border !border-slate-200" nodeColor="#a78bfa" maskColor="rgba(0,0,0,0.05)" />
          </ReactFlow>
        </div>

        {/* Inspector */}
        <div className="w-72 border-l border-slate-200 bg-white flex-shrink-0">
          <GraphNodeInspector
            node={selectedNode as { id: string; data: unknown } | null}
            agents={agents}
            skills={skills}
            tools={tools}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
          />
        </div>
      </div>
    </div>
  )
}


function GraphVersionsView({ graph }: { graph: Graph }) {
  const { data: versions, isLoading } = useGraphVersions(graph.id)
  const createVersion = useCreateGraphVersion()
  const publishGraph = usePublishGraph()
  const rollbackGraph = useRollbackGraph()
  const [changelog, setChangelog] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="fi-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Graph Versions</h2>
            <p className="text-sm text-slate-500 mt-0.5">{graph.display_name} - {graph.versions.length} version(s)</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="fi-btn-primary">
            <Plus size={14} /> New Version
          </button>
        </div>
        {showCreate && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Changelog description..."
              className="fi-input flex-1"
            />
            <button
              onClick={async () => {
                await createVersion.mutateAsync({ id: graph.id, body: { changelog } })
                setChangelog('')
                setShowCreate(false)
              }}
              className="fi-btn-primary"
            >
              Create
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !versions?.length ? (
        <div className="fi-card"><EmptyState message="No versions published" /></div>
      ) : (
        <div className="space-y-3">
          {versions.map((v: GraphVersion) => (
            <div key={v.id} className="fi-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200 font-mono">{v.version}</span>
                  {v.is_default && <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">Default</span>}
                  {v.published && <StatusBadge status="published" />}
                  {v.deprecated && <StatusBadge status="archived" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => publishGraph.mutate({ id: graph.id, version: v.version })}
                    className="fi-btn-secondary text-xs"
                  >
                    <FileCheck size={12} /> Publish
                  </button>
                  <button
                    onClick={() => rollbackGraph.mutate({ id: graph.id, version: v.version })}
                    className="fi-btn-secondary text-xs"
                  >
                    <RotateCcw size={12} /> Rollback
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2">{v.changelog}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span>{v.nodes.length} nodes</span>
                <span>{v.edges.length} edges</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {new Date(v.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


function GraphValidationView({ graph }: { graph: Graph }) {
  const validateMutation = useValidateGraph()
  const [result, setResult] = useState<GraphValidation | null>(null)

  const handleValidate = useCallback(() => {
    validateMutation.mutate(graph.id, {
      onSuccess: (data) => setResult(data),
    })
  }, [graph.id, validateMutation])

  useEffect(() => { handleValidate() }, [handleValidate])

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="fi-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Graph Validation</h2>
            <p className="text-sm text-slate-500 mt-0.5">{graph.display_name}</p>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <div className="flex items-center gap-2">
                {result.valid ? (
                  <span className="fi-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={11} /> Valid
                  </span>
                ) : (
                  <span className="fi-badge bg-red-50 text-red-700 border border-red-200">
                    <XCircle size={11} /> {result.errors.length} error(s)
                  </span>
                )}
                {result.warnings.length > 0 && (
                  <span className="fi-badge bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle size={11} /> {result.warnings.length} warning(s)
                  </span>
                )}
                <span className="text-xs text-slate-400">{result.node_count} nodes, {result.edge_count} edges</span>
              </div>
            )}
            <button onClick={handleValidate} disabled={validateMutation.isPending} className="fi-btn-secondary">
              {validateMutation.isPending ? <Spinner size={14} /> : <CheckCircle2 size={14} />} Re-validate
            </button>
          </div>
        </div>
      </div>

      {/* Rules checked */}
      {result?.rules_checked && (
        <div className="fi-card p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Validation Rules Checked</h3>
          <div className="grid grid-cols-3 gap-2">
            {result.rules_checked.map(rule => {
              const hasError = result.errors.some(e => e.code === rule)
              const hasWarning = result.warnings.some(w => w.code === rule)
              const passed = !hasError && !hasWarning
              return (
                <div key={rule} className={`px-3 py-2 rounded-md text-xs font-mono border ${
                  hasError ? 'bg-red-50 border-red-200 text-red-700' :
                  hasWarning ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {hasError ? <XCircle size={11} /> : hasWarning ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                    {rule.replace(/_/g, ' ')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Diagnostics */}
      <div className="fi-card">
        <div className="px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Diagnostics</h3>
        </div>
        <div className="p-3">
          {!result ? (
            <p className="text-xs text-slate-400 px-2 py-3">Validating...</p>
          ) : result.diagnostics.length === 0 ? (
            <p className="text-xs text-emerald-600 px-2 py-3 flex items-center gap-1">
              <CheckCircle2 size={12} /> No issues found. Graph is valid.
            </p>
          ) : (
            <div className="space-y-1">
              {result.diagnostics.map((d, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded text-xs ${
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
    </div>
  )
}


function GraphExecutionView({ graph }: { graph: Graph }) {
  const executeGraph = useExecuteGraph()
  const [result, setResult] = useState<GraphExecutionResult | null>(null)
  const [running, setRunning] = useState(false)

  const handleExecute = useCallback(async () => {
    setRunning(true)
    try {
      const res = await executeGraph.mutateAsync({ id: graph.id, body: { environment: graph.metadata.environment } })
      setResult(res)
    } catch {
      // ignore
    } finally {
      setRunning(false)
    }
  }, [graph.id, graph.metadata.environment, executeGraph])

  const nodeStateMap = result?.execution_state?.node_states || {}
  const activeNodeId = result?.execution_state?.active_node_id
  const completedIds = result?.execution_state?.completed_node_ids || []
  const failedIds = result?.execution_state?.failed_node_ids || []

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Play size={16} className="text-forgeiq-600" />
          <span className="font-semibold text-slate-900">{graph.display_name}</span>
          {result && (
            <span className={`fi-badge ${result.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.status}
            </span>
          )}
        </div>
        <button onClick={handleExecute} disabled={running} className="fi-btn-primary bg-emerald-600 hover:bg-emerald-700">
          {running ? <Spinner size={14} /> : <Play size={14} />} Execute Graph
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Execution visualization */}
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <ReactFlow
              nodes={graph.nodes.map((n: GraphNode) => {
                const state = nodeStateMap[n.id] || 'pending'
                return {
                  id: n.id,
                  type: 'graphNode',
                  position: { x: n.position_x, y: n.position_y },
                  data: {
                    node_type: n.node_type,
                    label: n.label,
                    ref_id: n.ref_id,
                    config: n.config,
                    is_entry: n.is_entry,
                    is_terminal: n.is_terminal,
                    execution_status: state,
                  },
                }
              })}
              edges={graph.edges.map((e: GraphEdge) => ({
                id: e.id,
                source: e.source_node_id,
                target: e.target_node_id,
                label: e.condition || e.label || undefined,
                type: 'smoothstep',
                animated: e.is_failure_path || activeNodeId === e.source_node_id,
                style: e.is_failure_path ? { stroke: '#ef4444', strokeDasharray: '5 3' } : undefined,
              }))}
              nodeTypes={graphNodeTypes}
              fitView
              defaultEdgeOptions={{ type: 'smoothstep' }}
              proOptions={{ hideAttribution: true }}
              className="bg-slate-50"
            >
              <Background gap={16} size={1} color="#cbd5e1" />
              <Controls className="!bg-white !border-slate-200" />
              <MiniMap className="!bg-white !border !border-slate-200" nodeColor="#a78bfa" maskColor="rgba(0,0,0,0.05)" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Execution state panel */}
        <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">Execution State</h3>
          </div>
          <div className="p-3 space-y-3">
            {!result ? (
              <p className="text-xs text-slate-400 px-2 py-4 text-center">Click "Execute Graph" to run and visualize execution state</p>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <div className="text-xs text-emerald-700 font-medium">Succeeded</div>
                    <div className="text-lg font-bold text-emerald-700">{completedIds.length}</div>
                  </div>
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                    <div className="text-xs text-red-700 font-medium">Failed</div>
                    <div className="text-lg font-bold text-red-700">{failedIds.length}</div>
                  </div>
                </div>

                {/* Node states */}
                <div>
                  <h4 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">Node States</h4>
                  <div className="space-y-1">
                    {graph.nodes.map((n: GraphNode) => {
                      const state = nodeStateMap[n.id] || 'pending'
                      return (
                        <div key={n.id} className="flex items-center justify-between px-2 py-1.5 rounded text-xs">
                          <span className="text-slate-700 font-medium truncate">{n.label}</span>
                          <span className={`fi-badge ${NODE_STATUS_COLORS[state] || 'bg-slate-50 text-slate-500 border border-slate-200'}`}>{state}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


function CreateGraphDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const createGraph = useCreateGraph()
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = useCallback(async () => {
    const slug = name.toLowerCase().replace(/\s+/g, '-') || 'new-graph'
    const created = await createGraph.mutateAsync({ name: slug, display_name: displayName || slug, description })
    onCreated(created.id)
    onClose()
  }, [name, displayName, description, createGraph, onCreated, onClose])

  return (
    <SideDrawer open onClose={onClose} title="Create New Graph" width="420px"
      footer={
        <>
          <button onClick={onClose} className="fi-btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={createGraph.isPending} className="fi-btn-primary">
            {createGraph.isPending ? <Spinner size={14} /> : <Plus size={14} />} Create
          </button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-graph" className="fi-input mt-1 w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Display Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My Graph" className="fi-input mt-1 w-full" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="fi-input mt-1 w-full" rows={3} />
        </div>
      </div>
    </SideDrawer>
  )
}
