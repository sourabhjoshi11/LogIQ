import { HIGH_SEVERITY_LEVELS } from '../../types'
import { useLogStore } from '../../store/useLogStore'

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'red' | 'amber' | 'blue' | 'green'
}) {
  const colors = {
    red: 'text-rose-300',
    amber: 'text-amber-300',
    blue: 'text-sky-300',
    green: 'text-emerald-300',
  }

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.25)]">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? colors[accent] : 'text-slate-100'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string
  count: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 truncate font-mono text-xs text-slate-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-slate-500">{count}</span>
    </div>
  )
}

interface StatsPanelProps {
  onCopyCurrentView?: () => void
  copied?: boolean
}

export function StatsPanel({ onCopyCurrentView, copied = false }: StatsPanelProps) {
  const { result } = useLogStore()
  if (!result) return null

  const { statistics: s, format, parse_time_ms } = result

  const levelColors: Record<string, string> = {
    TRACE: 'bg-cyan-500',
    DEBUG: 'bg-slate-600',
    VERBOSE: 'bg-teal-500',
    SILLY: 'bg-fuchsia-500',
    INFO: 'bg-sky-500',
    NOTICE: 'bg-emerald-500',
    WARNING: 'bg-amber-500',
    ERROR: 'bg-rose-500',
    CRITICAL: 'bg-rose-400',
    FATAL: 'bg-red-500',
    ALERT: 'bg-orange-500',
    EMERG: 'bg-yellow-400',
  }

  const maxLevel = Math.max(...Object.values(s.level_counts), 1)
  const errors = HIGH_SEVERITY_LEVELS.reduce((sum, level) => sum + (s.level_counts[level] ?? 0), 0)

  return (
    <div className="space-y-6 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 font-mono text-xs text-indigo-300">
            {format}
          </span>
          <span className="text-xs text-slate-500">parsed in {parse_time_ms}ms</span>
        </div>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total events" value={s.total_events.toLocaleString()} />
        <StatCard label="Total lines" value={s.total_lines.toLocaleString()} />
        <StatCard
          label="Error rate"
          value={`${s.error_rate}%`}
          accent={s.error_rate > 10 ? 'red' : s.error_rate > 5 ? 'amber' : 'green'}
        />
        <StatCard label="High severity" value={errors.toLocaleString()} accent={errors > 0 ? 'red' : undefined} />
      </div>

      {s.avg_response_ms !== null && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Avg response"
            value={`${s.avg_response_ms}ms`}
            accent={s.avg_response_ms > 1000 ? 'red' : s.avg_response_ms > 500 ? 'amber' : 'green'}
          />
          {s.slowest_requests[0] && (
            <StatCard
              label="Slowest request"
              value={`${s.slowest_requests[0].duration_ms}ms`}
              sub={s.slowest_requests[0].url ?? undefined}
              accent="amber"
            />
          )}
        </div>
      )}

      {s.time_range.start && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <p className="mb-2 text-xs text-slate-500">Time range</p>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-300">{s.time_range.start}</span>
            <span className="text-slate-600">{'->'}</span>
            <span className="text-slate-300">{s.time_range.end}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <p className="mb-4 text-xs font-medium text-slate-500">Log level distribution</p>
          <div className="space-y-2.5">
            {Object.entries(s.level_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([level, count]) => (
                <BarRow
                  key={level}
                  label={level}
                  count={count}
                  max={maxLevel}
                  color={levelColors[level] ?? 'bg-slate-600'}
                />
              ))}
          </div>
        </div>

        {s.top_exceptions.length > 0 && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <p className="mb-4 text-xs font-medium text-slate-500">Top exceptions</p>
            <div className="space-y-2">
              {s.top_exceptions.slice(0, 8).map((exc) => (
                <div key={exc.exception} className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-rose-300">{exc.exception}</span>
                  <span className="shrink-0 text-xs text-slate-500">{exc.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {s.top_services.length > 0 && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <p className="mb-4 text-xs font-medium text-slate-500">Top services</p>
            <div className="space-y-2">
              {s.top_services.slice(0, 8).map((svc) => (
                <div key={svc.service} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">{svc.service}</span>
                  <span className="text-xs text-slate-500">{svc.count} events</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {s.slowest_requests.length > 0 && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <p className="mb-4 text-xs font-medium text-slate-500">Slowest requests</p>
            <div className="space-y-2">
              {s.slowest_requests.map((req, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-slate-400">{req.url ?? 'unknown'}</span>
                  <span className={`shrink-0 font-mono text-xs ${req.duration_ms > 1000 ? 'text-rose-300' : 'text-amber-300'}`}>
                    {req.duration_ms}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
