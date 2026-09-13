import { useState } from 'react'
import { Network, Share2, ChevronRight } from 'lucide-react'
import { useGraphs } from '../hooks/useQueries'
import { PageHeader, StatusBadge, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Graph, GraphNode, GraphEdge } from '../types'

const NODE_TYPE_COLORS: Record<string, string> = {
  agent: 'bg-forgeiq-50 text-forgeiq-700 border-forgeiq-200',
  tool: 'bg-blue-50 text-blue-700 border-blue-200',
  skill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  loop: 'bg-amber-50 text-amber-700 border-amber-200',
  decision: 'bg-orange-50 text-orange-700 border-orange-200',
  start: 'bg-slate-100 text-slate-700 border-slate-300',
  end: 'bg-slate-100 text-slate-700 border-slate-300',
}

export default function GraphEngineeringPage() {
  const { data: graphs, isLoading } = useGraphs()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedGraph: Graph | undefined = (graphs || []).find((g) => g.id === selectedId)

  return (
    <div>
      <PageHeader
        title="Graph Engineering"
        description="Visual execution graphs composed of nodes and edges"
      />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar: graph list */}
        <div className="w-72 border-r border-slate-200 bg-slate-50 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-semibold text-slate-900">Graphs</h3>
          </div>
          {isLoading ? (
            <LoadingSpinner />
          ) : !graphs?.length ? (
            <div className="p-4">
              <EmptyState message="No graphs defined" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {graphs.map((g: Graph) => (
                <li
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`px-4 py-2.5 cursor-pointer transition-colors ${
                    selectedId === g.id ? 'bg-white border-l-2 border-l-forgeiq-600' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {g.display_name || g.name}
                    </span>
                  </div>
                  <div className="ml-5.5 flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">v{g.version}</span>
                    <StatusBadge status={g.published ? 'published' : 'draft'} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail: nodes and edges */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedGraph ? (
            <div className="fi-card">
              <EmptyState message="Select a graph to view its nodes and edges" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Graph header */}
              <div className="fi-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {selectedGraph.display_name || selectedGraph.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedGraph.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">v{selectedGraph.version}</span>
                    <StatusBadge status={selectedGraph.published ? 'published' : 'draft'} />
                    {selectedGraph.is_default && (
                      <span className="fi-badge bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nodes Table */}
              <div className="fi-card">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Nodes ({selectedGraph.nodes.length})
                  </h3>
                </div>
                {selectedGraph.nodes.length === 0 ? (
                  <EmptyState message="No nodes in this graph" />
                ) : (
                  <table className="fi-table">
                    <thead>
                      <tr>
                        <th className="text-left">Label</th>
                        <th className="text-left">Type</th>
                        <th className="text-left">Ref ID</th>
                        <th className="text-right">Position X</th>
                        <th className="text-right">Position Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGraph.nodes.map((node: GraphNode) => (
                        <tr key={node.id}>
                          <td className="font-medium text-slate-900">{node.label}</td>
                          <td>
                            <span
                              className={`fi-badge ${
                                NODE_TYPE_COLORS[node.node_type] ||
                                'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {node.node_type}
                            </span>
                          </td>
                          <td className="text-slate-600 font-mono text-xs">
                            {node.ref_id || '—'}
                          </td>
                          <td className="text-right text-slate-600 font-mono text-xs">
                            {node.position_x.toFixed(0)}
                          </td>
                          <td className="text-right text-slate-600 font-mono text-xs">
                            {node.position_y.toFixed(0)}
                          </td>
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
                  <h3 className="text-sm font-semibold text-slate-900">
                    Edges ({selectedGraph.edges.length})
                  </h3>
                </div>
                {selectedGraph.edges.length === 0 ? (
                  <EmptyState message="No edges in this graph" />
                ) : (
                  <table className="fi-table">
                    <thead>
                      <tr>
                        <th className="text-left">Source</th>
                        <th className="text-left">Target</th>
                        <th className="text-left">Label</th>
                        <th className="text-left">Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGraph.edges.map((edge: GraphEdge) => {
                        const sourceNode = selectedGraph.nodes.find((n) => n.id === edge.source_node_id)
                        const targetNode = selectedGraph.nodes.find((n) => n.id === edge.target_node_id)
                        return (
                          <tr key={edge.id}>
                            <td className="font-medium text-slate-700">
                              {sourceNode?.label || edge.source_node_id}
                            </td>
                            <td className="font-medium text-slate-700">
                              {targetNode?.label || edge.target_node_id}
                            </td>
                            <td className="text-slate-600">{edge.label || '—'}</td>
                            <td className="text-slate-600 font-mono text-xs">
                              {edge.condition || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
