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
export function useHarnessTemplate(id: string) {
  return useQuery({ queryKey: ['harness-template', id], queryFn: () => apiService.harnessTemplate(id), enabled: !!id })
}
export function useCreateHarnessTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createHarnessTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harness-templates'] }) },
  })
}
export function useUpdateHarnessTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateHarnessTemplate(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harness-templates'] }) },
  })
}
export function usePublishHarnessTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.publishHarnessTemplate(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harness-templates'] }) },
  })
}
export function useHarnessTemplateVersions(id: string) {
  return useQuery({ queryKey: ['harness-template-versions', id], queryFn: () => apiService.harnessTemplateVersions(id), enabled: !!id })
}
export function useCreateHarnessTemplateVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { changelog: string } }) => apiService.createHarnessTemplateVersion(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harness-templates'] }) },
  })
}
export function useCompareHarnessTemplateVersions() {
  return useMutation({
    mutationFn: ({ id, va, vb }: { id: string; va: string; vb: string }) => apiService.compareHarnessTemplateVersions(id, va, vb),
  })
}
export function useTemplateInheritance(id: string) {
  return useQuery({ queryKey: ['template-inheritance', id], queryFn: () => apiService.getTemplateInheritance(id), enabled: !!id })
}
export function useInstantiateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { display_name: string; overrides?: Record<string, unknown> } }) => apiService.instantiateTemplate(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}
export function useRollbackHarness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.rollbackHarness(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}
export function useDeprecateHarnessVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.deprecateHarnessVersion(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
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
export function useLoop(id: string) {
  return useQuery({ queryKey: ['loop', id], queryFn: () => apiService.loop(id), enabled: !!id })
}
export function useLoopHistory(id: string) {
  return useQuery({ queryKey: ['loop-history', id], queryFn: () => apiService.loopHistory(id), enabled: !!id })
}
export function useCreateLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createLoop,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loops'] }) },
  })
}
export function useUpdateLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateLoop(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loops'] }) },
  })
}
export function useDeleteLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deleteLoop,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loops'] }) },
  })
}
export function usePublishLoop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.publishLoop,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loops'] }) },
  })
}
export function useExecuteLoop() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.executeLoop(id, body),
  })
}
export function useLoopTypes() {
  return useQuery({ queryKey: ['loop-types'], queryFn: apiService.loopTypes })
}
export function useLoopTriggers() {
  return useQuery({ queryKey: ['loop-triggers'], queryFn: apiService.loopTriggers })
}
export function useLoopBackoffStrategies() {
  return useQuery({ queryKey: ['loop-backoff'], queryFn: apiService.loopBackoffStrategies })
}
export function useLoopFailureHandling() {
  return useQuery({ queryKey: ['loop-failure'], queryFn: apiService.loopFailureHandling })
}
export function useLoopEscalationTypes() {
  return useQuery({ queryKey: ['loop-escalation'], queryFn: apiService.loopEscalationTypes })
}
export function useGenerateLoopSteps() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.generateLoopSteps,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loops'] }) },
  })
}
export function useGenerateLoopStepsForType() {
  return useMutation({
    mutationFn: apiService.generateLoopStepsForType,
  })
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

export function useUpdateHarness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateHarness(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['harnesses'] }) },
  })
}

export function useCreateGraph() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createGraph,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['graphs'] }) },
  })
}

export function useUpdateGraphFull() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updateGraphFull(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['graphs'] }) },
  })
}

export function useDeleteGraph() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deleteGraph,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['graphs'] }) },
  })
}

export function useValidateGraph() {
  return useMutation({
    mutationFn: (id: string) => apiService.validateGraph(id),
  })
}

export function useGraphVersions(id: string) {
  return useQuery({ queryKey: ['graph-versions', id], queryFn: () => apiService.graphVersions(id), enabled: !!id })
}

export function useCreateGraphVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { changelog: string } }) => apiService.createGraphVersion(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['graphs'] }) },
  })
}

export function usePublishGraph() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.publishGraph(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['graphs'] }) },
  })
}

export function useRollbackGraph() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.rollbackGraph(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['graphs'] }) },
  })
}

export function useSerializeGraph() {
  return useMutation({
    mutationFn: (id: string) => apiService.serializeGraph(id),
  })
}

export function useExecuteGraph() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.executeGraph(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['graphs'] }) },
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
export function useUpdatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updatePipeline(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }) },
  })
}
export function useDeletePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deletePipeline,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }) },
  })
}
export function useCreatePipelineVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { changelog: string } }) => apiService.createPipelineVersion(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }) },
  })
}
export function usePublishPipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: string }) => apiService.publishPipeline(id, version),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }) },
  })
}
export function usePipelineTemplates() {
  return useQuery({ queryKey: ['pipeline-templates'], queryFn: apiService.pipelineTemplates })
}
export function usePipelineTemplate(id: string) {
  return useQuery({ queryKey: ['pipeline-template', id], queryFn: () => apiService.pipelineTemplate(id), enabled: !!id })
}
export function useCreatePipelineTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createPipelineTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline-templates'] }) },
  })
}
export function useUpdatePipelineTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiService.updatePipelineTemplate(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline-templates'] }) },
  })
}
export function useDeletePipelineTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.deletePipelineTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline-templates'] }) },
  })
}
export function useInstantiatePipelineTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { display_name: string; application_id?: string } }) => apiService.instantiatePipelineTemplate(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipelines'] }) },
  })
}
export function usePipelineStageTypes() {
  return useQuery({ queryKey: ['pipeline-stage-types'], queryFn: apiService.pipelineStageTypes })
}
export function usePipelineFailureStrategies() {
  return useQuery({ queryKey: ['pipeline-failure-strategies'], queryFn: apiService.pipelineFailureStrategies })
}

export function useCreateRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createRequirement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements'] }) },
  })
}

export function useAppExecutions(id: string) {
  return useQuery({ queryKey: ['app-executions', id], queryFn: () => apiService.appExecutions(id), enabled: !!id })
}
export function useAppEvidence(id: string) {
  return useQuery({ queryKey: ['app-evidence', id], queryFn: () => apiService.appEvidence(id), enabled: !!id })
}
export function useAppDeployments(id: string) {
  return useQuery({ queryKey: ['app-deployments', id], queryFn: () => apiService.appDeployments(id), enabled: !!id })
}

export function useCreateEngineeringPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createEngineeringPlan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }) },
  })
}
export function useEngineeringPlan(id: string) {
  return useQuery({ queryKey: ['engineering-plan', id], queryFn: () => apiService.getEngineeringPlan(id), enabled: !!id })
}
export function useModifyPlanStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, stageId, body }: { planId: string; stageId: string; body: unknown }) => apiService.modifyPlanStage(planId, stageId, body),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['engineering-plan', data.id] }) },
  })
}
export function useApproveEngineeringPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { decided_by: string; reason: string } }) => apiService.approveEngineeringPlan(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }) },
  })
}
export function useRejectEngineeringPlan() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { decided_by: string; reason: string } }) => apiService.rejectEngineeringPlan(id, body),
  })
}
export function useExecuteEngineeringPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.executeEngineeringPlan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['executions'] }) },
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

export function useBrownfieldImports() {
  return useQuery({ queryKey: ['brownfield-imports'], queryFn: apiService.brownfieldImports })
}
export function useBrownfieldImport(id: string) {
  return useQuery({ queryKey: ['brownfield-import', id], queryFn: () => apiService.brownfieldImport(id), enabled: !!id, refetchInterval: 1500 })
}
export function useCreateBrownfieldImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createBrownfieldImport,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brownfield-imports'] }) },
  })
}
export function useBrownfieldImportSemanticModel(id: string) {
  return useQuery({ queryKey: ['brownfield-semantic-model', id], queryFn: () => apiService.brownfieldImportSemanticModel(id), enabled: !!id })
}
export function useBrownfieldImportDocumentation(id: string) {
  return useQuery({ queryKey: ['brownfield-documentation', id], queryFn: () => apiService.brownfieldImportDocumentation(id), enabled: !!id })
}
export function useBrownfieldImportRecommendations(id: string) {
  return useQuery({ queryKey: ['brownfield-recommendations', id], queryFn: () => apiService.brownfieldImportRecommendations(id), enabled: !!id })
}
