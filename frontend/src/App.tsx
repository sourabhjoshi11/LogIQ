import { useState } from 'react'
import { useLogStore } from './store/useLogStore'
import { HIGH_SEVERITY_LEVELS } from './types'
import { Sidebar } from './components/Layout/Sidebar'
import { ErrorBoundary } from './components/Layout/ErrorBoundary'
import { DropZone } from './components/Upload/DropZone'
import { LogEditor } from './components/Editor/LogEditor'
import { LogCard } from './components/LogCard/LogCard'
import { FilterBar } from './components/Filters/FilterBar'
import { Timeline } from './components/Timeline/Timeline'
import { StatsPanel } from './components/Stats/StatsPanel'
import { AIPanel } from './components/AI/AIPanel'

function formatLogEvent(event: ReturnType<typeof useLogStore.getState>['filteredEvents'] extends () => (infer T)[] ? T : never) {
  const parts = [
    event.timestamp ?? '',
    event.level,
    event.service ?? event.logger ?? '',
    event.message,
  ].filter(Boolean)

  const meta: string[] = []
  if (event.http_method && event.url) meta.push(`${event.http_method} ${event.url}`)
  if (event.status_code) meta.push(`status=${event.status_code}`)
  if (event.duration_ms) meta.push(`duration_ms=${event.duration_ms}`)
  if (event.request_id) meta.push(`request_id=${event.request_id}`)
  if (event.trace_id) meta.push(`trace_id=${event.trace_id}`)
  if (event.exception) meta.push(`exception=${event.exception}`)

  return `${parts.join(' | ')}${meta.length > 0 ? `\n${meta.join(' | ')}` : ''}`
}

function buildCopyText(params: {
  activeTab: 'logs' | 'timeline' | 'stats' | 'ai'
  result: NonNullable<ReturnType<typeof useLogStore.getState>['result']>
  filteredEvents: ReturnType<typeof useLogStore.getState>['filteredEvents']
  aiResponse: ReturnType<typeof useLogStore.getState>['aiResponse']
}) {
  const { activeTab, result, filteredEvents, aiResponse } = params

  if (activeTab === 'logs') {
    const events = filteredEvents()
    return events.length > 0
      ? events.map(formatLogEvent).join('\n\n')
      : 'No filtered log events to copy.'
  }

  if (activeTab === 'timeline') {
    return result.timeline.length > 0
      ? result.timeline
          .map((entry) => [entry.timestamp ?? '', entry.level, entry.message, entry.exception ?? '', entry.url ?? ''].filter(Boolean).join(' | '))
          .join('\n')
      : 'No timeline events to copy.'
  }

  if (activeTab === 'stats') {
    const { statistics } = result
    const levelLines = Object.entries(statistics.level_counts)
      .sort(([, a], [, b]) => b - a)
      .map(([level, count]) => `${level}: ${count}`)
      .join('\n')

    return [
      `Format: ${result.format}`,
      `Parsed in: ${result.parse_time_ms}ms`,
      `Total events: ${statistics.total_events}`,
      `Total lines: ${statistics.total_lines}`,
      `Error rate: ${statistics.error_rate}%`,
      '',
      'Level distribution:',
      levelLines,
    ].join('\n')
  }

  if (!aiResponse) {
    return 'No AI analysis available to copy.'
  }

  return [
    `Root cause: ${aiResponse.root_cause}`,
    `Confidence: ${aiResponse.confidence}`,
    '',
    'Explanation:',
    aiResponse.explanation,
    '',
    'Possible fixes:',
    aiResponse.possible_fixes.map((fix, index) => `${index + 1}. ${fix}`).join('\n') || 'None',
    '',
    'Next steps:',
    aiResponse.next_steps.map((step, index) => `${index + 1}. ${step}`).join('\n') || 'None',
  ].join('\n')
}

function VirtualList() {
  const { filteredEvents, selectedEventId, setSelectedEventId, parseError } = useLogStore()
  const events = filteredEvents()

  if (parseError) {
    return (
      <div className="m-4 flex items-center gap-3 rounded-xl border border-red-900/70 bg-red-500/10 p-4 text-red-200">
        <svg className="h-4 w-4 shrink-0 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-sm">{parseError}</span>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
        <svg className="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-sm">No events match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 px-4 pb-4">
      {events.map((ev) => (
        <LogCard
          key={ev.id}
          event={ev}
          isSelected={ev.id === selectedEventId}
          onClick={() => setSelectedEventId(selectedEventId === ev.id ? null : ev.id)}
        />
      ))}
    </div>
  )
}

function LandingScreen() {
  const { parseError } = useLogStore()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          No login required
        </div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-100">
          Understand any log file in seconds
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
          Paste or upload your logs. LogLens auto-detects the format, extracts structured events,
          builds a timeline, and lets you ask AI to explain root causes.
        </p>
      </div>

      <div className="w-full space-y-4">
        <DropZone />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800/80" />
          <span className="text-xs text-slate-500">or paste logs</span>
          <div className="h-px flex-1 bg-slate-800/80" />
        </div>
        <LogEditor />
      </div>

      {parseError && (
        <div className="mt-4 flex w-full items-center gap-2 rounded-lg border border-red-900/70 bg-red-500/10 p-3 text-red-200">
          <span className="text-sm">{parseError}</span>
        </div>
      )}

      <div className="mt-10 text-center">
        <p className="mb-3 text-xs text-slate-500">Supported formats</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Python',
            'FastAPI',
            'Node.js',
            'Java',
            'Spring',
            'Docker',
            'Kubernetes',
            'NGINX',
            'Apache',
            'AWS Lambda',
            'JSON',
            'Generic',
          ].map((f) => (
            <span key={f} className="rounded border border-slate-800/80 bg-slate-900/40 px-2 py-0.5 text-[11px] text-slate-400">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function App() {
  const { result, activeTab, isParsing, clearResult, filteredEvents, aiResponse } = useLogStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyCurrentView = async () => {
    if (!result) return
    const text = buildCopyText({ activeTab, result, filteredEvents, aiResponse })
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const highSeverityCount = result
    ? HIGH_SEVERITY_LEVELS.reduce((sum, level) => sum + (result.statistics.level_counts[level] ?? 0), 0)
    : 0

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-950 text-slate-200">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/55 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed z-30 h-full transition-transform duration-200 md:fixed md:inset-y-0 md:left-0 md:z-auto md:w-48
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden md:pl-48">
        <div className="hidden items-center justify-end gap-3 border-b border-slate-800/80 bg-slate-950/55 px-4 py-3 backdrop-blur md:flex">
          {result && (
            <button
              onClick={clearResult}
              className="
                inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-2
                text-sm font-medium text-indigo-300 shadow-[0_10px_30px_rgba(99,102,241,0.14)]
                transition-all duration-150 hover:border-indigo-400/40 hover:bg-indigo-500/15 hover:text-indigo-200
              "
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New analysis
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/70 px-4 py-3 backdrop-blur md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-300">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="LogLens" className="h-6 w-6 rounded-md bg-slate-900/70 p-1" />
            <span className="text-sm font-semibold text-slate-100">LogLens</span>
          </div>
        </div>

        <ErrorBoundary>
          {!result ? (
            <div className="flex flex-1">
              {isParsing ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                  <p className="text-sm text-slate-400">Parsing your logs...</p>
                </div>
              ) : (
                <LandingScreen />
              )}
            </div>
          ) : (
            <div className="flex min-h-full flex-col">
              <div className="flex shrink-0 items-center gap-4 border-b border-slate-800/80 bg-slate-950/40 px-4 py-2.5 backdrop-blur">
                <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-xs text-indigo-300">
                  {result.format}
                </span>
                <span className="text-xs text-slate-500">{result.statistics.total_events.toLocaleString()} events</span>
                {highSeverityCount > 0 && (
                  <span className="text-xs text-red-300">
                    {highSeverityCount} high-severity
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-500">parsed in {result.parse_time_ms}ms</span>
              </div>

              {activeTab === 'logs' && (
                <div className="shrink-0 border-b border-slate-800/80 px-4 py-3">
                  <FilterBar onCopyCurrentView={handleCopyCurrentView} copied={copied} />
                </div>
              )}

              <div className="flex-1 overflow-auto">
                {activeTab === 'logs' && (
                  <div className="pt-3">
                    <VirtualList />
                  </div>
                )}
                {activeTab === 'timeline' && <Timeline onCopyCurrentView={handleCopyCurrentView} copied={copied} />}
                {activeTab === 'stats' && <StatsPanel onCopyCurrentView={handleCopyCurrentView} copied={copied} />}
                {activeTab === 'ai' && <AIPanel onCopyCurrentView={handleCopyCurrentView} copied={copied} />}
              </div>
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  )
}
