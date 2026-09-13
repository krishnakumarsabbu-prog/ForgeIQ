import type { ExecutionEvent } from '../../types'

export interface TreeNode {
  id: string
  type: 'pipeline' | 'harness' | 'graph' | 'node' | 'agent' | 'tool'
  refId?: string
  label: string
  status: string
  events: ExecutionEvent[]
  children: TreeNode[]
  parent?: TreeNode
  depth: number
}

function inferStatus(events: ExecutionEvent[]): string {
  const types = events.map(e => e.event_type)
  if (types.includes('EXECUTION_FAILED') || types.includes('PIPELINE_COMPLETED')) return 'completed'
  if (types.some(t => t.includes('STARTED')) && !types.some(t => t.includes('COMPLETED'))) return 'running'
  if (types.includes('GRAPH_NODE_COMPLETED')) return 'succeeded'
  if (types.includes('GRAPH_NODE_STARTED') && !types.includes('GRAPH_NODE_COMPLETED')) return 'running'
  if (types.includes('LOOP_TRIGGERED') || types.includes('RETRY_STARTED')) return 'retrying'
  if (types.includes('APPROVAL_REQUESTED')) return 'waiting'
  if (types.includes('TOOL_REQUESTED') && !types.includes('TOOL_EXECUTED')) return 'running'
  return 'pending'
}

function getLabel(type: string, event: ExecutionEvent): string {
  const data = event.data || {}
  switch (type) {
    case 'pipeline':
      return (data.pipeline_name as string) || `Pipeline ${event.pipeline_id?.slice(0, 8) || ''}`
    case 'harness':
      return (data.harness_name as string) || (data.harness_type as string) || `Harness ${event.harness_id?.slice(0, 8) || ''}`
    case 'graph':
      return (data.graph_name as string) || `Graph ${event.node_id?.slice(0, 8) || ''}`
    case 'node':
      return (data.node_label as string) || (data.node_type as string) || `Node ${event.node_id?.slice(0, 8) || ''}`
    case 'agent':
      return (data.agent_name as string) || `Agent ${event.agent_id?.slice(0, 8) || ''}`
    case 'tool':
      return (data.tool_name as string) || (data.operation as string) || `Tool ${event.tool_id?.slice(0, 8) || ''}`
    default:
      return type
  }
}

export function buildExecutionTree(events: ExecutionEvent[]): TreeNode {
  const root: TreeNode = {
    id: 'root',
    type: 'pipeline',
    label: 'Execution',
    status: 'pending',
    events: [],
    children: [],
    depth: 0,
  }

  const pipelineEvents = events.filter(e => e.event_type.includes('PIPELINE') || (!e.harness_id && !e.node_id && !e.agent_id && !e.tool_id))
  const harnessMap = new Map<string, ExecutionEvent[]>()
  const nodeMap = new Map<string, ExecutionEvent[]>()
  const agentMap = new Map<string, ExecutionEvent[]>()
  const toolMap = new Map<string, ExecutionEvent[]>()

  for (const ev of events) {
    if (ev.harness_id) {
      if (!harnessMap.has(ev.harness_id)) harnessMap.set(ev.harness_id, [])
      harnessMap.get(ev.harness_id)!.push(ev)
    }
    if (ev.node_id) {
      const key = ev.node_id
      if (!nodeMap.has(key)) nodeMap.set(key, [])
      nodeMap.get(key)!.push(ev)
    }
    if (ev.agent_id) {
      if (!agentMap.has(ev.agent_id)) agentMap.set(ev.agent_id, [])
      agentMap.get(ev.agent_id)!.push(ev)
    }
    if (ev.tool_id) {
      if (!toolMap.has(ev.tool_id)) toolMap.set(ev.tool_id, [])
      toolMap.get(ev.tool_id)!.push(ev)
    }
  }

  root.events = pipelineEvents
  root.status = inferStatus(pipelineEvents)
  if (pipelineEvents.length > 0) {
    root.label = getLabel('pipeline', pipelineEvents[0])
  }

  for (const [harnessId, hEvents] of harnessMap) {
    const harnessNode: TreeNode = {
      id: `harness-${harnessId}`,
      type: 'harness',
      refId: harnessId,
      label: getLabel('harness', hEvents[0]),
      status: inferStatus(hEvents),
      events: hEvents,
      children: [],
      parent: root,
      depth: 1,
    }

    const harnessNodeEvents = nodeMap.size > 0
      ? Array.from(nodeMap.entries()).filter(([, evs]) => evs.some(e => e.harness_id === harnessId))
      : []

    for (const [nodeId, nEvents] of harnessNodeEvents) {
      const nodeNode: TreeNode = {
        id: `node-${nodeId}`,
        type: 'node',
        refId: nodeId,
        label: getLabel('node', nEvents[0]),
        status: inferStatus(nEvents),
        events: nEvents,
        children: [],
        parent: harnessNode,
        depth: 2,
      }

      const nodeAgentEvents = Array.from(agentMap.entries()).filter(([, evs]) => evs.some(e => e.node_id === nodeId))
      for (const [agentId, aEvents] of nodeAgentEvents) {
        const agentNode: TreeNode = {
          id: `agent-${agentId}`,
          type: 'agent',
          refId: agentId,
          label: getLabel('agent', aEvents[0]),
          status: inferStatus(aEvents),
          events: aEvents,
          children: [],
          parent: nodeNode,
          depth: 3,
        }

        const agentToolEvents = Array.from(toolMap.entries()).filter(([, evs]) => evs.some(e => e.agent_id === agentId || e.node_id === nodeId))
        for (const [toolId, tEvents] of agentToolEvents) {
          const toolNode: TreeNode = {
            id: `tool-${toolId}`,
            type: 'tool',
            refId: toolId,
            label: getLabel('tool', tEvents[0]),
            status: inferStatus(tEvents),
            events: tEvents,
            children: [],
            parent: agentNode,
            depth: 4,
          }
          agentNode.children.push(toolNode)
        }

        nodeNode.children.push(agentNode)
      }

      harnessNode.children.push(nodeNode)
    }

    root.children.push(harnessNode)
  }

  return root
}

export function flattenTree(node: TreeNode, expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = [node]
  if (expanded.has(node.id) || node.depth === 0) {
    for (const child of node.children) {
      result.push(...flattenTree(child, expanded))
    }
  }
  return result
}

export function findNodeByRefId(node: TreeNode, refId: string): TreeNode | null {
  if (node.refId === refId) return node
  for (const child of node.children) {
    const found = findNodeByRefId(child, refId)
    if (found) return found
  }
  return null
}
