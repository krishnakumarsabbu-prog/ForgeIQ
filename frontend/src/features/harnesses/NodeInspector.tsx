import { useState } from 'react'
import { Trash2, Code2, Settings2 } from 'lucide-react'
import type { Agent, Skill, Tool, ModelConfiguration, Loop, Policy } from '../../types'
import type { BuilderNode } from './types'

interface NodeInspectorProps {
  node: BuilderNode | null
  agents: Agent[]
  skills: Skill[]
  tools: Tool[]
  models: ModelConfiguration[]
  loops: Loop[]
  policies: Policy[]
  onUpdate: (id: string, patch: Partial<BuilderNode['data']>) => void
  onDelete: (id: string) => void
}

export function NodeInspector({ node, agents, skills, tools, models, loops, policies, onUpdate, onDelete }: NodeInspectorProps) {
  const [view, setView] = useState<'form' | 'json'>('form')

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Select a node to configure
      </div>
    )
  }

  const d = node.data
  const nt = d.node_type

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{nt}</div>
          <div className="text-sm font-semibold text-slate-900 truncate">{d.label}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView(view === 'form' ? 'json' : 'form')}
            className="p-1 rounded hover:bg-slate-200 text-slate-500"
            title={view === 'form' ? 'JSON view' : 'Form view'}
          >
            {view === 'form' ? <Code2 size={14} /> : <Settings2 size={14} />}
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
            title="Delete node"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {view === 'json' ? (
          <pre className="text-xs text-slate-700 bg-slate-50 rounded p-2 overflow-auto font-mono">
            {JSON.stringify({ ...node, data: d }, null, 2)}
          </pre>
        ) : (
          <div className="space-y-3">
            <FormField label="Label">
              <input
                type="text"
                value={d.label}
                onChange={(e) => onUpdate(node.id, { label: e.target.value })}
                className="fi-input"
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={d.description || ''}
                onChange={(e) => onUpdate(node.id, { description: e.target.value })}
                className="fi-input"
                rows={2}
              />
            </FormField>

            {/* Agent node */}
            {nt === 'agent' && (
              <>
                <FormField label="Agent">
                  <select
                    value={d.ref_id || ''}
                    onChange={(e) => onUpdate(node.id, { ref_id: e.target.value })}
                    className="fi-input"
                  >
                    <option value="">— Select agent —</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.display_name} ({a.role})</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Model">
                  <select
                    value={(d.config.model_config_id as string) || ''}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, model_config_id: e.target.value } })}
                    className="fi-input"
                  >
                    <option value="">— Default —</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.display_name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Timeout (seconds)">
                  <input
                    type="number"
                    value={(d.config.timeout_seconds as number) || 300}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, timeout_seconds: Number(e.target.value) } })}
                    className="fi-input"
                  />
                </FormField>
                <FormField label="Token Budget">
                  <input
                    type="number"
                    value={(d.config.token_budget as number) || 100000}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, token_budget: Number(e.target.value) } })}
                    className="fi-input"
                  />
                </FormField>
                <FormField label="Cost Budget (cents)">
                  <input
                    type="number"
                    value={(d.config.cost_budget_cents as number) || 5000}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, cost_budget_cents: Number(e.target.value) } })}
                    className="fi-input"
                  />
                </FormField>
                <FormField label="Permissions (comma-separated)">
                  <input
                    type="text"
                    value={((d.config.permissions as string[]) || []).join(', ')}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, permissions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
                    className="fi-input"
                    placeholder="read, write, execute"
                  />
                </FormField>
              </>
            )}

            {/* Skill node */}
            {nt === 'skill' && (
              <FormField label="Skill">
                <select
                  value={d.ref_id || ''}
                  onChange={(e) => onUpdate(node.id, { ref_id: e.target.value })}
                  className="fi-input"
                >
                  <option value="">— Select skill —</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>{s.display_name} ({s.category})</option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Tool node */}
            {nt === 'tool' && (
              <>
                <FormField label="Tool">
                  <select
                    value={d.ref_id || ''}
                    onChange={(e) => onUpdate(node.id, { ref_id: e.target.value })}
                    className="fi-input"
                  >
                    <option value="">— Select tool —</option>
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>{t.display_name} ({t.risk_level})</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Operation">
                  <input
                    type="text"
                    value={(d.config.operation as string) || 'execute'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, operation: e.target.value } })}
                    className="fi-input"
                  />
                </FormField>
                <FormField label="Environment">
                  <select
                    value={(d.config.environment as string) || 'development'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, environment: e.target.value } })}
                    className="fi-input"
                  >
                    <option value="development">development</option>
                    <option value="staging">staging</option>
                    <option value="production">production</option>
                  </select>
                </FormField>
                <FormField label="Permissions (comma-separated)">
                  <input
                    type="text"
                    value={((d.config.permissions as string[]) || []).join(', ')}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, permissions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
                    className="fi-input"
                  />
                </FormField>
              </>
            )}

            {/* Approval node */}
            {nt === 'approval' && (
              <>
                <FormField label="Approver Role">
                  <select
                    value={(d.config.approver_role as string) || 'Engineering Lead'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, approver_role: e.target.value } })}
                    className="fi-input"
                  >
                    <option value="Engineering Lead">Engineering Lead</option>
                    <option value="Security Engineer">Security Engineer</option>
                    <option value="Release Manager">Release Manager</option>
                    <option value="Tenant Administrator">Tenant Administrator</option>
                  </select>
                </FormField>
                <FormField label="Condition">
                  <input
                    type="text"
                    value={(d.config.condition as string) || ''}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, condition: e.target.value } })}
                    className="fi-input"
                    placeholder="e.g. risk_level == 'HIGH'"
                  />
                </FormField>
                <FormField label="Timeout (seconds)">
                  <input
                    type="number"
                    value={(d.config.timeout_seconds as number) || 3600}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, timeout_seconds: Number(e.target.value) } })}
                    className="fi-input"
                  />
                </FormField>
                <FormField label="Escalation">
                  <input
                    type="text"
                    value={(d.config.escalation as string) || ''}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, escalation: e.target.value } })}
                    className="fi-input"
                    placeholder="Escalation path"
                  />
                </FormField>
              </>
            )}

            {/* Verification node */}
            {nt === 'verification' && (
              <>
                <FormField label="Verification Type">
                  <select
                    value={(d.config.verification_type as string) || 'health_check'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, verification_type: e.target.value } })}
                    className="fi-input"
                  >
                    <option value="health_check">Health Check</option>
                    <option value="smoke_test">Smoke Test</option>
                    <option value="functional_test">Functional Test</option>
                    <option value="api_test">API Test</option>
                    <option value="performance_test">Performance Test</option>
                    <option value="security_scan">Security Scan</option>
                  </select>
                </FormField>
                <FormField label="Expected State">
                  <input
                    type="text"
                    value={(d.config.expected_state as string) || 'healthy'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, expected_state: e.target.value } })}
                    className="fi-input"
                  />
                </FormField>
                <FormField label="Failure Behavior">
                  <select
                    value={(d.config.failure_behavior as string) || 'retry'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, failure_behavior: e.target.value } })}
                    className="fi-input"
                  >
                    <option value="retry">Retry</option>
                    <option value="rollback">Rollback</option>
                    <option value="escalate">Escalate</option>
                    <option value="fail">Fail</option>
                  </select>
                </FormField>
              </>
            )}

            {/* Condition / Decision node */}
            {(nt === 'condition' || nt === 'decision') && (
              <FormField label="Condition Expression">
                <input
                  type="text"
                  value={(d.config.expression as string) || ''}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, expression: e.target.value } })}
                  className="fi-input"
                  placeholder="e.g. tests_passed == true"
                />
              </FormField>
            )}

            {/* Parallel / Merge node */}
            {(nt === 'parallel' || nt === 'merge') && (
              <FormField label="Branch Count">
                <input
                  type="number"
                  value={(d.config.branch_count as number) || 2}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, branch_count: Number(e.target.value) } })}
                  className="fi-input"
                />
              </FormField>
            )}

            {/* Policy node */}
            {nt === 'policy' && (
              <FormField label="Policy">
                <select
                  value={d.ref_id || ''}
                  onChange={(e) => onUpdate(node.id, { ref_id: e.target.value })}
                  className="fi-input"
                >
                  <option value="">— Select policy —</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.display_name} ({p.policy_type})</option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Loop reference */}
            {nt === 'retry' && (
              <>
                <FormField label="Loop">
                  <select
                    value={d.ref_id || ''}
                    onChange={(e) => onUpdate(node.id, { ref_id: e.target.value })}
                    className="fi-input"
                  >
                    <option value="">— Select loop —</option>
                    {loops.map((l) => (
                      <option key={l.id} value={l.id}>{l.display_name} ({l.loop_type})</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Max Retries">
                  <input
                    type="number"
                    value={(d.config.max_retries as number) || 3}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, max_retries: Number(e.target.value) } })}
                    className="fi-input"
                  />
                </FormField>
              </>
            )}

            {/* Failure handler */}
            {nt === 'failure_handler' && (
              <FormField label="Failure Action">
                <select
                  value={(d.config.action as string) || 'diagnose'}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, action: e.target.value } })}
                  className="fi-input"
                >
                  <option value="diagnose">Diagnose</option>
                  <option value="rollback">Rollback</option>
                  <option value="remediate">Remediate</option>
                  <option value="escalate">Escalate</option>
                </select>
              </FormField>
            )}

            {/* Escalation */}
            {nt === 'escalation' && (
              <>
                <FormField label="Escalate To">
                  <select
                    value={(d.config.escalate_to as string) || 'Engineering Lead'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, escalate_to: e.target.value } })}
                    className="fi-input"
                  >
                    <option value="Engineering Lead">Engineering Lead</option>
                    <option value="Security Engineer">Security Engineer</option>
                    <option value="Release Manager">Release Manager</option>
                    <option value="Tenant Administrator">Tenant Administrator</option>
                  </select>
                </FormField>
                <FormField label="Reason">
                  <input
                    type="text"
                    value={(d.config.reason as string) || ''}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, reason: e.target.value } })}
                    className="fi-input"
                  />
                </FormField>
              </>
            )}

            {/* Environment node */}
            {nt === 'environment' && (
              <FormField label="Environment">
                <select
                  value={(d.config.environment as string) || 'development'}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, environment: e.target.value } })}
                  className="fi-input"
                >
                  <option value="development">development</option>
                  <option value="staging">staging</option>
                  <option value="production">production</option>
                </select>
              </FormField>
            )}

            {/* Evidence node */}
            {nt === 'evidence' && (
              <FormField label="Evidence Type">
                <select
                  value={(d.config.evidence_type as string) || 'graph_execution'}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, evidence_type: e.target.value } })}
                  className="fi-input"
                >
                  <option value="graph_execution">Graph Execution</option>
                  <option value="agent_output">Agent Output</option>
                  <option value="tool_result">Tool Result</option>
                  <option value="code_change">Code Change</option>
                  <option value="test_result">Test Result</option>
                  <option value="security_scan">Security Scan</option>
                  <option value="build_result">Build Result</option>
                  <option value="deployment_result">Deployment Result</option>
                  <option value="verification_result">Verification Result</option>
                </select>
              </FormField>
            )}

            {/* Human task */}
            {nt === 'human_task' && (
              <>
                <FormField label="Assignee Role">
                  <select
                    value={(d.config.assignee_role as string) || 'Developer'}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, assignee_role: e.target.value } })}
                    className="fi-input"
                  >
                    <option value="Developer">Developer</option>
                    <option value="Engineering Lead">Engineering Lead</option>
                    <option value="Security Engineer">Security Engineer</option>
                    <option value="Release Manager">Release Manager</option>
                  </select>
                </FormField>
                <FormField label="Instructions">
                  <textarea
                    value={(d.config.instructions as string) || ''}
                    onChange={(e) => onUpdate(node.id, { config: { ...d.config, instructions: e.target.value } })}
                    className="fi-input"
                    rows={3}
                  />
                </FormField>
              </>
            )}

            {/* Artifact node */}
            {nt === 'artifact' && (
              <FormField label="Artifact Type">
                <select
                  value={(d.config.artifact_type as string) || 'build'}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, artifact_type: e.target.value } })}
                  className="fi-input"
                >
                  <option value="build">Build</option>
                  <option value="docker_image">Docker Image</option>
                  <option value="package">Package</option>
                  <option value="binary">Binary</option>
                </select>
              </FormField>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
