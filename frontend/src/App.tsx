import { Routes, Route, Link } from 'react-router-dom'
import { Component, type ReactNode } from 'react'
import { AppLayout } from './components/layouts/AppLayout'
import CommandCenter from './pages/CommandCenter'
import ApplicationsPage from './pages/ApplicationsPage'
import ApplicationDetail from './pages/ApplicationDetail'
import StartEngineeringPage from './pages/StartEngineeringPage'
import BrownfieldImportPage from './pages/BrownfieldImportPage'
import RequirementsPage from './pages/RequirementsPage'
import AgentsPage from './pages/AgentsPage'
import AgentDetail from './pages/AgentDetail'
import AgentFactoryPage from './pages/AgentFactoryPage'
import AgentTestWorkspace from './pages/AgentTestWorkspace'
import SkillsPage from './pages/SkillsPage'
import ToolsPage from './pages/ToolsPage'
import ModelsPage from './pages/ModelsPage'
import HarnessesPage from './pages/HarnessesPage'
import HarnessDetail from './pages/HarnessDetail'
import HarnessBuilderPage from './pages/HarnessBuilderPage'
import GraphEngineeringPage from './pages/GraphEngineeringPage'
import LoopEngineeringPage from './pages/LoopEngineeringPage'
import LoopBuilderPage from './pages/LoopBuilderPage'
import HarnessTemplatesPage from './pages/HarnessTemplatesPage'
import PipelinesPage from './pages/PipelinesPage'
import PipelineDetail from './pages/PipelineDetail'
import PipelineBuilderPage from './pages/PipelineBuilderPage'
import PipelineTemplatesPage from './pages/PipelineTemplatesPage'
import ExecutionsPage from './pages/ExecutionsPage'
import ExecutionDetail from './pages/ExecutionDetail'
import EvidencePage from './pages/EvidencePage'
import EngineeringStatePage from './pages/EngineeringStatePage'
import PoliciesPage from './pages/PoliciesPage'
import AuditPage from './pages/AuditPage'
import TenantsPage from './pages/TenantsPage'
import UsersRolesPage from './pages/UsersRolesPage'
import SettingsPage from './pages/SettingsPage'
import BuildAutomationPage from './pages/BuildAutomationPage'
import ReleaseAutomationPage from './pages/ReleaseAutomationPage'
import DeploymentsPage from './pages/DeploymentsPage'
import EnvironmentsPage from './pages/EnvironmentsPage'
import AgentExecutionsPage from './pages/AgentExecutionsPage'
import HarnessVersionsPage from './pages/HarnessVersionsPage'
import QualityPage from './pages/QualityPage'
import SecurityPage from './pages/SecurityPage'
import EngineeringEconomicsPage from './pages/EngineeringEconomicsPage'
import PermissionsPage from './pages/PermissionsPage'
import GovernancePage from './pages/GovernancePage'
import PeerEngineeringWorkspace from './pages/PeerEngineeringWorkspace'
import ApprovalsPage from './pages/ApprovalsPage'
import IncidentsPage from './pages/IncidentsPage'
import IncidentDetail from './pages/IncidentDetail'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-500 mb-4 max-w-md">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <Link to="/" className="fi-btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
            Return to Command Center
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">404</h1>
      <p className="text-sm text-slate-500 mb-4">The page you are looking for does not exist.</p>
      <Link to="/" className="fi-btn-primary">Return to Command Center</Link>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/start-engineering" element={<StartEngineeringPage />} />
      <Route path="/peer-engineering" element={<PeerEngineeringWorkspace />} />
        <Route path="/brownfield-import" element={<BrownfieldImportPage />} />
        <Route path="/requirements" element={<RequirementsPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/agents/:id/test" element={<AgentTestWorkspace />} />
        <Route path="/agent-factory" element={<AgentFactoryPage />} />
        <Route path="/agent-executions" element={<AgentExecutionsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/harnesses" element={<HarnessesPage />} />
        <Route path="/harnesses/:id" element={<HarnessDetail />} />
        <Route path="/harness-builder" element={<HarnessBuilderPage />} />
        <Route path="/graph-engineering" element={<GraphEngineeringPage />} />
        <Route path="/loop-engineering" element={<LoopEngineeringPage />} />
        <Route path="/loop-builder" element={<LoopBuilderPage />} />
        <Route path="/loop-builder/:id" element={<LoopBuilderPage />} />
        <Route path="/harness-templates" element={<HarnessTemplatesPage />} />
        <Route path="/pipelines" element={<PipelinesPage />} />
        <Route path="/pipelines/:id" element={<PipelineDetail />} />
        <Route path="/pipeline-builder" element={<PipelineBuilderPage />} />
        <Route path="/pipeline-templates" element={<PipelineTemplatesPage />} />
        <Route path="/executions" element={<ExecutionsPage />} />
        <Route path="/executions/:id" element={<ExecutionDetail />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/engineering-state" element={<EngineeringStatePage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/build-automation" element={<BuildAutomationPage />} />
        <Route path="/release-automation" element={<ReleaseAutomationPage />} />
        <Route path="/deployments" element={<DeploymentsPage />} />
        <Route path="/environments" element={<EnvironmentsPage />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/users" element={<UsersRolesPage />} />
        <Route path="/harness-versions" element={<HarnessVersionsPage />} />
        <Route path="/quality" element={<QualityPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/engineering-economics" element={<EngineeringEconomicsPage />} />
        <Route path="/permissions" element={<PermissionsPage />} />
        <Route path="/governance" element={<GovernancePage />} />
      <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  )
}
