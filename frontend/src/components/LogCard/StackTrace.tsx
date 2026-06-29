import { useState } from 'react'

interface StackTraceProps {
  trace: string
  exception?: string | null
}

type FrameKind = 'app' | 'framework' | 'thirdparty'

function classifyFrame(line: string): FrameKind {
  const l = line.toLowerCase()

  if (
    l.includes('site-packages') ||
    l.includes('node_modules') ||
    l.includes('dist-packages') ||
    l.includes('java.') ||
    l.includes('javax.') ||
    l.includes('sun.') ||
    l.includes('com.sun')
  ) return 'thirdparty'

  if (
    l.includes('django') ||
    l.includes('flask') ||
    l.includes('fastapi') ||
    l.includes('uvicorn') ||
    l.includes('starlette') ||
    l.includes('express') ||
    l.includes('spring') ||
    l.includes('hibernate')
  ) return 'framework'

  return 'app'
}

const FRAME_STYLES: Record<FrameKind, string> = {
  app: 'text-slate-200 bg-indigo-500/10 border-l-2 border-indigo-500/70',
  framework: 'text-slate-400 bg-transparent border-l-2 border-slate-700',
  thirdparty: 'text-slate-500 bg-transparent border-l-2 border-slate-800',
}

const FRAME_LABELS: Record<FrameKind, string> = {
  app: 'app',
  framework: 'fw',
  thirdparty: '3p',
}

export function StackTrace({ trace, exception }: StackTraceProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = trace.split('\n').filter(Boolean)

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-800">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between bg-slate-900 px-3 py-2 text-left transition-colors hover:bg-slate-800"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6 6l8 4-8 4V6z" />
          </svg>
          <span className="font-mono text-xs font-medium text-rose-300">{exception ?? 'Stack trace'}</span>
        </div>
        <span className="text-xs text-slate-500">{lines.length} frames</span>
      </button>

      {expanded && (
        <div className="max-h-60 space-y-0.5 overflow-auto bg-slate-950 p-2">
          <div className="mb-2 flex gap-3 px-1">
            {(['app', 'framework', 'thirdparty'] as FrameKind[]).map((k) => (
              <span key={k} className="flex items-center gap-1 text-xs text-slate-500">
                <span
                  className={`inline-block h-2 w-2 rounded-sm ${
                    k === 'app' ? 'bg-indigo-500' : k === 'framework' ? 'bg-slate-600' : 'bg-slate-800'
                  }`}
                />
                {k}
              </span>
            ))}
          </div>

          {lines.map((line, i) => {
            const kind = classifyFrame(line)
            return (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-sm px-2 py-1 font-mono text-xs ${FRAME_STYLES[kind]}`}
              >
                <span className="w-4 shrink-0 select-none text-right text-slate-600">
                  {FRAME_LABELS[kind]}
                </span>
                <span className="break-all">{line.trim()}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
