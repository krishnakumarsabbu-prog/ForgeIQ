import { useSkills } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui/PageHeader'
import type { Skill } from '../types'
import { Plus, Sparkles } from 'lucide-react'

const categoryColors: Record<string, string> = {
  engineering: 'bg-forgeiq-50 text-forgeiq-700 border border-forgeiq-200',
  analysis: 'bg-blue-50 text-blue-700 border border-blue-200',
  testing: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  security: 'bg-red-50 text-red-700 border border-red-200',
  deployment: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function SkillsPage() {
  const { data, isLoading } = useSkills()

  return (
    <>
      <PageHeader
        title="Skills"
        description="Reusable skill modules available to agents"
        actions={
          <button className="fi-button-primary">
            <Plus className="h-4 w-4" /> New Skill
          </button>
        }
      />

      <div className="p-6">
        <div className="fi-card">
          {isLoading ? (
            <LoadingSpinner />
          ) : !data || data.length === 0 ? (
            <EmptyState message="No skills found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="fi-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Language</th>
                    <th>Framework</th>
                    <th className="text-right">Capabilities</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((skill: Skill) => (
                    <tr key={skill.id}>
                      <td className="font-medium text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-forgeiq-600" />
                        {skill.display_name || skill.name}
                      </td>
                      <td>
                        <span className={`fi-badge ${categoryColors[skill.category] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {skill.category}
                        </span>
                      </td>
                      <td className="text-slate-600">{skill.language}</td>
                      <td className="text-slate-600">{skill.framework}</td>
                      <td className="text-right text-slate-600">{skill.capabilities.length}</td>
                      <td>
                        <span className={`fi-badge ${skill.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          {skill.active ? 'active' : 'inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
