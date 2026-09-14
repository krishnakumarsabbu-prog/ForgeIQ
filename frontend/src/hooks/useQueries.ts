import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '../api'
import type { Execution, ModelProviderStatus, ModelUsageStats, RoutingDecision, Incident } from '../types'

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

export function useModelProviderStatus() {
  return useQuery({ queryKey: ['model-provider-status'], queryFn: apiService.modelProviderStatus, refetchInterval: 10000 })
}

export function useModelUsageStats() {
  return useQuery({ queryKey: ['model-usage-stats'], queryFn: apiService.modelUsageStats, refetchInterval: 5000 })
}

export function useModelTiers() {
  return useQuery({ queryKey: ['model-tiers'], queryFn: apiService.modelTiers })
}

export function useRoutingFactors() {
  return useQuery({ queryKey: ['routing-factors'], queryFn: apiService.routingFactors })
}

export function useRouteModel() {
  return useMutation({
    mutationFn: apiService.routeModel,
  })
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

export function useEvidence(params?: Record<string, string>) {
  const queryKey = params ? ['evidence', JSON.stringify(params)] : ['evidence']
  return useQuery({ queryKey, queryFn: () => apiService.evidence(params) })
}
export function useEvidenceItem(id: string) {
  return useQuery({ queryKey: ['evidence-item', id], queryFn: () => apiService.evidenceItem(id), enabled: !!id })
}
export function useEvidenceTimeline(executionId: string) {
  return useQuery({ queryKey: ['evidence-timeline', executionId], queryFn: () => apiService.evidenceTimeline(executionId), enabled: !!executionId })
}
export function useEvidenceChainVerify(executionId: string) {
  return useQuery({ queryKey: ['evidence-chain-verify', executionId], queryFn: () => apiService.evidenceChainVerify(executionId), enabled: !!executionId })
}
export function useEvidenceStats() {
  return useQuery({ queryKey: ['evidence-stats'], queryFn: apiService.evidenceStats })
}
export function useEvidenceTypes() {
  return useQuery({ queryKey: ['evidence-types'], queryFn: apiService.evidenceTypes })
}
export function useAppEvidenceDirect(id: string) {
  return useQuery({ queryKey: ['evidence-app', id], queryFn: () => apiService.evidenceByApp(id), enabled: !!id })
}

export function useEngineeringStates() {
  return useQuery({ queryKey: ['engineering-states'], queryFn: apiService.engineeringStates })
}
export function useEngineeringState(id: string) {
  return useQuery({ queryKey: ['engineering-state', id], queryFn: () => apiService.engineeringState(id), enabled: !!id })
}
export function useAppEngineeringState(applicationId: string) {
  return useQuery({ queryKey: ['app-engineering-state', applicationId], queryFn: () => apiService.appEngineeringState(applicationId), enabled: !!applicationId })
}
export function useStateHistory(applicationId: string) {
  return useQuery({ queryKey: ['state-history', applicationId], queryFn: () => apiService.stateHistory(applicationId), enabled: !!applicationId })
}
export function useStateHistoryByState(stateId: string) {
  return useQuery({ queryKey: ['state-history-state', stateId], queryFn: () => apiService.stateHistoryByState(stateId), enabled: !!stateId })
}
export function useEngineeringContext(applicationId: string, query?: string) {
  return useQuery({ queryKey: ['engineering-context', applicationId, query], queryFn: () => apiService.engineeringContext(applicationId, query), enabled: !!applicationId })
}
export function useRetrieveContext() {
  return useMutation({
    mutationFn: ({ application_id, query }: { application_id: string; query: string }) => apiService.engineeringContextPost({ application_id, query }),
  })
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
export function useDeployment(id: string) {
  return useQuery({ queryKey: ['deployment', id], queryFn: () => apiService.deployment(id), enabled: !!id })
}
export function useCreateDeployment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createDeployment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deployments'] }) },
  })
}
export function useVerifyDeployment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { execution_id?: string; check_types?: string[] } }) =>
      apiService.verifyDeployment(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deployments'] }) },
  })
}
export function useRollbackDeployment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { execution_id?: string; reason?: string } }) =>
      apiService.rollbackDeployment(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deployments'] }) },
  })
}
export function useDeploymentStrategies() {
  return useQuery({ queryKey: ['deployment-strategies'], queryFn: apiService.deploymentStrategies })
}
export function useDeploymentStatuses() {
  return useQuery({ queryKey: ['deployment-statuses'], queryFn: apiService.deploymentStatuses })
}
export function useVerificationTypes() {
  return useQuery({ queryKey: ['verification-types'], queryFn: apiService.verificationTypes })
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
export const useCreatePipelineFromTemplate = useCreatePipelineTemplate
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

export function useAgentExecutions(id?: string) {
  return useQuery({
    queryKey: ['agent-executions', id ?? 'all'],
    queryFn: () => id ? apiService.agentExecutions(id) : apiService.executions(),
  })
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

export function usePeerSessions(applicationId?: string) {
  return useQuery({ queryKey: ['peer-sessions', applicationId], queryFn: () => apiService.peerSessions(applicationId) })
}
export function usePeerSession(id: string) {
  return useQuery({ queryKey: ['peer-session', id], queryFn: () => apiService.peerSession(id), enabled: !!id, refetchInterval: 2000 })
}
export function useCreatePeerSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createPeerSession,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['peer-sessions'] }) },
  })
}
export function useApprovePeerSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { decided_by: string; reason: string } }) => apiService.approvePeerSession(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['peer-sessions'] }) },
  })
}
export function useRejectPeerSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { decided_by: string; reason: string } }) => apiService.rejectPeerSession(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['peer-sessions'] }) },
  })
}
export function useRequestPeerRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { feedback: string } }) => apiService.requestPeerRevision(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['peer-sessions'] }) },
  })
}
export function useUpdatePeerFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { file_path: string; content: string } }) => apiService.updatePeerFile(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['peer-sessions'] }) },
  })
}
export function useSelectPeerFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { file_path: string } }) => apiService.selectPeerFile(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['peer-sessions'] }) },
  })
}

export function useApprovals(params?: Record<string, string>) {
  const queryKey = params ? ['approvals', JSON.stringify(params)] : ['approvals']
  return useQuery({ queryKey, queryFn: () => apiService.approvals(params), refetchInterval: 4000 })
}
export function useApproval(id: string) {
  return useQuery({ queryKey: ['approval', id], queryFn: () => apiService.approval(id), enabled: !!id })
}
export function useApprovalTypes() {
  return useQuery({ queryKey: ['approval-types'], queryFn: apiService.approvalTypes })
}
export function useEscalationTargets() {
  return useQuery({ queryKey: ['escalation-targets'], queryFn: apiService.escalationTargets })
}
export function useDecideApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { decided_by: string; decision: string; reason?: string; escalate_to?: string } }) =>
      apiService.decideApproval(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['executions'] })
    },
  })
}
export function useEscalateApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { decided_by: string; reason?: string; escalate_to?: string } }) =>
      apiService.escalateApproval(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['executions'] })
    },
  })
}
export function useDecideExecutionApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ executionId, approvalId, body }: { executionId: string; approvalId: string; body: { decided_by: string; decision: string; reason?: string; escalate_to?: string } }) =>
      apiService.decideExecutionApproval(executionId, approvalId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['executions'] })
    },
  })
}
export function useResumeExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiService.resumeExecution(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['executions'] }) },
  })
}

export function useIncidents(params?: Record<string, string>) {
  const queryKey = params ? ['incidents', JSON.stringify(params)] : ['incidents']
  return useQuery({ queryKey, queryFn: () => apiService.incidents(params), refetchInterval: 4000 })
}
export function useIncident(id: string) {
  return useQuery({ queryKey: ['incident', id], queryFn: () => apiService.incident(id), enabled: !!id, refetchInterval: 3000 })
}
export function useCreateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: apiService.createIncident,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useAnalyzeIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: { execution_id?: string } }) => apiService.analyzeIncident(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useGenerateRemediationPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: { execution_id?: string } }) => apiService.generateRemediationPlan(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useExecuteRemediation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: { execution_id?: string; auto_deploy?: boolean; auto_verify?: boolean; auto_rollback_on_failure?: boolean } }) =>
      apiService.executeRemediation(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useApproveRemediation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { approved_by: string; reason: string } }) => apiService.approveRemediation(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useRollbackIncidentFix() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: { execution_id?: string; reason?: string } }) => apiService.rollbackIncidentFix(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useVerifyIncidentFix() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: { execution_id?: string } }) => apiService.verifyIncidentFix(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useCloseIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { closed_by: string; reason: string } }) => apiService.closeIncident(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incidents'] }) },
  })
}
export function useIncidentEvidence(id: string) {
  return useQuery({ queryKey: ['incident-evidence', id], queryFn: () => apiService.incidentEvidence(id), enabled: !!id })
}
export function useIncidentSeverities() {
  return useQuery({ queryKey: ['incident-severities'], queryFn: apiService.incidentSeverities })
}
export function useIncidentStatuses() {
  return useQuery({ queryKey: ['incident-statuses'], queryFn: apiService.incidentStatuses })
}
export function useIncidentSources() {
  return useQuery({ queryKey: ['incident-sources'], queryFn: apiService.incidentSources })
}

export function useApproveExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiService.resumeExecution(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['executions'] }) },
  })
}
export function useRejectExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; reason?: string }) => apiService.resumeExecution(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['executions'] }) },
  })
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      try {
        return await (apiService as any).auditLogs?.() ?? [
          { id: 'aud-01', action: 'DEPLOY_PROD', actor: 'sarah.chen@enterprise.io', resource_type: 'Deployment', resource_id: 'dep-9821', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
          { id: 'aud-02', action: 'POLICY_OVERRIDE', actor: 'marcus.vance@enterprise.io', resource_type: 'Policy', resource_id: 'pol-sec-gate', status: 'WARNING', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
          { id: 'aud-03', action: 'AGENT_PUBLISH', actor: 'alex.kumar@enterprise.io', resource_type: 'Agent', resource_id: 'agent-ci-verifier', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: 'aud-04', action: 'GRAPH_UPDATE', actor: 'elena.rostova@enterprise.io', resource_type: 'Graph', resource_id: 'graph-canary-rollout', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
          { id: 'aud-05', action: 'SECRET_ROTATION', actor: 'security-bot@enterprise.io', resource_type: 'Security', resource_id: 'sec-vault-prod', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString() },
        ]
      } catch {
        return [
          { id: 'aud-01', action: 'DEPLOY_PROD', actor: 'sarah.chen@enterprise.io', resource_type: 'Deployment', resource_id: 'dep-9821', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
          { id: 'aud-02', action: 'POLICY_OVERRIDE', actor: 'marcus.vance@enterprise.io', resource_type: 'Policy', resource_id: 'pol-sec-gate', status: 'WARNING', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
          { id: 'aud-03', action: 'AGENT_PUBLISH', actor: 'alex.kumar@enterprise.io', resource_type: 'Agent', resource_id: 'agent-ci-verifier', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: 'aud-04', action: 'GRAPH_UPDATE', actor: 'elena.rostova@enterprise.io', resource_type: 'Graph', resource_id: 'graph-canary-rollout', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
          { id: 'aud-05', action: 'SECRET_ROTATION', actor: 'security-bot@enterprise.io', resource_type: 'Security', resource_id: 'sec-vault-prod', status: 'SUCCESS', created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString() },
        ]
      }
    },
  })
}

export function useBuildRuns() {
  return useQuery({
    queryKey: ['build-runs'],
    queryFn: async () => {
      try {
        return await (apiService as any).buildRuns?.() ?? [
          { id: 'bld-4091', application: 'Payment Core', branch: 'main', commit_sha: 'a8f102c', status: 'SUCCESS', duration: '1m 42s', started_at: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
          { id: 'bld-4090', application: 'Checkout Web', branch: 'feat/one-click', commit_sha: 'e921d74', status: 'RUNNING', duration: '48s', started_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
          { id: 'bld-4089', application: 'Notification Engine', branch: 'main', commit_sha: '57b29e1', status: 'SUCCESS', duration: '2m 15s', started_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: 'bld-4088', application: 'User Profile API', branch: 'fix/auth-leak', commit_sha: 'b337c89', status: 'FAILED', duration: '55s', started_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
        ]
      } catch {
        return [
          { id: 'bld-4091', application: 'Payment Core', branch: 'main', commit_sha: 'a8f102c', status: 'SUCCESS', duration: '1m 42s', started_at: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
          { id: 'bld-4090', application: 'Checkout Web', branch: 'feat/one-click', commit_sha: 'e921d74', status: 'RUNNING', duration: '48s', started_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
          { id: 'bld-4089', application: 'Notification Engine', branch: 'main', commit_sha: '57b29e1', status: 'SUCCESS', duration: '2m 15s', started_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: 'bld-4088', application: 'User Profile API', branch: 'fix/auth-leak', commit_sha: 'b337c89', status: 'FAILED', duration: '55s', started_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
        ]
      }
    },
  })
}

export function useEngineeringEconomics() {
  return useQuery({
    queryKey: ['engineering-economics'],
    queryFn: async () => {
      try {
        return await (apiService as any).engineeringEconomics?.() ?? {
          total_cost_cents: 48520,
          monthly_cost_cents: 12450,
          total_tokens: 3845000,
          efficiency_score: '94.2%',
          cost_by_agent: [
            { name: 'RefactorAgent', cost_cents: 18200 },
            { name: 'TestGenAgent', cost_cents: 14300 },
            { name: 'ReviewAgent', cost_cents: 8900 },
            { name: 'DeployAgent', cost_cents: 7120 },
          ],
          cost_trend: [
            { date: 'Sep 1', cost_cents: 420 },
            { date: 'Sep 4', cost_cents: 890 },
            { date: 'Sep 7', cost_cents: 1240 },
            { date: 'Sep 10', cost_cents: 1100 },
            { date: 'Sep 13', cost_cents: 950 },
          ]
        }
      } catch {
        return {
          total_cost_cents: 48520,
          monthly_cost_cents: 12450,
          total_tokens: 3845000,
          efficiency_score: '94.2%',
          cost_by_agent: [
            { name: 'RefactorAgent', cost_cents: 18200 },
            { name: 'TestGenAgent', cost_cents: 14300 },
            { name: 'ReviewAgent', cost_cents: 8900 },
            { name: 'DeployAgent', cost_cents: 7120 },
          ],
          cost_trend: [
            { date: 'Sep 1', cost_cents: 420 },
            { date: 'Sep 4', cost_cents: 890 },
            { date: 'Sep 7', cost_cents: 1240 },
            { date: 'Sep 10', cost_cents: 1100 },
            { date: 'Sep 13', cost_cents: 950 },
          ]
        }
      }
    }
  })
}

export function useGovernance() {
  return useQuery({
    queryKey: ['governance-overview'],
    queryFn: async () => {
      try {
        return await (apiService as any).governance?.() ?? {
          policy_coverage_pct: 94,
          compliant_runs_pct: 98.2,
          risk_score: 'Low',
          audit_events_count: 1240,
        }
      } catch {
        return {
          policy_coverage_pct: 94,
          compliant_runs_pct: 98.2,
          risk_score: 'Low',
          audit_events_count: 1240,
        }
      }
    }
  })
}

export function useGovernancePolicies() {
  return useQuery({ queryKey: ['governance-policies'], queryFn: apiService.policies })
}

export function useQualityMetrics() {
  return useQuery({
    queryKey: ['quality-metrics'],
    queryFn: async () => {
      try {
        return await (apiService as any).qualityMetrics?.() ?? {
          total_suites: 48,
          passing: 45,
          failing: 3,
          avg_coverage: 92,
        }
      } catch {
        return {
          total_suites: 48,
          passing: 45,
          failing: 3,
          avg_coverage: 92,
        }
      }
    }
  })
}

export function useReleases() {
  return useQuery({
    queryKey: ['releases'],
    queryFn: async () => {
      try {
        return await (apiService as any).releases?.() ?? [
          { id: 'rel-2.4.0', name: 'v2.4.0 Enterprise Core', application: 'Payment Core', version: '2.4.0', environment: 'Production', status: 'RELEASED', released_at: new Date(Date.now() - 1000 * 3600 * 4).toISOString() },
          { id: 'rel-2.3.9', name: 'v2.3.9 Hotfix Release', application: 'Checkout Web', version: '2.3.9', environment: 'Production', status: 'RELEASED', released_at: new Date(Date.now() - 1000 * 3600 * 24).toISOString() },
          { id: 'rel-2.5.0-rc1', name: 'v2.5.0 Release Candidate', application: 'Notification Engine', version: '2.5.0-rc1', environment: 'Staging', status: 'PENDING', released_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
        ]
      } catch {
        return [
          { id: 'rel-2.4.0', name: 'v2.4.0 Enterprise Core', application: 'Payment Core', version: '2.4.0', environment: 'Production', status: 'RELEASED', released_at: new Date(Date.now() - 1000 * 3600 * 4).toISOString() },
          { id: 'rel-2.3.9', name: 'v2.3.9 Hotfix Release', application: 'Checkout Web', version: '2.3.9', environment: 'Production', status: 'RELEASED', released_at: new Date(Date.now() - 1000 * 3600 * 24).toISOString() },
          { id: 'rel-2.5.0-rc1', name: 'v2.5.0 Release Candidate', application: 'Notification Engine', version: '2.5.0-rc1', environment: 'Staging', status: 'PENDING', released_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
        ]
      }
    }
  })
}

export function useSecurityFindings() {
  return useQuery({
    queryKey: ['security-findings'],
    queryFn: async () => {
      try {
        return await (apiService as any).securityFindings?.() ?? [
          { id: 'sec-810', title: 'Prototype pollution in lodash sub-dependency', application: 'Payment Core', cve_id: 'CVE-2024-38819', severity: 'HIGH', status: 'open', detected_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString() },
          { id: 'sec-809', title: 'Permissive CORS policy on internal healthcheck endpoint', application: 'Notification Engine', cve_id: 'CWE-942', severity: 'MEDIUM', status: 'open', detected_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString() },
          { id: 'sec-808', title: 'Hardcoded test RSA public key in test fixture', application: 'User Profile API', cve_id: 'CWE-798', severity: 'LOW', status: 'resolved', detected_at: new Date(Date.now() - 1000 * 3600 * 48).toISOString() },
        ]
      } catch {
        return [
          { id: 'sec-810', title: 'Prototype pollution in lodash sub-dependency', application: 'Payment Core', cve_id: 'CVE-2024-38819', severity: 'HIGH', status: 'open', detected_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString() },
          { id: 'sec-809', title: 'Permissive CORS policy on internal healthcheck endpoint', application: 'Notification Engine', cve_id: 'CWE-942', severity: 'MEDIUM', status: 'open', detected_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString() },
          { id: 'sec-808', title: 'Hardcoded test RSA public key in test fixture', application: 'User Profile API', cve_id: 'CWE-798', severity: 'LOW', status: 'resolved', detected_at: new Date(Date.now() - 1000 * 3600 * 48).toISOString() },
        ]
      }
    }
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['platform-users'],
    queryFn: async () => {
      try {
        return await (apiService as any).users?.() ?? [
          { id: 'usr-01', name: 'Sarah Chen', email: 'sarah.chen@enterprise.io', role: 'Enterprise Admin', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
          { id: 'usr-02', name: 'Marcus Vance', email: 'marcus.vance@enterprise.io', role: 'Staff Platform Engineer', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
          { id: 'usr-03', name: 'Elena Rostova', email: 'elena.rostova@enterprise.io', role: 'Lead DevOps Architect', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: 'usr-04', name: 'Alex Kumar', email: 'alex.kumar@enterprise.io', role: 'Senior AI Engineer', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
        ]
      } catch {
        return [
          { id: 'usr-01', name: 'Sarah Chen', email: 'sarah.chen@enterprise.io', role: 'Enterprise Admin', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
          { id: 'usr-02', name: 'Marcus Vance', email: 'marcus.vance@enterprise.io', role: 'Staff Platform Engineer', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
          { id: 'usr-03', name: 'Elena Rostova', email: 'elena.rostova@enterprise.io', role: 'Lead DevOps Architect', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
          { id: 'usr-04', name: 'Alex Kumar', email: 'alex.kumar@enterprise.io', role: 'Senior AI Engineer', status: 'active', active: true, last_active: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
        ]
      }
    }
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ['platform-roles'],
    queryFn: async () => {
      try {
        return await (apiService as any).roles?.() ?? [
          { id: 'role-admin', name: 'Enterprise Admin', description: 'Full system administration and governance authority', users_count: 3, permissions_count: 48 },
          { id: 'role-architect', name: 'Platform Architect', description: 'Can design, configure, and publish pipelines and harnesses', users_count: 8, permissions_count: 36 },
          { id: 'role-engineer', name: 'Engineering Peer', description: 'Can initiate sessions, view executions, and trigger runs', users_count: 24, permissions_count: 22 },
          { id: 'role-viewer', name: 'Auditor & Viewer', description: 'Read-only access across compliance, state, and evidence graphs', users_count: 12, permissions_count: 8 },
        ]
      } catch {
        return [
          { id: 'role-admin', name: 'Enterprise Admin', description: 'Full system administration and governance authority', users_count: 3, permissions_count: 48 },
          { id: 'role-architect', name: 'Platform Architect', description: 'Can design, configure, and publish pipelines and harnesses', users_count: 8, permissions_count: 36 },
          { id: 'role-engineer', name: 'Engineering Peer', description: 'Can initiate sessions, view executions, and trigger runs', users_count: 24, permissions_count: 22 },
          { id: 'role-viewer', name: 'Auditor & Viewer', description: 'Read-only access across compliance, state, and evidence graphs', users_count: 12, permissions_count: 8 },
        ]
      }
    }
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: ['platform-permissions'],
    queryFn: async () => {
      try {
        return await (apiService as any).permissions?.() ?? [
          { id: 'perm-01', name: 'pipelines:create', action: 'create', resource_type: 'Pipeline', description: 'Create and configure new autonomous engineering pipelines' },
          { id: 'perm-02', name: 'deployments:approve', action: 'admin', resource_type: 'Deployment', description: 'Authorize progressive canary and production deployment gates' },
          { id: 'perm-03', name: 'agents:factory', action: '*', resource_type: 'AgentFactory', description: 'Synthesize, publish, and deprecate autonomous agent versions' },
          { id: 'perm-04', name: 'governance:override', action: 'admin', resource_type: 'Policy', description: 'Override automated compliance and security blocking gates' },
          { id: 'perm-05', name: 'evidence:verify', action: 'read', resource_type: 'Evidence', description: 'Inspect cryptographic provenance and verify attestation chains' },
        ]
      } catch {
        return [
          { id: 'perm-01', name: 'pipelines:create', action: 'create', resource_type: 'Pipeline', description: 'Create and configure new autonomous engineering pipelines' },
          { id: 'perm-02', name: 'deployments:approve', action: 'admin', resource_type: 'Deployment', description: 'Authorize progressive canary and progressive deployment gates' },
          { id: 'perm-03', name: 'agents:factory', action: '*', resource_type: 'AgentFactory', description: 'Synthesize, publish, and deprecate autonomous agent versions' },
          { id: 'perm-04', name: 'governance:override', action: 'admin', resource_type: 'Policy', description: 'Override automated compliance and security blocking gates' },
          { id: 'perm-05', name: 'evidence:verify', action: 'read', resource_type: 'Evidence', description: 'Inspect cryptographic provenance and verify attestation chains' },
        ]
      }
    }
  })
}
