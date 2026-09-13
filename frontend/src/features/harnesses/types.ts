export type GraphNodeType = string

export interface BuilderNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    node_type: string
    label: string
    ref_id?: string
    config: Record<string, unknown>
    description?: string
    validationErrors?: string[]
  }
}

export interface BuilderEdge {
  id: string
  source: string
  target: string
  label?: string
  condition?: string
  edge_type: string
}

export interface HarnessConfig {
  name: string
  display_name: string
  purpose: string
  harness_type: string
  environment: string
  inputs: string[]
  outputs: string[]
  context: Record<string, unknown>
  permissions: string[]
  policy_ids: string[]
  loop_ids: string[]
  agent_ids: string[]
  skill_ids: string[]
  tool_ids: string[]
  model_config_ids: string[]
  retry_rules: Record<string, unknown>
  failure_rules: Record<string, unknown>
  approval_rules: Record<string, unknown>
  escalation_rules: Record<string, unknown>
  execution_rules: Record<string, unknown>
  cost_limit_cents: number
  time_limit_seconds: number
  approval_required: boolean
  evidence_requirements: string[]
}
