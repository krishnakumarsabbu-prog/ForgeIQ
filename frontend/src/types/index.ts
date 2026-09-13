export interface Tenant {
  id: string
  name: string
  display_name: string
  plan: string
  active: boolean
  settings: Record<string, unknown>
}

export interface User {
  id: string
  tenant_id: string
  email: string
  display_name: string
  role: string
  active: boolean
}

export interface Application {
  id: string
  name: string
  display_name: string
  description: string
  type: 'greenfield' | 'brownfield'
  status: 'active' | 'archived' | 'draft'
  repository?: Repository
  technologies: string[]
  team: string
  risk_level: string
  current_version: string
  engineering_state_id?: string
  pipeline_ids: string[]
  harness_ids: string[]
  requirement_ids: string[]
  created_at: string
  updated_at: string
}

export interface Repository {
  id: string
  url: string
  branch: string
  provider: string
  default_branch: string
  discovered: boolean
  semantic_model_built: boolean
}

export interface Requirement {
  id: string
  title: string
  description: string
  application_id: string
  status: string
  priority: string
  tags: string[]
  acceptance_criteria: string[]
  assigned_pipeline_id?: string
  estimated_complexity: string
  created_at: string
}

export interface AgentContract {
  id: string
  skill_ids: string[]
  tool_ids: string[]
  model_config_id?: string
  permissions: string[]
  max_turns: number
  timeout_seconds: number
  token_budget: number
  cost_budget_cents: number
  retry_policy: Record<string, unknown>
  failure_behavior: string
  evidence_requirements: string[]
  harness_compatible: boolean
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  context_contract: Record<string, unknown>
}

export interface AgentVersion {
  id: string
  agent_id: string
  version: string
  published: boolean
  deprecated: boolean
  is_default: boolean
  contract: AgentContract
  system_instructions: string
  changelog: string
  created_at: string
}

export interface Agent {
  id: string
  name: string
  display_name: string
  category: string
  purpose: string
  role: string
  model_config_id?: string
  skill_ids: string[]
  tool_ids: string[]
  context_requirements: string[]
  permissions: string[]
  max_turns: number
  timeout_seconds: number
  token_budget: number
  cost_budget_cents: number
  retry_policy: Record<string, unknown>
  security_restrictions: string[]
  evidence_requirements: string[]
  current_version: string
  versions: AgentVersion[]
  contract: AgentContract
  system_instructions: string
  published: boolean
  tags: string[]
  created_at: string
}

export interface AgentTestEvent {
  step: number
  phase: string
  event_type: string
  message: string
  status: string
  data: Record<string, unknown>
}

export interface AgentTestResult {
  execution_id: string
  agent_id: string
  agent_name: string
  agent_version: string
  model: string
  events: AgentTestEvent[]
  output: Record<string, unknown>
  evidence: Record<string, unknown>
}

export interface AgentVersionComparison {
  version_a: AgentVersion
  version_b: AgentVersion
  differences: Record<string, boolean>
}

export interface AgentFactoryFullBody {
  display_name: string
  purpose: string
  role: string
  category: string
  system_instructions: string
  skill_ids: string[]
  tool_ids: string[]
  model_config_id?: string
  context_requirements: string[]
  permissions: string[]
  security_restrictions: string[]
  evidence_requirements: string[]
  max_turns: number
  timeout_seconds: number
  token_budget: number
  cost_budget_cents: number
  retry_policy: Record<string, unknown>
  failure_behavior: string
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  context_contract: Record<string, unknown>
}

export interface Skill {
  id: string
  name: string
  display_name: string
  category: string
  description: string
  capabilities: string[]
  language: string
  framework: string
  version: string
  agent_ids: string[]
  active: boolean
  created_at: string
}

export interface Tool {
  id: string
  name: string
  display_name: string
  description: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  allowed_operations: string[]
  supported_environments: string[]
  permissions: string[]
  timeout_seconds: number
  output_limits: Record<string, number>
  evidence_requirements: string[]
  agent_ids: string[]
  active: boolean
  category: string
  input_validation: Record<string, unknown>
  inputs_schema: Record<string, unknown>
  outputs_schema: Record<string, unknown>
  created_at: string
}

export interface ModelConfiguration {
  id: string
  name: string
  display_name: string
  provider: string
  model: string
  context_size: number
  token_limit: number
  cost_per_1k_input_cents: number
  cost_per_1k_output_cents: number
  latency_ms: number
  temperature: number
  structured_output: boolean
  capabilities: string[]
  routing: Record<string, unknown>
  fallback_model_id?: string
  availability: string
  tenant_restricted: boolean
  tenant_restrictions: string[]
  active: boolean
  max_concurrent: number
  created_at: string
}

export interface GraphNode {
  id: string
  node_type: string
  label: string
  ref_id?: string
  config: Record<string, unknown>
  position_x: number
  position_y: number
  description: string
  is_entry: boolean
  is_terminal: boolean
  inputs: string[]
  outputs: string[]
}

export interface GraphEdge {
  id: string
  source_node_id: string
  target_node_id: string
  label: string
  condition?: string
  edge_type: string
  is_failure_path: boolean
}

export interface GraphMetadata {
  inputs: string[]
  outputs: string[]
  environment: string
  failure_path_enabled: boolean
  approval_path_enabled: boolean
  execution_context: Record<string, unknown>
  dependencies: string[]
  conditions: string[]
}

export interface GraphVersion {
  id: string
  graph_id: string
  version: string
  published: boolean
  is_default: boolean
  deprecated: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: GraphMetadata
  changelog: string
  created_at: string
}

export interface Graph {
  id: string
  name: string
  display_name: string
  description: string
  version: string
  published: boolean
  is_default: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
  harness_id?: string
  metadata: GraphMetadata
  versions: GraphVersion[]
  entry_node_id?: string
  terminal_node_ids: string[]
  created_at: string
}

export interface GraphDiagnostic {
  severity: 'error' | 'warning'
  code: string
  message: string
  node_id?: string
  edge_id?: string
}

export interface GraphValidation {
  valid: boolean
  errors: GraphDiagnostic[]
  warnings: GraphDiagnostic[]
  diagnostics: GraphDiagnostic[]
  node_count: number
  edge_count: number
  rules_checked?: string[]
}

export interface GraphExecutionState {
  graph_id: string
  execution_id: string
  node_states: Record<string, string>
  active_node_id?: string
  completed_node_ids: string[]
  failed_node_ids: string[]
  skipped_node_ids: string[]
  blocked_node_ids: string[]
  status: string
  started_at?: string
  completed_at?: string
  iteration: number
}

export interface GraphExecutionResult {
  execution_id: string
  status: string
  nodes_executed: number
  results: Record<string, unknown>
  execution_state: GraphExecutionState
}

export interface GraphSerialization {
  graph_id: string
  name: string
  display_name: string
  version: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: GraphMetadata
  entry_node_id?: string
  terminal_node_ids: string[]
}

export interface LoopStep {
  id: string
  step_type: string
  label: string
  description: string
  config: Record<string, unknown>
  next_step_id?: string
  branch_true_id?: string
  branch_false_id?: string
  position_x: number
  position_y: number
}

export interface LoopIterationRecord {
  iteration: number
  attempt: number
  trigger: string
  evaluation_result: Record<string, unknown>
  decision: string
  action: string
  action_result: Record<string, unknown>
  exit_reason: string
  timestamp: string
}

export interface Loop {
  id: string
  name: string
  display_name: string
  loop_type: string
  trigger: string
  entry_condition?: string
  evaluation: string
  action: string
  max_iterations: number
  backoff_strategy: string
  backoff_initial_ms: number
  backoff_max_ms: number
  cost_limit_cents: number
  time_limit_seconds: number
  retry_policy: Record<string, unknown>
  exit_condition: string
  failure_handling: string
  escalation: string
  harness_id?: string
  is_default: boolean
  steps: LoopStep[]
  evidence_requirements: string[]
  execution_history: LoopIterationRecord[]
  version: string
  published: boolean
  created_at: string
}

export interface HarnessVersion {
  id: string
  harness_id: string
  version: string
  published: boolean
  is_default: boolean
  deprecated?: boolean
  is_immutable?: boolean
  published_at?: string
  graph_id?: string
  graph_version?: string
  loop_ids: string[]
  loop_versions?: string[]
  agent_ids: string[]
  agent_contract_versions?: string[]
  skill_ids: string[]
  tool_ids: string[]
  model_config_ids: string[]
  policy_ids: string[]
  policy_versions?: string[]
  environment: string
  cost_limit_cents: number
  time_limit_seconds: number
  approval_required: boolean
  changelog: string
  created_at: string
}

export interface Harness {
  id: string
  name: string
  display_name: string
  purpose: string
  harness_type: string
  inputs: string[]
  outputs: string[]
  context: Record<string, unknown>
  graph_id?: string
  loop_ids: string[]
  agent_ids: string[]
  skill_ids: string[]
  tool_ids: string[]
  model_config_ids: string[]
  policy_ids: string[]
  permissions: string[]
  environment: string
  execution_rules: Record<string, unknown>
  retry_rules: Record<string, unknown>
  failure_rules: Record<string, unknown>
  approval_rules: Record<string, unknown>
  escalation_rules: Record<string, unknown>
  cost_limit_cents: number
  time_limit_seconds: number
  approval_required: boolean
  evidence_requirements: string[]
  current_version: string
  versions: HarnessVersion[]
  template_id?: string
  template_version?: string
  published: boolean
  application_id?: string
  tags: string[]
  lifecycle: string
  deprecated: boolean
  archived: boolean
  last_published_at?: string
  created_at: string
}

export interface HarnessVersionComparison {
  version_a: HarnessVersion
  version_b: HarnessVersion
  differences: Record<string, boolean>
  detailed_diff: Record<string, { version_a: unknown; version_b: unknown }>
  resolved: {
    version_a: {
      graph: { id: string; name: string } | null
      agents: { id: string; name: string }[]
      tools: { id: string; name: string }[]
      skills: { id: string; name: string }[]
      loops: { id: string; name: string }[]
      policies: { id: string; name: string }[]
      models: { id: string; name: string }[]
    }
    version_b: {
      graph: { id: string; name: string } | null
      agents: { id: string; name: string }[]
      tools: { id: string; name: string }[]
      skills: { id: string; name: string }[]
      loops: { id: string; name: string }[]
      policies: { id: string; name: string }[]
      models: { id: string; name: string }[]
    }
  }
}

export interface HarnessTemplateVersion {
  id: string
  template_id: string
  version: string
  published: boolean
  is_default: boolean
  deprecated: boolean
  is_immutable: boolean
  mandatory_steps: string[]
  optional_steps: string[]
  configurable: string[]
  tenant_override_allowed: boolean
  tenant_override_forbidden: string[]
  default_config: Record<string, unknown>
  changelog: string
  created_at: string
}

export interface HarnessTemplate {
  id: string
  name: string
  display_name: string
  description: string
  harness_type: string
  inheritance_level: string
  parent_template_id?: string
  mandatory_steps: string[]
  optional_steps: string[]
  configurable: string[]
  tenant_override_allowed: boolean
  tenant_override_forbidden: string[]
  default_config: Record<string, unknown>
  current_version: string
  versions: HarnessTemplateVersion[]
  published: boolean
  deprecated: boolean
  last_published_at?: string
  created_at: string
}

export interface HarnessTemplateComparison {
  version_a: HarnessTemplateVersion
  version_b: HarnessTemplateVersion
  differences: Record<string, boolean>
  detailed_diff: Record<string, { version_a: unknown; version_b: unknown }>
}

export interface TemplateInheritanceChain {
  template_id: string
  chain: Array<{
    id: string
    name: string
    inheritance_level: string
    mandatory_steps: string[]
    tenant_override_allowed: boolean
    tenant_override_forbidden: string[]
    current_version: string
    published: boolean
  }>
  depth: number
  governance_enforced: boolean
}

export interface StageConfig {
  harness_version?: string
  input_mapping: Record<string, unknown>
  output_mapping: Record<string, unknown>
  environment?: string
  conditions: string[]
  failure_strategy: string
  approval_required: boolean
  timeout_seconds?: number
  parallel_stage_ids: string[]
}

export interface PipelineStage {
  id: string
  name: string
  stage_type: string
  harness_id?: string
  order: number
  condition?: string
  required: boolean
  parallel_with: string[]
  config: StageConfig
}

export interface PipelineVersion {
  id: string
  pipeline_id: string
  version: string
  published: boolean
  is_default: boolean
  is_immutable: boolean
  stages: PipelineStage[]
  changelog: string
  published_at?: string
  created_at: string
}

export interface Pipeline {
  id: string
  name: string
  display_name: string
  description: string
  application_id?: string
  stages: PipelineStage[]
  current_version: string
  versions: PipelineVersion[]
  published: boolean
  active: boolean
  tags: string[]
  template_id?: string
  template_version?: string
  created_at: string
}

export interface PipelineTemplateVersion {
  id: string
  template_id: string
  version: string
  published: boolean
  is_default: boolean
  is_immutable: boolean
  stage_definitions: Record<string, unknown>[]
  changelog: string
  published_at?: string
  created_at: string
}

export interface PipelineTemplate {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  stage_definitions: Record<string, unknown>[]
  current_version: string
  versions: PipelineTemplateVersion[]
  published: boolean
  deprecated: boolean
  last_published_at?: string
  created_at: string
}

export interface ExecutionEvent {
  id: string
  execution_id: string
  event_type: string
  timestamp: string
  node_id?: string
  agent_id?: string
  tool_id?: string
  harness_id?: string
  pipeline_id?: string
  message: string
  data: Record<string, unknown>
}

export interface Execution {
  id: string
  pipeline_id?: string
  harness_id?: string
  application_id?: string
  requirement_id?: string
  status: string
  started_at?: string
  completed_at?: string
  trigger: string
  trigger_reason: string
  current_stage?: string
  current_node?: string
  events: ExecutionEvent[]
  evidence_ids: string[]
  approval_ids: string[]
  cost_cents: number
  tokens_used: number
  retry_count: number
  error_message?: string
  progress: number
  result: Record<string, unknown>
  created_at: string
}

export interface Approval {
  id: string
  execution_id: string
  status: string
  requested_by: string
  requested_at: string
  decided_by?: string
  decided_at?: string
  reason: string
  risk_level: string
}

export interface Policy {
  id: string
  name: string
  display_name: string
  description: string
  policy_type: string
  scope: string
  target_id?: string
  rules: Record<string, unknown>[]
  enforcement: string
  active: boolean
  priority: number
  created_at: string
}

export interface Evidence {
  id: string
  execution_id: string
  evidence_type: string
  agent_id?: string
  agent_version?: string
  model_used?: string
  harness_id?: string
  harness_version?: string
  tool_id?: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  code_changes: Record<string, unknown>[]
  test_results: Record<string, unknown>
  security_results: Record<string, unknown>
  policies_applied: string[]
  timestamp: string
  hash: string
  summary: string
}

export interface EngineeringDecision {
  id: string
  application_id: string
  decision: string
  rationale: string
  decided_by: string
  impact: string
  tags: string[]
  created_at: string
}

export interface EngineeringState {
  id: string
  application_id: string
  repository: string
  branch: string
  commit: string
  version: string
  architecture: Record<string, unknown>
  technologies: string[]
  dependencies: Record<string, unknown>[]
  apis: Record<string, unknown>[]
  tests: Record<string, unknown>
  security: Record<string, unknown>
  build: Record<string, unknown>
  release: Record<string, unknown>
  deployment: Record<string, unknown>
  known_issues: Record<string, unknown>[]
  open_changes: Record<string, unknown>[]
  evidence_ids: string[]
  decisions: EngineeringDecision[]
  last_updated: string
  health_score: number
  coverage_pct: number
  security_findings: number
  open_vulnerabilities: number
}

export interface Environment {
  id: string
  name: string
  display_name: string
  env_type: string
  application_id?: string
  cluster: string
  region: string
  protected: boolean
  requires_approval: boolean
  active: boolean
}

export interface Artifact {
  id: string
  application_id: string
  name: string
  version: string
  type: string
  hash: string
  registry: string
  size_bytes: number
  tags: string[]
}

export interface Deployment {
  id: string
  application_id: string
  environment_id: string
  artifact_id?: string
  version: string
  status: string
  strategy: string
  started_at?: string
  completed_at?: string
  verified: boolean
  verification_results: Record<string, unknown>
  rollback_supported: boolean
  health_checks: Record<string, unknown>[]
}

export interface ActiveExecution {
  id: string
  status: string
  progress: number
  application: string
  application_id?: string
  pipeline: string
  pipeline_id?: string
  harness: string
  harness_id?: string
  current_stage: string
  agent: string
  duration_seconds: number
  retries: number
  cost_cents: number
  started_at?: string
  tokens: number
}

export interface ActivityFeedItemData {
  id: string
  event_type: string
  message: string
  timestamp: string
  application: string
  execution_id: string
}

export interface PipelineHealthItem {
  id: string
  name: string
  application: string
  runs: number
  success: number
  failures: number
  avg_duration_seconds: number
  last_run: string
}

export interface EconomicsBreakdown {
  ai_spend_cents: number
  total_tokens: number
  execution_time_seconds: number
  retry_cost_cents: number
  cost_by_agent: Array<{ name: string; cost_cents: number }>
  cost_by_application: Array<{ name: string; cost_cents: number }>
}

export interface SecurityQualityData {
  open_vulnerabilities: number
  failed_tests: number
  build_failures: number
  high_risk_changes: number
  pending_approvals: number
  security_findings: number
}

export interface RecentApplicationItem {
  id: string
  name: string
  type: string
  technology: string
  environment: string
  last_commit: string
  engineering_state: string
  last_execution: string
  status: string
}

export interface DashboardData {
  counts: Record<string, number>
  execution_status: Record<string, number>
  economics: {
    total_tokens: number
    total_cost_cents: number
    total_cost_dollars: number
  }
  quality: {
    avg_health_score: number
    avg_coverage_pct: number
    total_security_findings: number
    total_open_vulnerabilities: number
  }
  active_executions: ActiveExecution[]
  activity_feed: ActivityFeedItemData[]
  pipeline_health: PipelineHealthItem[]
  economics_breakdown: EconomicsBreakdown
  security_quality: SecurityQualityData
  recent_applications: RecentApplicationItem[]
  success_rate: number
  throughput: number
  recent_executions: Array<{
    id: string
    status: string
    progress: number
    application: string
    pipeline: string
    started_at?: string
    completed_at?: string
    tokens_used: number
    cost_cents: number
    retry_count: number
    error_message?: string
  }>
  applications_overview: Array<{
    id: string
    name: string
    type: string
    risk_level: string
    version: string
    technologies: string[]
    team: string
    pipelines: number
    requirements: number
  }>
}
