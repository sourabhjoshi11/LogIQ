// ─────────────────────────────────────────────
// LogLens — Shared TypeScript Types
// ─────────────────────────────────────────────

export type LogLevel =
  | 'TRACE'
  | 'DEBUG'
  | 'VERBOSE'
  | 'INFO'
  | 'NOTICE'
  | 'SILLY'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL'
  | 'FATAL'
  | 'ALERT'
  | 'EMERG'
  | 'UNKNOWN'

export const DISPLAY_LOG_LEVELS: LogLevel[] = [
  'TRACE',
  'DEBUG',
  'VERBOSE',
  'SILLY',
  'INFO',
  'NOTICE',
  'WARNING',
  'ERROR',
  'CRITICAL',
  'FATAL',
  'ALERT',
  'EMERG',
  'UNKNOWN',
]

export const HIGH_SEVERITY_LEVELS: LogLevel[] = ['ERROR', 'CRITICAL', 'FATAL', 'ALERT', 'EMERG']

export type LogFormat =
  | 'python'
  | 'fastapi'
  | 'django'
  | 'nodejs'
  | 'express'
  | 'java'
  | 'spring_boot'
  | 'docker'
  | 'kubernetes'
  | 'aws_lambda'
  | 'nginx'
  | 'apache'
  | 'json'
  | 'generic'

export interface LogEvent {
  id: string
  line_number: number
  timestamp: string | null
  level: LogLevel
  service: string | null
  module: string | null
  logger: string | null
  request_id: string | null
  trace_id: string | null
  user_id: string | null
  http_method: string | null
  url: string | null
  status_code: number | null
  duration_ms: number | null
  exception: string | null
  stack_trace: string | null
  message: string
  raw: string
  extra: Record<string, unknown>
}

export interface RequestGroup {
  group_id: string
  request_id: string | null
  trace_id: string | null
  events: string[]
  start_time: string | null
  end_time: string | null
  duration_ms: number | null
  has_error: boolean
}

export interface Statistics {
  total_lines: number
  total_events: number
  level_counts: Record<string, number>
  top_exceptions: { exception: string; count: number }[]
  top_services: { service: string; count: number }[]
  avg_response_ms: number | null
  slowest_requests: { url: string | null; duration_ms: number; id: string }[]
  error_rate: number
  time_range: { start: string | null; end: string | null }
}

export interface TimelineEntry {
  id: string
  timestamp: string | null
  level: LogLevel
  message: string
  exception: string | null
  url: string | null
  method: string | null
  status: number | null
}

export interface ParseResult {
  format: LogFormat
  events: LogEvent[]
  groups: RequestGroup[]
  statistics: Statistics
  timeline: TimelineEntry[]
  parse_time_ms: number
}

export interface AIResponse {
  root_cause: string
  confidence: 'high' | 'medium' | 'low'
  explanation: string
  possible_fixes: string[]
  next_steps: string[]
}

export type ActiveTab = 'logs' | 'timeline' | 'stats' | 'ai'

export interface FilterState {
  levels: LogLevel[]
  search: string
  service: string
  hasException: boolean
  httpMethod: string
  statusCode: string
}
