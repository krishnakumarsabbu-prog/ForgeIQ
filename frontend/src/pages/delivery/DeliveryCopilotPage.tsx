import React, { useState } from 'react'
import {
  MessageSquare, Send, Sparkles, Bot, User, ShieldCheck,
  CheckCircle2, ArrowRight, Zap, RefreshCw
} from 'lucide-react'
import { api } from '../../api/client'

interface Message {
  sender: 'user' | 'assistant'
  content: string
  confidence?: number
  evidence?: Array<{ label: string; id: string }>
  suggested_actions?: Array<{ label: string; action: string; target?: string }>
}

export default function DeliveryCopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      content:
        'Hello! I am your **ForgeIQ AI Scrum Master Copilot**. I continuously observe delivery signals across Jira, Git, and CI/CD pipelines to assist you with sprint health, root-cause velocity analysis, and automated engineering remediation.\n\nTry asking me a question below or pick a recommended prompt.',
      confidence: 0.98,
      evidence: [],
      suggested_actions: [
        { label: 'How healthy is Sprint 42?', action: 'QUERY_SPRINT_HEALTH' },
        { label: 'Why is velocity down?', action: 'QUERY_VELOCITY' },
        { label: 'What needs my attention?', action: 'QUERY_ATTENTION' },
        { label: 'What if Team B slips two days?', action: 'QUERY_SLIP' },
      ],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim()
    if (!queryText || loading) return

    const userMsg: Message = { sender: 'user', content: queryText }
    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await api.post<any>('/delivery-intelligence/copilot/query', {
        prompt: queryText,
      })
      const botMsg: Message = {
        sender: 'assistant',
        content: res.answer,
        confidence: res.confidence,
        evidence: res.evidence,
        suggested_actions: res.suggested_actions,
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        sender: 'assistant',
        content: 'Error processing your request: ' + err.message,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Sparkles size={12} /> AI Scrum Master Copilot
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Delivery Intelligence Copilot
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Natural-language dialogue grounded in live delivery state, graph dependencies, and engineering evidence.
          </p>
        </div>
      </div>

      {/* Preset Pill Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 shrink-0 font-medium">Quick Queries:</span>
        {[
          'How healthy is Sprint 42?',
          'Why is velocity down?',
          'What needs my attention?',
          'What if Team B slips two days?',
          'Generate daily standup summary',
        ].map((pill) => (
          <button
            key={pill}
            onClick={() => handleSend(pill)}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-sky-500/50 hover:text-sky-500 text-slate-700 dark:text-slate-300 font-medium transition-all shrink-0 shadow-sm"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm min-h-[460px] flex flex-col justify-between gap-4">
        <div className="space-y-4 overflow-y-auto max-h-[550px] pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl max-w-2xl space-y-2 ${
                  m.sender === 'user'
                    ? 'bg-sky-600 text-white font-medium rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-line font-sans">{m.content}</div>

                {/* Evidence Attachments */}
                {m.evidence && m.evidence.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Grounded Evidence & State Links:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.evidence.map((ev, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300"
                        >
                          {ev.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Action Buttons */}
                {m.suggested_actions && m.suggested_actions.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {m.suggested_actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(act.label)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/25 transition-all"
                      >
                        {act.label} →
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin text-violet-500" />
                <span>Evaluating delivery signals & calculating evidence...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI Scrum Master anything about sprint health, risks, capacity, or blockers..."
            className="fi-input flex-1 text-xs py-2.5 px-3.5 rounded-xl"
          />
          <button
            disabled={loading || !input.trim()}
            onClick={() => handleSend()}
            className="fi-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Send size={14} /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
