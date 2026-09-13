import { useState } from 'react'
import { Trash2, CornerDownRight, LogOut } from 'lucide-react'
import type { Agent, Skill, Tool } from '../../types'

interface InspectorNodeData {
  node_type: string
  label: string
  ref_id?: string
  config: Record<string, unknown>
  description?: string
  is_entry?: boolean
  is_terminal?: boolean
  inputs?: string[]
  outputs?: string[]
}

interface GraphNodeInspectorProps {
  node: { id: string; data: unknown } | null
  agents: Agent[]
  skills: Skill[]
  tools: Tool[]
  onUpdate: (id: string, patch: Partial<InspectorNodeData>) => void
  onDelete: (id: string) => void
}

const REF_TYPES = ['agent', 'skill', 'tool']

export function GraphNodeInspector({ node, agents, skills, tools, onUpdate, onDelete }: GraphNodeInspectorProps) {
  const [inputsText, setInputsText] = useState('')
  const [outputsText, setOutputsText] = useState('')

  if (!node) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Node Inspector</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs px-4 text-center">
          Select a node on the canvas to edit its properties
        </div>
      </div>
    )
  }

  const d = node.data as InspectorNodeData

  const handleInputsChange = (text: string) => {
    setInputsText(text)
    const inputs = text.split(',').map(s => s.trim()).filter(Boolean)
    onUpdate(node.id, { inputs })
  }

  const handleOutputsChange = (text: string) => {
    setOutputsText(text)
    const outputs = text.split(',').map(s => s.trim()).filter(Boolean)
    onUpdate(node.id, { outputs })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Node Inspector</h3>
        <button onClick={() => onDelete(node.id)} className="p-1 rounded text-red-500 hover:bg-red-50" title="Delete node">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Label</label>
          <input
            type="text"
            value={d.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="fi-input mt-1 w-full"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Type</label>
          <div className="mt-1 text-sm text-slate-700 capitalize">{d.node_type}</div>
        </div>

        {REF_TYPES.includes(d.node_type) && (
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Reference</label>
            <select
              value={d.ref_id || ''}
              onChange={(e) => onUpdate(node.id, { ref_id: e.target.value || undefined })}
              className="fi-input mt-1 w-full"
            >
              <option value="">-- Select --</option>
              {d.node_type === 'agent' && agents.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              {d.node_type === 'skill' && skills.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              {d.node_type === 'tool' && tools.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Description</label>
          <textarea
            value={d.description || ''}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
            className="fi-input mt-1 w-full text-sm"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={d.is_entry || false}
              onChange={(e) => onUpdate(node.id, { is_entry: e.target.checked })}
              className="rounded border-slate-300"
            />
            <CornerDownRight size={12} className="text-forgeiq-600" />
            <span className="text-xs text-slate-700">Entry Node</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={d.is_terminal || false}
              onChange={(e) => onUpdate(node.id, { is_terminal: e.target.checked })}
              className="rounded border-slate-300"
            />
            <LogOut size={12} className="text-rose-600" />
            <span className="text-xs text-slate-700">Terminal Node</span>
          </label>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Inputs (comma-separated)</label>
          <input
            type="text"
            value={inputsText || (d.inputs || []).join(', ')}
            onChange={(e) => handleInputsChange(e.target.value)}
            placeholder="requirement, context"
            className="fi-input mt-1 w-full"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Outputs (comma-separated)</label>
          <input
            type="text"
            value={outputsText || (d.outputs || []).join(', ')}
            onChange={(e) => handleOutputsChange(e.target.value)}
            placeholder="code, tests"
            className="fi-input mt-1 w-full"
          />
        </div>
      </div>
    </div>
  )
}
