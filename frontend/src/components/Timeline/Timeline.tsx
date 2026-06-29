import { useLogStore } from '../../store/useLogStore'
import { HIGH_SEVERITY_LEVELS } from '../../types'
import type { LogLevel, TimelineEntry } from '../../types'

const LEVEL_DOT: Record<LogLevel, string> = {
  TRACE: 'bg-cyan-500',
  DEBUG: 'bg-slate-600',
  VERBOSE: 'bg-teal-500',
  SILLY: 'bg-fuchsia-500',
  INFO: 'bg-sky-500',
  NOTICE: 'bg-emerald-500',
  WARNING: 'bg-amber-500',
  ERROR: 'bg-rose-500',
  CRITICAL: 'bg-rose-400 ring-2 ring-rose-800',
  FATAL: 'bg-red-500 ring-2 ring-red-800',
  ALERT: 'bg-orange-500 ring-2 ring-orange-800',
  EMERG: 'bg-yellow-400 ring-2 ring-yellow-700',
  UNKNOWN: 'bg-slate-700',
}

const LEVEL_TEXT: Record<LogLevel, string> = {
  TRACE: 'text-cyan-300',
  DEBUG: 'text-slate-500',
  VERBOSE: 'text-teal-300',
  SILLY: 'text-fuchsia-300',
  INFO: 'text-sky-300',
  NOTICE: 'text-emerald-300',
  WARNING: 'text-amber-300',
  ERROR: 'text-rose-300',
  CRITICAL: 'text-rose-200 font-semibold',
  FATAL: 'text-red-200 font-semibold',
  ALERT: 'text-orange-200 font-semibold',
  EMERG: 'text-yellow-100 font-semibold',
  UNKNOWN: 'text-slate-500',
}

function TimelineItem({
  entry,
  isLast,
  onClick,
}: {
  entry: TimelineEntry
  isLast: boolean
  onClick: () => void
}) {
  return (
    <div className="group flex cursor-pointer gap-4" onClick={onClick}>
      <div className="flex shrink-0 flex-col items-center">
        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL_DOT[entry.level]}`} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-slate-800" />}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="mb-0.5 flex items-center gap-2">
          <span className={`font-mono text-[11px] font-semibold ${LEVEL_TEXT[entry.level]}`}>
            {entry.level}
          </span>
          {entry.timestamp && <span className="font-mono text-[10px] text-slate-500">{entry.timestamp.replace('T', ' ').slice(0, 23)}</span>}
          {entry.method && (
            <span className="font-mono text-[11px] text-slate-400">
              {entry.method} {entry.url} {entry.status && `-> ${entry.status}`}
            </span>
          )}
        </div>
        <p
          className={`truncate text-sm leading-5 transition-colors group-hover:text-slate-100 ${
            HIGH_SEVERITY_LEVELS.includes(entry.level) ? 'text-slate-200' : 'text-slate-400'
          }`}
        >
          {entry.exception ? <span className="text-rose-300">{entry.exception}: </span> : null}
          {entry.message}
        </p>
      </div>
    </div>
  )
}

interface TimelineProps {
  onCopyCurrentView?: () => void
  copied?: boolean
}

export function Timeline({ onCopyCurrentView, copied = false }: TimelineProps) {
  const { result, setActiveTab, setSelectedEventId, setFilter } = useLogStore()

  if (!result) return null

  const { timeline } = result

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-sm">No significant events to display.</p>
        <p className="mt-1 text-xs">Only warning, high-severity, exception, and HTTP events appear here.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-200">Event Timeline</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{timeline.length} significant events</span>
          {onCopyCurrentView && (
            <button
              onClick={onCopyCurrentView}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all duration-150 hover:border-slate-500 hover:bg-slate-900"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-8-4h8m3 12H5a2 2 0 01-2-2V6a2 2 0 012-2h8.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
              </svg>
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      <div>
        {timeline.map((entry, i) => (
          <TimelineItem
            key={entry.id}
            entry={entry}
            isLast={i === timeline.length - 1}
            onClick={() => {
              setSelectedEventId(entry.id)
              setFilter('search', entry.id)
              setActiveTab('logs')
            }}
          />
        ))}
      </div>
    </div>
  )
}
