import { useState, useCallback } from 'react'
import { parseLogs } from '../../api/logApi'
import { useLogStore } from '../../store/useLogStore'

const SAMPLE = `2024-01-15 10:23:01,234 ERROR myapp.db - Connection timeout after 30s
Traceback (most recent call last):
  File "/app/db.py", line 42, in connect
    conn = psycopg2.connect(DSN)
psycopg2.OperationalError: could not connect to server

2024-01-15 10:23:01,891 INFO myapp.api - GET /api/users 200 142ms request_id=abc-123
2024-01-15 10:23:02,012 WARNING myapp.cache - Cache miss rate 78% - degraded performance
2024-01-15 10:23:02,344 ERROR myapp.api - POST /api/orders 500 request_id=def-456
2024-01-15 10:23:02,891 CRITICAL myapp.db - Max connections reached (100/100)`

export function LogEditor() {
  const [text, setText] = useState('')
  const { setResult, setIsParsing, setParseError, isParsing } = useLogStore()

  const handleParse = useCallback(async () => {
    const content = text.trim()
    if (!content) return

    setIsParsing(true)
    setParseError(null)
    try {
      const result = await parseLogs(content)
      setResult(result)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setIsParsing(false)
    }
  }, [text, setResult, setIsParsing, setParseError])

  const loadSample = () => setText(SAMPLE)

  const lineCount = text ? text.split('\n').length : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500">
            {lineCount > 0 ? `${lineCount} lines` : 'Paste logs below'}
          </span>
          {text && (
            <button
              onClick={() => setText('')}
              className="text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        <button
          onClick={loadSample}
          className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:text-indigo-200"
        >
          Load sample
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]">
        <div className="absolute bottom-0 left-0 top-0 z-10 w-11 border-r border-slate-800/80 bg-slate-900/80 pointer-events-none">
          <div className="pt-3 px-2">
            {(text || '\n').split('\n').slice(0, 500).map((_, i) => (
              <div key={i} className="font-mono text-right text-xs leading-6 text-slate-600">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste your logs here...\n\n2024-01-15 10:23:01 ERROR myapp - Database connection failed\n2024-01-15 10:23:02 INFO  myapp - Retrying...`}
          spellCheck={false}
          className="
            min-h-[280px] w-full max-h-[500px] resize-y bg-transparent
            pl-14 pr-4 pt-3 pb-3 font-mono text-sm leading-6
            text-slate-200 placeholder:text-slate-600 focus:outline-none
          "
          style={{ tabSize: 2 }}
        />
      </div>

      <button
        onClick={handleParse}
        disabled={!text.trim() || isParsing}
        className="
          flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium
          bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_10px_30px_rgba(99,102,241,0.22)]
          transition-all duration-150 hover:from-indigo-400 hover:to-violet-500 active:translate-y-px
          disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        {isParsing ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Parsing...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Analyze logs
          </>
        )}
      </button>
    </div>
  )
}
