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
  routing_tags: string[]
  tier: string
  fallback_model_id?: string
  availability: string
  tenant_restricted: boolean
  tenant_restrictions: string[]
  security_approved: boolean
  enterprise_approved: boolean
  active: boolean
  max_concurrent: number
  created_at: string
  model_name?: string
  context_window?: number
  cost_per_1k_input_tokens?: number
  cost_per_1k_output_tokens?: number
  max_tokens?: number
}

export interface ModelUsageRecord {
  id: string
  model_id: string
  model_name: string
  provider: string
  agent_id: string
  execution_id: string
  node_id: string
  task: string
  input_tokens: number
  output_tokens: number
  cost_cents: number
  latency_ms: number
  success: boolean
  error: string
  fallback_used: boolean
  original_model_id: string
  timestamp: string
}

export interface ModelUsageStats {
  total_invocations: number
  successful: number
  failed: number
  fallbacks_used: number
  total_tokens: number
  total_cost_cents: number
  by_model: Record<string, { invocations: number; tokens: number; cost_cents: number; failures: number }>
  by_provider: Record<string, { invocations: number; tokens: number; cost_cents: number }>
}

export interface ModelProviderStatus {
  provider: string
  configured: boolean
  model_count: number
  active_models: number
}

export interface RoutingDecision {
  model: ModelConfiguration | null
  fallback_used: boolean
  original_model_id: string
  reason: string
  factors_evaluated: string[]
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
  name?: string
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
  description?: string
  loop_type: string
  trigger: string
  trigger_event?: string
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
  stages?: unknown[]
  built_in?: boolean
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
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'escalated'
  approval_type: 'code_change' | 'security_exception' | 'production_deployment' | 'high_risk_change' | 'release' | 'policy_override' | 'failure_escalation' | 'human_task'
  requested_by: string
  requested_at: string
  decided_by?: string
  decided_at?: string
  decision?: string
  reason: string
  risk_level: string
  requested_action: string
  impact: string
  evidence_id?: string
  escalated_to?: string
  escalated_from_id?: string
  node_id?: string
  harness_id?: string
  pipeline_id?: string
  application_id?: string
  checkpoint_node_id?: string
  checkpoint_harness_id?: string
  checkpoint_pipeline_id?: string
  tenant_id: string
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
  enabled?: boolean
  stage?: string
  priority: number
  created_at: string
}

export interface Evidence {
  id: string
  tenant_id: string
  application_id?: string
  requirement_id?: string
  execution_id: string
  pipeline_id?: string
  pipeline_version?: string
  harness_id?: string
  harness_version?: string
  graph_id?: string
  graph_version?: string
  loop_id?: string
  loop_iteration?: number
  node_id?: string
  agent_id?: string
  agent_version?: string
  model_used?: string
  model_provider?: string
  context_reference?: string
  tool_id?: string
  tool_operation?: string
  evidence_type: string
  status: string
  environment: string
  summary: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  input_hash: string
  output_reference: string
  code_changes: Record<string, unknown>[]
  test_results: Record<string, unknown>
  security_results: Record<string, unknown>
  build_results: Record<string, unknown>
  release_results: Record<string, unknown>
  approvals: Record<string, unknown>[]
  policies_applied: string[]
  policy_decisions: Record<string, unknown>[]
  deployment: Record<string, unknown>
  verification: Record<string, unknown>
  timestamp: string
  hash: string
  immutable: boolean
  previous_evidence_id?: string
  created_at: string
}

export interface EvidenceStats {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  by_agent: Record<string, number>
  by_application: Record<string, number>
  by_environment: Record<string, number>
}

export interface EvidenceChainVerification {
  execution_id: string
  total: number
  verified: number
  broken: number
  chain_intact: boolean
}

export interface EvidenceTypeOption {
  types: { value: string; label: string }[]
  statuses: { value: string; label: string }[]
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

export interface StateChangeRecord {
  id: string
  application_id: string
  state_id: string
  change_type: string
  description: string
  before_value: string | null
  after_value: string | null
  category: string
  severity: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface EngineeringStateContext {
  found: boolean
  application_id: string
  query: string
  version: string
  health_score: number
  coverage_pct: number
  architecture: Record<string, unknown>
  technologies: string[]
  relevant_apis: Record<string, unknown>[]
  relevant_dependencies: Record<string, unknown>[]
  relevant_known_issues: Record<string, unknown>[]
  relevant_open_changes: Record<string, unknown>[]
  relevant_decisions: EngineeringDecision[]
  relevant_evidence: Array<{ id: string; type: string; summary: string; timestamp: string }>
  recent_changes: Array<{ change_type: string; description: string; severity: string; timestamp: string }>
  security_summary: { findings: number; open_vulnerabilities: number; last_scan: string }
  build_summary: { status: string; last_build: string }
  deployment_summary: { environment: string; last_deploy: string }
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
  runtime: Record<string, unknown>
  known_issues: Record<string, unknown>[]
  open_changes: Record<string, unknown>[]
  evidence_ids: string[]
  decisions: EngineeringDecision[]
  change_history_ids: string[]
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

export interface PrecheckResult {
  name: string
  status: string
  message: string
  timestamp: string
}

export interface PostcheckResult {
  name: string
  status: string
  message: string
  timestamp: string
}

export interface RollbackResult {
  status: string
  previous_version: string
  message: string
  completed_at?: string
}

export interface VerificationCheck {
  verification_type: string
  status: string
  expected_state: Record<string, unknown>
  observed_state: Record<string, unknown>
  message: string
  duration_ms: number
  timestamp: string
}

export interface VerificationResult {
  overall_status: string
  checks: VerificationCheck[]
  passed: number
  failed: number
  warning: number
  skipped: number
  timestamp: string
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
  prechecks: PrecheckResult[]
  postchecks: PostcheckResult[]
  verification?: VerificationResult
  rollback_result?: RollbackResult
  previous_deployment_id?: string
  evidence_ids: string[]
  error_message?: string
  metadata: Record<string, unknown>
  artifact_version?: string
  deployed_at?: string
}

export interface CreateDeploymentResponse {
  deployment: Deployment
  execution_result: {
    status: string
    stage: string
    deployment_id: string
    verification?: Record<string, unknown>
    rollback?: Record<string, unknown>
  }
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

export interface PlanStage {
  id: string
  stage_type: string
  label: string
  harness_id?: string
  harness_name: string
  agent_ids: string[]
  agent_names: string[]
  skill_names: string[]
  tool_names: string[]
  environment: string
  approval_required: boolean
  description: string
  order: number
  status: string
}

export interface BrownfieldPhase {
  name: string
  label: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  started_at?: string
  completed_at?: string
  findings: Record<string, unknown>[]
  warnings: string[]
  errors: string[]
  artifacts: string[]
  summary: string
}

export interface BrownfieldImportConfig {
  repository_url: string
  branch: string
  provider: string
  access_token?: string
  application_name: string
  application_display_name: string
  team: string
  tenant_id: string
}

export interface BrownfieldImport {
  id: string
  config: BrownfieldImportConfig
  status: 'pending' | 'running' | 'completed' | 'failed'
  application_id?: string
  engineering_state_id?: string
  phases: BrownfieldPhase[]
  current_phase: string
  progress: number
  semantic_model: Record<string, unknown>
  documentation: Record<string, unknown>
  recommended_harnesses: Array<{ id: string; name: string; type: string; environment: string; reason: string }>
  recommended_pipelines: Array<{ id: string; name: string; reason: string; stages: string[] }>
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface BrownfieldSemanticModel {
  entities: Array<Record<string, unknown>>
  relationships: Array<Record<string, unknown>>
  summary: Record<string, unknown>
}

export interface BrownfieldRecommendations {
  harnesses: Array<{ id: string; name: string; type: string; environment: string; reason: string }>
  pipelines: Array<{ id: string; name: string; reason: string; stages: string[] }>
}

export interface EngineeringPlan {
  id: string
  application_id: string
  requirement_text: string
  requirement_id?: string
  application_name: string
  application_type: string
  technologies: string[]
  architecture_summary: string
  architecture_components: string[]
  repository_config: Record<string, unknown>
  engineering_state_summary: Record<string, unknown>
  recommended_harnesses: Array<{ id: string; name: string; type: string; environment: string }>
  recommended_pipeline: Record<string, unknown>
  stages: PlanStage[]
  risk_level: string
  risk_factors: string[]
  estimated_cost_cents: number
  estimated_tokens: number
  estimated_duration_seconds: number
  status: string
  decided_by?: string
  decided_at?: string
  decision_reason: string
  execution_id?: string
  created_at: string
}

export interface RepositoryFile {
  path: string
  language: string
  content: string
  lines: number
  is_critical: boolean
  category: string
}

export interface FileChange {
  file_path: string
  language: string
  change_type: string
  before: string
  after: string
  reason: string
  risk: string
  start_line: number
  end_line: number
}

export interface RiskFactor {
  factor: string
  weight: number
  present: boolean
  detail: string
}

export interface WorkflowStep {
  id: string
  phase: string
  label: string
  description: string
  status: string
  started_at?: string
  completed_at?: string
  result: Record<string, unknown>
  events: Record<string, unknown>[]
}

export interface PeerTestResult {
  name: string
  status: string
  passed: number
  failed: number
  skipped: number
  coverage_pct: number
  duration_seconds: number
  details: Record<string, unknown>[]
}

export interface PeerSecurityResult {
  scan_type: string
  status: string
  findings: number
  critical: number
  high: number
  medium: number
  low: number
  details: Record<string, unknown>[]
}

export interface PeerBuildResult {
  status: string
  build_time_seconds: number
  artifact_path: string
  errors: string[]
  warnings: string[]
}

export interface PeerEvidenceRecord {
  id: string
  phase: string
  action: string
  agent: string
  model: string
  timestamp: string
  summary: string
  data: Record<string, unknown>
}

export interface PeerEngineeringSession {
  id: string
  application_id: string
  application_name: string
  request_text: string
  status: string
  current_phase: string
  repository_files: RepositoryFile[]
  selected_file_path: string
  engineering_state_summary: Record<string, unknown>
  relevant_files: string[]
  impact_analysis: Record<string, unknown>
  risk_level: string
  risk_factors: RiskFactor[]
  risk_score: number
  plan: Record<string, unknown>[]
  plan_summary: string
  requires_approval: boolean
  file_changes: FileChange[]
  workflow_steps: WorkflowStep[]
  test_results: PeerTestResult
  security_results: PeerSecurityResult
  build_results: PeerBuildResult
  evidence: PeerEvidenceRecord[]
  evidence_ids: string[]
  execution_id: string
  engineering_context: Record<string, unknown>
  decided_by: string
  decided_at?: string
  decision_reason: string
  created_at: string
  updated_at: string
}

export interface Symptom {
  id: string
  name: string
  severity: string
  component: string
  metric: string
  threshold: string
  observed_value: string
  message: string
  detected_at: string
}

export interface RootCauseFinding {
  category: string
  component: string
  description: string
  commit_sha: string
  file_path: string
  line_range: string
  confidence: number
  contributing_factors: string[]
  evidence_refs: string[]
}

export interface RemediationStep {
  id: string
  phase: string
  label: string
  description: string
  agent_id: string
  status: string
  started_at?: string
  completed_at?: string
  result: Record<string, unknown>
  evidence_id?: string
}

export interface RemediationPlan {
  summary: string
  risk_level: string
  risk_factors: string[]
  requires_approval: boolean
  steps: RemediationStep[]
  estimated_duration_seconds: number
  estimated_cost_cents: number
  rollback_plan: string
  created_at: string
}

export interface IncidentTimelineEntry {
  id: string
  timestamp: string
  event: string
  message: string
  actor: string
  data: Record<string, unknown>
}

export interface Incident {
  id: string
  title: string
  description: string
  severity: string
  status: string
  source: string
  application_id: string
  environment_id: string
  component: string
  symptoms: Symptom[]
  timeline: IncidentTimelineEntry[]
  root_cause: RootCauseFinding | null
  root_cause_analysis: Record<string, unknown>
  remediation_plan: RemediationPlan | null
  remediation_execution_id?: string
  remediation_deployment_id?: string
  verification_result: Record<string, unknown>
  rollback_result: Record<string, unknown>
  evidence_ids: string[]
  approval_id?: string
  assigned_to: string
  detected_at: string
  acknowledged_at?: string
  resolved_at?: string
  closed_at?: string
  retry_count: number
  max_retries: number
  related_incident_ids: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Delivery Intelligence (AI Scrum Master) Types ─────────────────────────

export type AutomationLevel =
  | 'L0_OBSERVE'
  | 'L1_RECOMMEND'
  | 'L2_PREPARE'
  | 'L3_APPROVE_AND_EXECUTE'
  | 'L4_POLICY_AUTOMATION'
  | 'L5_CLOSED_LOOP'

export type StoryStatus = 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'IN_REVIEW' | 'TESTING' | 'BLOCKED' | 'DONE'
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED'

export interface AcceptanceCriterion {
  id: string
  text: string
  verified: boolean
}

export interface DeliveryStory {
  id: string
  tenant_id: string
  key: string
  title: string
  description: string
  epic_id?: string
  product_id?: string
  team_id?: string
  status: StoryStatus
  points: number
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  definition_of_ready_score: number
  dor_criteria_met: string[]
  dor_criteria_missing: string[]
  acceptance_criteria: AcceptanceCriterion[]
  missing_metadata: string[]
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risk_explanation: string
  stale_days: number
  carry_over_count: number
  split_recommended: boolean
  split_suggestions: string[]
  application_id?: string
  service_name?: string
  repository_url?: string
  component_tag?: string
  assignee_id?: string
  assignee_name?: string
  labels: string[]
  linked_dependencies: string[]
}

export interface DeliveryTeam {
  id: string
  tenant_id: string
  name: string
  key: string
  description: string
  lead_name: string
  scrum_master: string
  members_count: number
  capacity_hours_per_sprint: number
  usable_capacity_hours: number
  skills: string[]
  capability_matrix: Record<string, number>
  average_velocity: number
  current_wip: number
  active_sprint_id?: string
}

export interface SprintGoal {
  statement: string
  confidence_score: number
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'
  key_deliverables: string[]
}

export interface DeliverySprint {
  id: string
  tenant_id: string
  name: string
  number: number
  team_id: string
  team_name: string
  status: SprintStatus
  start_date: string
  end_date: string
  working_days: number
  committed_points: number
  completed_points: number
  carried_over_points: number
  scope_change_points: number
  capacity_hours: number
  usable_capacity_hours: number
  pto_hours_deducted: number
  goal: SprintGoal
  health_score: number
  health_status: 'HEALTHY' | 'AT_RISK' | 'CRITICAL'
  velocity_forecast: number
  goal_achievement_prob: number
  story_ids: string[]
}

export interface DeliveryDependency {
  id: string
  tenant_id: string
  source_id: string
  source_title: string
  source_type: 'STORY' | 'TEAM' | 'SERVICE' | 'REPO' | 'EXTERNAL'
  target_id: string
  target_title: string
  target_type: string
  dependency_type: 'BLOCKS' | 'DEPENDS_ON' | 'API_CONTRACT' | 'SHARED_COMPONENT' | 'EXTERNAL_VENDOR'
  critical_path: boolean
  aging_days: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  blast_radius_score: number
  status: 'ACTIVE' | 'BLOCKED' | 'RESOLVED'
  impact_description: string
}

export interface DeliveryRisk {
  id: string
  tenant_id: string
  category: 'CAPACITY' | 'DEPENDENCY' | 'TECHNICAL_DEBT' | 'VELOCITY_DECLINE' | 'REVIEW_BOTTLENECK' | 'SCOPE_CREEP' | 'BUILD_INSTABILITY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  probability: number
  impact: number
  urgency: 'IMMEDIATE' | 'THIS_SPRINT' | 'FUTURE'
  affected_story_ids: string[]
  affected_team_ids: string[]
  root_cause: string
  remediation_suggested: string
  engineering_link?: {
    application_id?: string
    repository?: string
    service?: string
    open_pr?: string
    failing_test?: string
  }
  remediation_harness_id?: string
  status: 'ACTIVE' | 'MITIGATING' | 'RESOLVED'
}

export interface DeliveryRecommendation {
  id: string
  tenant_id: string
  title: string
  recommendation: string
  rationale: string
  confidence: number
  automation_level: AutomationLevel
  evidence_ids: string[]
  suggested_action_type: string
  target_entity_id: string
  parameters?: Record<string, unknown>
  applied?: boolean
}

export interface DeliveryAction {
  id: string
  tenant_id: string
  title: string
  action_type: string
  description: string
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'VERIFIED' | 'FAILED'
  automation_level: AutomationLevel
  initiated_by: string
  approved_by?: string
  payload?: Record<string, unknown>
  execution_result?: Record<string, unknown>
  evidence_ids: string[]
  reversible: boolean
}

export interface DeliveryForecast {
  id: string
  tenant_id: string
  target_release: string
  epic_id?: string
  target_date: string
  optimistic_date: string
  expected_date: string
  conservative_date: string
  confidence_score: number
  scope_buffer_points: number
  monte_carlo_runs: number
}

export interface DeliveryState {
  id: string
  tenant_id: string
  active_sprint_id?: string
  team_id?: string
  health_index: number
  goal_confidence: number
  velocity_trend: string
  cycle_time_days: number
  lead_time_days: number
  blocked_time_hours: number
  wip_items: number
  total_active_risks: number
  critical_risks: number
  open_dependencies: number
  engineering_state_link_id?: string
  last_scanned_at: string
}

