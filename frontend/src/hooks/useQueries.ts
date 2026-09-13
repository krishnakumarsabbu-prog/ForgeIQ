import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '../api'
import type { Execution } from '../types'

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: apiService.dashboard, refetchInterval: 5000 })
}

export function useApplications() {
  return useQuery({ queryKey: ['applications'], queryFn: apiService.applications })
}
export function useApplication(id: string) {
  return useQuery({ queryKey: ['application', id], queryFn: () => apiService.application(id), enabled: !!id })
}

export function useRequirements() {
  return useQuery({ queryKey: ['requirements'], queryFn: apiService.requirements })
}

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: apiService.agents })
}
export function useAgent(id: string) {
  return useQuery({ queryKey: ['agent', id], queryFn: () => apiService.agent(id), enabled: !!id })
}

export function useSkills() {
  return useQuery({ queryKey: ['skills'], queryFn: apiService.skills })
}

export function useTools() {
  return useQuery({ queryKey: ['tools'], queryFn: apiService.tools })
}

export function useModels() {
  return useQuery({ queryKey: ['models'], queryFn: apiService.models })
}

export function useHarnesses() {
  return useQuery({ queryKey: ['harnesses'], queryFn: apiService.harnesses })
}
export function useHarness(id: string) {
  return useQuery({ queryKey: ['harness', id], queryFn: () => apiService.harness(id), enabled: !!id })
}
export function useHarnessTemplates() {
  return useQuery({ queryKey: ['harness-templates'], queryFn: apiService.harnessTemplates })
}

export function useGraphs() {
  return useQuery({ queryKey: ['graphs'], queryFn: apiService.graphs })
}
export function useGraph(id: string) {
  return useQuery({ queryKey: ['graph', id], queryFn: () => apiService.graph(id), enabled: !!id })
}

export function useLoops() {
  return useQuery({ queryKey: ['loops'], queryFn: apiService.loops })
}

export function usePipelines() {
  return useQuery({ queryKey: ['pipelines'], queryFn: apiService.pipelines })
}
export function usePipeline(id: string) {
  return useQuery({ queryKey: ['pipeline', id], queryFn: () => apiService.pipeline(id), enabled: !!id })
}

export function useExecutions() {
  return useQuery({ queryKey: ['executions'], queryFn: apiService.executions, refetchInterval: 3000 })
}
export function useExecution(id: string) {
  return useQuery({ queryKey: ['execution', id], queryFn: () => apiService.execution(id), enabled: !!id, refetchInterval: 2000 })
}
export function useExecutionEvents(id: string) {
  return useQuery({ queryKey: ['execution-events', id], queryFn: () => apiService.executionEvents(id), enabled: !!id, refetchInterval: 2000 })
}

export function useEvidence() {
  return useQuery({ queryKey: ['evidence'], queryFn: apiService.evidence })
}

export function useEngineeringStates() {
  return useQuery({ queryKey: ['engineering-states'], queryFn: apiService.engineeringStates })
}
export function useEngineeringState(id: string) {
  return useQuery({ queryKey: ['engineering-state', id], queryFn: () => apiService.engineeringState(id), enabled: !!id })
}

export function usePolicies() {
  return useQuery({ queryKey: ['policies'], queryFn: apiService.policies })
}

export function useEnvironments() {
  return useQuery({ queryKey: ['environments'], queryFn: apiService.environments })
}
export function useArtifacts() {
  return useQuery({ queryKey: ['artifacts'], queryFn: apiService.artifacts })
}
export function useDeployments() {
  return useQuery({ queryKey: ['deployments'], queryFn: apiService.deployments })
}

export function useTenants() {
  return useQuery({ queryKey: ['tenants'], queryFn: apiService.tenants })
}
export function useTenantUsers(id: string) {
  return useQuery({ queryKey: ['tenant-users', id], queryFn: () => apiService.tenantUsers(id), enabled: !!id })
}

export function useCreateExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createExecution,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['executions'] }) },
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createAgent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useAgentFactory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.agentFactory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useCreateHarness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createHarness,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}

export function useCloneHarness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { display_name?: string } }) => apiService.cloneHarness(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}

export function useArchiveHarness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.archiveHarness,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}

export function useCreateHarnessVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { changelog: string } }) => apiService.createHarnessVersion(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}

export function usePublishHarness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.publishHarness(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}

export function useCompareHarnessVersions() {
  return useMutation({
    mutationFn: ({ id, va, vb }: { id: string; va: string; vb: string }) => apiService.compareHarnessVersions(id, va, vb),
  })
}

export function useHarnessExecutions(id: string) {
  return useQuery({ queryKey: ['harness-executions', id], queryFn: () => apiService.executions().then((execs: Execution[]) => execs.filter((e) => e.harness_id === id)), enabled: !!id })
}

export function useCreatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createPipeline,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }) },
  })
}

export function useCreateRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createRequirement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements'] }) },
  })
}

export function useCreatePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createPolicy,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }) },
  })
}

export function useCreateSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createSkill,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }) },
  })
}
export function useUpdateSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateSkill(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }) },
  })
}
export function useDeleteSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deleteSkill,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }) },
  })
}

export function useCreateTool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createTool,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tools'] }) },
  })
}
export function useUpdateTool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateTool(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tools'] }) },
  })
}
export function useDeleteTool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deleteTool,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tools'] }) },
  })
}

export function useCreateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createModel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }) },
  })
}
export function useUpdateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateModel(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }) },
  })
}
export function useDeleteModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deleteModel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }) },
  })
}

export function usePublishAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.publishAgent(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useAgentFactoryFull() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.agentFactoryFull,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateAgent(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useCloneAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { display_name?: string } }) => apiService.cloneAgent(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deleteAgent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useCreateAgentVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { changelog: string; system_instructions?: string } }) => apiService.createAgentVersion(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useRollbackAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.rollbackAgent(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useDeprecateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.deprecateAgent(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}

export function useCompareAgentVersions() {
  return useMutation({
    mutationFn: ({ id, va, vb }: { id: string; va: string; vb: string }) => apiService.compareAgentVersions(id, va, vb),
  })
}

export function useAgentExecutions(id: string) {
  return useQuery({ queryKey: ['agent-executions', id], queryFn: () => apiService.agentExecutions(id), enabled: !!id })
}

export function useTestAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { inputs: Record<string, unknown>; context: Record<string, unknown> } }) => apiService.testAgent(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }) },
  })
}
