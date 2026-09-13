import { useMemo, useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge, type NodeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Graph, GraphNode, GraphEdge, ExecutionEvent } from '../../types'
import { executionNodeTypes } from './executionGraphNodeTypes'

interface LiveExecutionGraphProps {
  graph: Graph | null | undefined
  events: ExecutionEvent[]
  onNodeClick?: (nodeId: string) => void
  selectedNodeId?: string
}

function getNodeStatusFromEvents(nodeId: string, events: ExecutionEvent[]): string {
  const nodeEvents = events.filter(e => e.node_id === nodeId)
  if (nodeEvents.length === 0) return 'pending'

  const types = nodeEvents.map(e => e.event_type)
  if (types.includes('GRAPH_NODE_COMPLETED')) {
    const completedEvent = nodeEvents.find(e => e.event_type === 'GRAPH_NODE_COMPLETED')
    const success = completedEvent?.data?.success
    return success === false ? 'failed' : 'succeeded'
  }
  if (types.includes('GRAPH_NODE_STARTED')) return 'running'
  if (types.includes('LOOP_TRIGGERED') || types.includes('RETRY_STARTED')) return 'retrying'
  if (types.includes('APPROVAL_REQUESTED')) return 'waiting'
  if (types.some(t => t.includes('FAILED'))) return 'failed'
  return 'pending'
}

export function LiveExecutionGraph({ graph, events, onNodeClick, selectedNodeId }: LiveExecutionGraphProps) {
  const nodes = useMemo<Node[]>(() => {
    if (!graph?.nodes) return []
    return graph.nodes.map((gn: GraphNode) => {
      const status = getNodeStatusFromEvents(gn.id, events)
      return {
        id: gn.id,
        type: 'execNode',
        position: { x: gn.position_x, y: gn.position_y },
        data: {
          node_type: gn.node_type,
          label: gn.label,
          ref_id: gn.ref_id,
          execution_status: status,
          is_entry: gn.is_entry,
          is_terminal: gn.is_terminal,
        } as unknown as Record<string, unknown>,
        selected: selectedNodeId === gn.id,
      }
    })
  }, [graph, events, selectedNodeId])

  const edges = useMemo<Edge[]>(() => {
    if (!graph?.edges) return []
    return graph.edges.map((ge: GraphEdge) => {
      const sourceStatus = getNodeStatusFromEvents(ge.source_node_id, events)
      const targetStatus = getNodeStatusFromEvents(ge.target_node_id, events)
      const isActive = sourceStatus === 'running' || sourceStatus === 'succeeded'
      const isFailure = ge.is_failure_path

      let edgeClass = 'react-flow__edge-path'
      let animated = false

      if (isFailure) {
        edgeClass += ' react-flow__edge-path-failure'
      }
      if (isActive && targetStatus === 'running') {
        animated = true
      }

      return {
        id: ge.id,
        source: ge.source_node_id,
        target: ge.target_node_id,
        label: ge.label || undefined,
        animated,
        className: isFailure ? 'forgeiq-edge-failure' : '',
        style: {
          stroke: isFailure ? '#ef4444' : isActive ? '#3b82f6' : '#cbd5e1',
          strokeWidth: isActive ? 2 : 1.5,
        },
        type: 'smoothstep',
      }
    })
  }, [graph, events])

  const handleNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    onNodeClick?.(node.id)
  }, [onNodeClick])

  if (!graph) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        No graph associated with this execution
      </div>
    )
  }

  if (!graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Graph has no nodes
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <style>{`
        .react-flow__edge-path-failure {
          stroke-dasharray: 5 5;
        }
        .react-flow__attribution {
          display: none;
        }
        .react-flow__minimap {
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .react-flow__controls {
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .react-flow__controls button {
          border-color: #e2e8f0;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={executionNodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const status = (n.data as unknown as { execution_status?: string })?.execution_status
            switch (status) {
              case 'running': return '#3b82f6'
              case 'succeeded': return '#10b981'
              case 'failed': return '#ef4444'
              case 'retrying': return '#eab308'
              case 'waiting': return '#f59e0b'
              case 'blocked': return '#f87171'
              default: return '#cbd5e1'
            }
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
          style={{ background: '#f8fafc' }}
        />
      </ReactFlow>
    </div>
  )
}
