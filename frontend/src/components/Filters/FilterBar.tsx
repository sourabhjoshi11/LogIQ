import { useLogStore } from '../../store/useLogStore'
import { DISPLAY_LOG_LEVELS } from '../../types'
import type { LogLevel } from '../../types'

const LEVELS: LogLevel[] = DISPLAY_LOG_LEVELS

const LEVEL_STYLES: Record<LogLevel, string> = {
  TRACE: 'border-slate-700 text-slate-400 data-[active=true]:border-cyan-500/40 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-200',
  DEBUG: 'border-slate-700 text-slate-400 data-[active=true]:border-slate-600 data-[active=true]:bg-slate-700 data-[active=true]:text-slate-100',
  VERBOSE: 'border-slate-700 text-slate-400 data-[active=true]:border-teal-500/40 data-[active=true]:bg-teal-500/15 data-[active=true]:text-teal-200',
  SILLY: 'border-slate-700 text-slate-400 data-[active=true]:border-fuchsia-500/40 data-[active=true]:bg-fuchsia-500/15 data-[active=true]:text-fuchsia-200',
  INFO: 'border-slate-700 text-slate-400 data-[active=true]:border-sky-500/40 data-[active=true]:bg-sky-500/15 data-[active=true]:text-sky-200',
  NOTICE: 'border-slate-700 text-slate-400 data-[active=true]:border-emerald-500/40 data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-200',
  WARNING: 'border-slate-700 text-slate-400 data-[active=true]:border-amber-500/40 data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-200',
  ERROR: 'border-slate-700 text-slate-400 data-[active=true]:border-rose-500/40 data-[active=true]:bg-rose-500/15 data-[active=true]:text-rose-200',
  CRITICAL: 'border-slate-700 text-slate-400 data-[active=true]:border-rose-400/50 data-[active=true]:bg-rose-500/20 data-[active=true]:text-rose-100',
  FATAL: 'border-slate-700 text-slate-400 data-[active=true]:border-red-400/60 data-[active=true]:bg-red-500/20 data-[active=true]:text-red-100',
  ALERT: 'border-slate-700 text-slate-400 data-[active=true]:border-orange-400/50 data-[active=true]:bg-orange-500/20 data-[active=true]:text-orange-100',
  EMERG: 'border-slate-700 text-slate-400 data-[active=true]:border-yellow-300/50 data-[active=true]:bg-yellow-500/20 data-[active=true]:text-yellow-100',
  UNKNOWN: 'border-slate-700 text-slate-400',
}

interface FilterBarProps {
  onCopyCurrentView?: () => void
  copied?: boolean
}

export function FilterBar({ onCopyCurrentView, copied = false }: FilterBarProps) {
  const { filters, toggleLevel, setFilter, resetFilters, result, filteredEvents } = useLogStore()

  if (!result) return null

  const stats = result.statistics.level_counts
  const total = filteredEvents().length

  const hasActiveFilters =
    filters.levels.length > 0 ||
    filters.search ||
    filters.service ||
    filters.hasException ||
    filters.httpMethod ||
    filters.statusCode

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search logs, request IDs, exceptions..."
            className="
              w-full rounded-lg border border-slate-800 bg-slate-900/90
              py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500
              transition-colors focus:border-indigo-500/50 focus:outline-none
            "
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              x
            </button>
          )}
        </div>

        {onCopyCurrentView && (
          <button
            onClick={onCopyCurrentView}
            className="
              inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2
              text-sm font-medium text-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.2)]
              transition-all duration-150 hover:border-slate-500 hover:bg-slate-900
            "
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-8-4h8m3 12H5a2 2 0 01-2-2V6a2 2 0 012-2h8.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
            </svg>
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((level) => {
          const count = stats[level] ?? 0
          const active = filters.levels.includes(level)

          return (
            <button
              key={level}
              data-active={active}
              onClick={() => toggleLevel(level)}
              disabled={count === 0}
              className={`
                rounded-md border px-2 py-1 font-mono text-[11px] font-semibold transition-all duration-100
                disabled:cursor-not-allowed disabled:opacity-30
                ${LEVEL_STYLES[level]}
              `}
            >
              {level}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          )
        })}

        <div className="mx-1 h-4 w-px bg-slate-800" />

        <button
          data-active={filters.hasException}
          onClick={() => setFilter('hasException', !filters.hasException)}
          className="
            rounded-md border border-slate-700 px-2 py-1 font-mono text-[11px] text-slate-400 transition-all duration-100
            data-[active=true]:border-rose-500/40 data-[active=true]:bg-rose-500/10 data-[active=true]:text-rose-200
          "
        >
          exceptions only
        </button>

        {result.statistics.top_services.length > 0 && (
          <select
            value={filters.service}
            onChange={(e) => setFilter('service', e.target.value)}
            className="
              cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-400
              focus:border-indigo-500/50 focus:outline-none
            "
          >
            <option value="">all services</option>
            {result.statistics.top_services.map((s) => (
              <option key={s.service} value={s.service}>
                {s.service} ({s.count})
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button onClick={resetFilters} className="ml-auto text-[11px] text-slate-500 transition-colors hover:text-slate-300">
            Reset filters
          </button>
        )}

        <span className="ml-auto text-[11px] text-slate-500">
          {total} / {result.statistics.total_events} events
        </span>
      </div>
    </div>
  )
}
