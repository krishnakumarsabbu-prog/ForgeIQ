import { api } from './client'
import type {
  Application, Agent, Skill, Tool, ModelConfiguration, Harness, HarnessTemplate, HarnessVersion, HarnessVersionComparison,
  Graph, Loop, Pipeline, Execution, ExecutionEvent, Evidence, EngineeringState,
  Policy, Requirement, Environment, Artifact, Deployment, DashboardData, Tenant, User, Approval,
  AgentTestResult, AgentVersionComparison, AgentFactoryFullBody, AgentVersion,
} from '../types'

export const apiService = {
  dashboard: () => api.get<DashboardData>('/dashboard'),
  health: () => api.get<Record<string, unknown>>('/health'),

  applications: () => api.get<Application[]>('/applications'),
  application: (id: string) => api.get<Application>(`/applications/${id}`),
  createApplication: (body: unknown) => api.post<Application>('/applications', body),
  appRequirements: (id: string) => api.get<Requirement[]>(`/applications/${id}/requirements`),
  appEngineeringState: (id: string) => api.get<EngineeringState>(`/applications/${id}/engineering-state`),
  appPipelines: (id: string) => api.get<Pipeline[]>(`/applications/${id}/pipelines`),

  requirements: () => api.get<Requirement[]>('/requirements'),
  requirement: (id: string) => api.get<Requirement>(`/requirements/${id}`),
  createRequirement: (body: unknown) => api.post<Requirement>('/requirements', body),

  agents: () => api.get<Agent[]>('/agents'),
  agent: (id: string) => api.get<Agent>(`/agents/${id}`),
  createAgent: (body: unknown) => api.post<Agent>('/agents', body),
  updateAgent: (id: string, body: unknown) => api.put<Agent>(`/agents/${id}`, body),
  deleteAgent: (id: string) => api.delete<Record<string, unknown>>(`/agents/${id}`),
  agentFactory: (body: unknown) => api.post<Agent>('/agents/factory', body),
  agentFactoryFull: (body: AgentFactoryFullBody) => api.post<Agent>('/agents/factory/full', body),
  cloneAgent: (id: string, body: { display_name?: string }) => api.post<Agent>(`/agents/${id}/clone`, body),
  agentVersions: (id: string) => api.get<AgentVersion[]>(`/agents/${id}/versions`),
  createAgentVersion: (id: string, body: { changelog: string; system_instructions?: string }) => api.post<AgentVersion>(`/agents/${id}/versions`, body),
  publishAgent: (id: string, version: string) => api.post<Agent>(`/agents/${id}/publish/${version}`),
  rollbackAgent: (id: string, version: string) => api.post<Agent>(`/agents/${id}/rollback/${version}`),
  deprecateAgent: (id: string, version: string) => api.post<Agent>(`/agents/${id}/deprecate/${version}`),
  compareAgentVersions: (id: string, va: string, vb: string) => api.get<AgentVersionComparison>(`/agents/${id}/compare/${va}/${vb}`),
  agentExecutions: (id: string) => api.get<Execution[]>(`/agents/${id}/executions`),
  testAgent: (id: string, body: { inputs: Record<string, unknown>; context: Record<string, unknown> }) => api.post<AgentTestResult>(`/agents/${id}/test`, body),

  skills: () => api.get<Skill[]>('/skills'),
  skill: (id: string) => api.get<Skill>(`/skills/${id}`),
  createSkill: (body: unknown) => api.post<Skill>('/skills', body),
  updateSkill: (id: string, body: unknown) => api.put<Skill>(`/skills/${id}`, body),
  deleteSkill: (id: string) => api.delete<Record<string, unknown>>(`/skills/${id}`),
  skillCategories: () => api.get<{value: string; label: string}[]>('/skills/categories'),

  tools: () => api.get<Tool[]>('/tools'),
  tool: (id: string) => api.get<Tool>(`/tools/${id}`),
  createTool: (body: unknown) => api.post<Tool>('/tools', body),
  updateTool: (id: string, body: unknown) => api.put<Tool>(`/tools/${id}`, body),
  deleteTool: (id: string) => api.delete<Record<string, unknown>>(`/tools/${id}`),
  toolCategories: () => api.get<{value: string; label: string}[]>('/tools/categories'),

  models: () => api.get<ModelConfiguration[]>('/models'),
  model: (id: string) => api.get<ModelConfiguration>(`/models/${id}`),
  createModel: (body: unknown) => api.post<ModelConfiguration>('/models', body),
  updateModel: (id: string, body: unknown) => api.put<ModelConfiguration>(`/models/${id}`, body),
  deleteModel: (id: string) => api.delete<Record<string, unknown>>(`/models/${id}`),
  modelProviders: () => api.get<{value: string; label: string}[]>('/models/providers'),

  harnesses: () => api.get<Harness[]>('/harnesses'),
  harness: (id: string) => api.get<Harness>(`/harnesses/${id}`),
  createHarness: (body: unknown) => api.post<Harness>('/harnesses', body),
  cloneHarness: (id: string, body: { display_name?: string }) => api.post<Harness>(`/harnesses/${id}/clone`, body),
  archiveHarness: (id: string) => api.post<Harness>(`/harnesses/${id}/archive`),
  harnessVersions: (id: string) => api.get<HarnessVersion[]>(`/harnesses/${id}/versions`),
  createHarnessVersion: (id: string, body: { changelog: string }) => api.post<HarnessVersion>(`/harnesses/${id}/versions`, body),
  publishHarness: (id: string, version: string) => api.post<Harness>(`/harnesses/${id}/publish/${version}`),
  compareHarnessVersions: (id: string, va: string, vb: string) => api.get<HarnessVersionComparison>(`/harnesses/${id}/compare/${va}/${vb}`),
  harnessTemplates: () => api.get<HarnessTemplate[]>('/harnesses/templates/all'),

  graphs: () => api.get<Graph[]>('/graphs'),
  graph: (id: string) => api.get<Graph>(`/graphs/${id}`),
  createGraph: (body: unknown) => api.post<Graph>('/graphs', body),
  addNode: (id: string, body: unknown) => api.post<Graph>(`/graphs/${id}/nodes`, body),
  addEdge: (id: string, body: unknown) => api.post<Graph>(`/graphs/${id}/edges`, body),

  loops: () => api.get<Loop[]>('/loops'),
  loop: (id: string) => api.get<Loop>(`/loops/${id}`),
  createLoop: (body: unknown) => api.post<Loop>('/loops', body),

  pipelines: () => api.get<Pipeline[]>('/pipelines'),
  pipeline: (id: string) => api.get<Pipeline>(`/pipelines/${id}`),
  createPipeline: (body: unknown) => api.post<Pipeline>('/pipelines', body),

  executions: () => api.get<Execution[]>('/executions'),
  execution: (id: string) => api.get<Execution>(`/executions/${id}`),
  createExecution: (body: unknown) => api.post<Execution>('/executions', body),
  executionEvents: (id: string) => api.get<ExecutionEvent[]>(`/executions/${id}/events`),
  executionApprovals: (id: string) => api.get<Approval[]>(`/executions/${id}/approvals`),

  evidence: () => api.get<Evidence[]>('/evidence'),
  evidenceItem: (id: string) => api.get<Evidence>(`/evidence/${id}`),
  executionEvidence: (id: string) => api.get<Evidence[]>(`/evidence/execution/${id}`),

  engineeringStates: () => api.get<EngineeringState[]>('/engineering-state'),
  engineeringState: (id: string) => api.get<EngineeringState>(`/engineering-state/${id}`),
  createDecision: (body: unknown) => api.post('/engineering-state/decisions', body),

  policies: () => api.get<Policy[]>('/policies'),
  policy: (id: string) => api.get<Policy>(`/policies/${id}`),
  createPolicy: (body: unknown) => api.post<Policy>('/policies', body),

  environments: () => api.get<Environment[]>('/delivery/environments'),
  artifacts: () => api.get<Artifact[]>('/delivery/artifacts'),
  deployments: () => api.get<Deployment[]>('/delivery/deployments'),
  deployment: (id: string) => api.get<Deployment>(`/delivery/deployments/${id}`),

  tenants: () => api.get<Tenant[]>('/tenants'),
  tenant: (id: string) => api.get<Tenant>(`/tenants/${id}`),
  tenantUsers: (id: string) => api.get<User[]>(`/tenants/${id}/users`),
}
