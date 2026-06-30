// ─────────────────────────────────────────────
// LogLens — API Client
// ─────────────────────────────────────────────

import type { ParseResult, AIResponse, LogEvent } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try {
      const body = JSON.parse(text)
      detail = body?.detail ?? body?.error ?? JSON.stringify(body)
    } catch {
      // Keep raw text if not JSON
    }
    throw new Error(detail || `HTTP ${res.status}`)
  }

  if (!text) {
    throw new Error('AI returned malformed response: empty body')
  }

  try {
    return JSON.parse(text) as T
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const snippet = text.slice(0, 400)
    throw new Error(`AI returned malformed response: ${message}${snippet ? ` — response body: ${snippet}` : ''}`)
  }
}

// Parse raw log text
export async function parseLogs(
  content: string,
  filename?: string
): Promise<ParseResult> {
  const res = await fetch(`${BASE}/api/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename }),
  })
  return handleResponse<ParseResult>(res)
}

// Upload a log file
export async function uploadLog(file: File): Promise<ParseResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    body: form,
  })
  return handleResponse<ParseResult>(res)
}

// Ask AI to explain a set of events
export async function explainLogs(
  events: LogEvent[],
  userQuery?: string,
  provider: 'anthropic' | 'groq' = 'anthropic',
  apiKey?: string,
): Promise<AIResponse> {
  const res = await fetch(`${BASE}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events, user_query: userQuery, provider, api_key: apiKey }),
  })
  return handleResponse<AIResponse>(res)
}

// Health check
export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`)
  return handleResponse(res)
}
