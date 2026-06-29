import { useState } from 'react'
import type { LogEvent, LogLevel } from '../../types'
import { JsonViewer } from './JsonViewer'
import { StackTrace } from './StackTrace'

const LEVEL_STYLES: Record<LogLevel, string> = {
  TRACE: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  DEBUG: 'bg-slate-800 text-slate-400 border-slate-700',
  VERBOSE: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  SILLY: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
  INFO: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  NOTICE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  WARNING: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  ERROR: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  CRITICAL: 'bg-rose-500/20 text-rose-100 border-rose-400/30',
  FATAL: 'bg-red-500/20 text-red-100 border-red-400/30',
  ALERT: 'bg-orange-500/20 text-orange-100 border-orange-400/30',
  EMERG: 'bg-yellow-500/20 text-yellow-100 border-yellow-300/30',
  UNKNOWN: 'bg-slate-800 text-slate-500 border-slate-700',
}

const CARD_BORDER: Partial<Record<LogLevel, string>> = {
  ERROR: 'border-rose-900/60',
  CRITICAL: 'border-rose-800/70',
  FATAL: 'border-red-700/70',
  ALERT: 'border-orange-700/70',
  EMERG: 'border-yellow-700/70',
  WARNING: 'border-amber-900/50',
}

function LevelBadge({ level }: { level: LogLevel }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${LEVEL_STYLES[level]}`}>
      {level}
    </span>
  )
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-300',
  POST: 'text-sky-300',
  PUT: 'text-amber-300',
  PATCH: 'text-amber-300',
  DELETE: 'text-rose-300',
}

function StatusBadge({ code }: { code: number }) {
  const color = code >= 500 ? 'text-rose-300' : code >= 400 ? 'text-amber-300' : 'text-emerald-300'
  return <span className={`font-mono text-xs font-semibold ${color}`}>{code}</span>
}

interface LogCardProps {
  event: LogEvent
  isSelected: boolean
  onClick: () => void
}

export function LogCard({ event, isSelected, onClick }: LogCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails =
    !!event.stack_trace ||
    !!event.exception ||
    Object.keys(event.extra).length > 0 ||
    !!event.request_id ||
    !!event.trace_id

  const borderClass = CARD_BORDER[event.level] ?? 'border-slate-800/60'

  return (
    <div
      className={`
        overflow-hidden rounded-lg border transition-all duration-100
        ${borderClass}
        ${isSelected ? 'bg-slate-800/70 ring-1 ring-inset ring-indigo-500/20' : 'bg-slate-900/40 hover:bg-slate-900/80'}
      `}
    >
      <div
        className="flex cursor-pointer items-start gap-3 px-3 py-2.5"
        onClick={() => {
          onClick()
          setExpanded((e) => !e)
        }}
      >
        <span className="w-8 shrink-0 pt-0.5 text-right font-mono text-[10px] text-slate-600">
          {event.line_number}
        </span>

        <div className="shrink-0 pt-0.5">
          <LevelBadge level={event.level} />
        </div>

        {event.timestamp && (
          <span className="hidden shrink-0 pt-0.5 font-mono text-[10px] text-slate-500 md:block">
            {event.timestamp.replace('T', ' ').slice(0, 23)}
          </span>
        )}

        {event.http_method && (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`font-mono text-xs font-semibold ${METHOD_COLORS[event.http_method] ?? 'text-slate-400'}`}>
              {event.http_method}
            </span>
            {event.url && <span className="max-w-[160px] truncate font-mono text-xs text-slate-400">{event.url}</span>}
            {event.status_code && <StatusBadge code={event.status_code} />}
            {event.duration_ms && <span className="font-mono text-[10px] text-slate-500">{event.duration_ms}ms</span>}
          </div>
        )}

        <span className="min-w-0 flex-1 truncate text-sm leading-5 text-slate-200">
          {event.exception ? <span className="text-rose-300">{event.exception}: </span> : null}
          {event.message}
        </span>

        {event.service && (
          <span className="shrink-0 rounded border border-slate-800 bg-slate-950/70 px-1.5 py-0.5 text-[10px] text-slate-400">
            {event.service}
          </span>
        )}

        {hasDetails && (
          <svg
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6 6l8 4-8 4V6z" />
          </svg>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="space-y-3 border-t border-slate-800 px-3 py-3 bg-slate-950/60">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {event.request_id && <MetaField label="request_id" value={event.request_id} />}
            {event.trace_id && <MetaField label="trace_id" value={event.trace_id} />}
            {event.user_id && <MetaField label="user_id" value={event.user_id} />}
            {event.logger && <MetaField label="logger" value={event.logger} />}
            {event.module && <MetaField label="module" value={event.module} />}
          </div>

          {event.stack_trace && <StackTrace trace={event.stack_trace} exception={event.exception} />}

          {Object.keys(event.extra).length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Extra fields</p>
              <JsonViewer data={event.extra} />
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Raw</p>
            <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-950 p-2 font-mono text-[11px] text-slate-400">
              {event.raw}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] text-slate-500">{label}</span>
      <span className="font-mono text-xs text-slate-300">{value}</span>
    </div>
  )
}
