import { useState } from 'react'
import { explainLogs } from '../../api/logApi'
import { HIGH_SEVERITY_LEVELS } from '../../types'
import { useLogStore } from '../../store/useLogStore'

const CONFIDENCE_STYLES = {
  high: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  low: 'border-slate-700 bg-slate-800 text-slate-400',
}

interface AIPanelProps {
  onCopyCurrentView?: () => void
  copied?: boolean
}

export function AIPanel({ onCopyCurrentView, copied = false }: AIPanelProps) {
  const { result, aiResponse, setAIResponse, isExplaining, setIsExplaining, filteredEvents } = useLogStore()
  const [provider, setProvider] = useState<'anthropic' | 'groq'>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [query, setQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  if (!result) return null

  const handleExplain = async () => {
    const events = filteredEvents()
    if (events.length === 0) return

    setIsExplaining(true)
    setAIResponse(null)
    setErrorMessage('')

    try {
      const res = await explainLogs(
        events,
        query.trim() || 'Explain the root cause of the issues in these logs.',
        provider,
        apiKey || undefined,
      )
      setAIResponse(res)
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setIsExplaining(false)
    }
  }

  const eventCount = filteredEvents().length
  const errorCount = filteredEvents().filter((e) => HIGH_SEVERITY_LEVELS.includes(e.level)).length

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15">
            <svg className="h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-100">AI Root Cause Analysis</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Analyzing <span className="text-slate-300">{eventCount}</span> events
              {errorCount > 0 && (
                <>
                  , including <span className="text-rose-300">{errorCount} high-severity events</span>
                </>
              )}
              . AI receives only critical and relevant events.
            </p>
          </div>
          {onCopyCurrentView && (
            <button
              onClick={onCopyCurrentView}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all duration-150 hover:border-slate-500 hover:bg-slate-900"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-8-4h8m3 12H5a2 2 0 01-2-2V6a2 2 0 012-2h8.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
              </svg>
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <label className="text-xs text-slate-500">AI provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'anthropic' | 'groq')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="anthropic">Anthropic / Claude</option>
            <option value="groq">Groq</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-500">API key (optional)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste Anthropic or Groq key"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-slate-500">Custom query (optional)</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Why are database connections timing out?"
          rows={2}
          className="
            w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200
            placeholder:text-slate-600 transition-colors focus:border-indigo-500/50 focus:outline-none
            resize-none
          "
        />
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          <p className="font-semibold">AI request failed</p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5">{errorMessage}</p>
          {provider === 'groq' && (
            <p className="mt-2 text-[11px] text-slate-400">
              Hint: make sure your Groq key is valid and that the selected model is available for your account.
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleExplain}
        disabled={isExplaining || eventCount === 0}
        className="
          flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium
          bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_10px_30px_rgba(99,102,241,0.22)]
          transition-all duration-150 hover:from-indigo-400 hover:to-violet-500 active:translate-y-px
          disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        {isExplaining ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Analyzing with {provider === 'groq' ? 'Groq' : 'Claude'}...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            Explain root cause
          </>
        )}
      </button>

      {aiResponse && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Root cause</p>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${CONFIDENCE_STYLES[aiResponse.confidence]}`}>
                {aiResponse.confidence} confidence
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-100">{aiResponse.root_cause}</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Explanation</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{aiResponse.explanation}</p>
          </div>

          {aiResponse.possible_fixes.length > 0 && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Possible fixes</p>
              <ul className="space-y-2">
                {aiResponse.possible_fixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-300">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-5 text-slate-300">{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiResponse.next_steps.length > 0 && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Next debugging steps</p>
              <ul className="space-y-2">
                {aiResponse.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm leading-5 text-slate-300">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
