import { useState } from 'react'

interface JsonNodeProps {
  data: unknown
  depth?: number
  keyName?: string
}

function JsonNode({ data, depth = 0, keyName }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2)
  const indent = depth * 12

  const type = Array.isArray(data) ? 'array' : typeof data

  if (data === null) {
    return (
      <div style={{ paddingLeft: indent }} className="flex gap-1 font-mono text-xs leading-5">
        {keyName && <span className="text-sky-300">"{keyName}"</span>}
        {keyName && <span className="text-slate-600">:</span>}
        <span className="text-slate-500">null</span>
      </div>
    )
  }

  if (type === 'object' || type === 'array') {
    const entries =
      type === 'array'
        ? (data as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
        : Object.entries(data as Record<string, unknown>)

    const open = type === 'array' ? '[' : '{'
    const close = type === 'array' ? ']' : '}'

    return (
      <div style={{ paddingLeft: indent }}>
        <div className="flex cursor-pointer items-center gap-1 group" onClick={() => setCollapsed((c) => !c)}>
          {keyName && <span className="font-mono text-xs text-sky-300">"{keyName}"</span>}
          {keyName && <span className="font-mono text-xs text-slate-600">:</span>}
          <span className="font-mono text-xs text-slate-400">{open}</span>
          {collapsed && (
            <>
              <span className="font-mono text-xs text-slate-500">
                {entries.length} {type === 'array' ? 'items' : 'keys'}
              </span>
              <span className="font-mono text-xs text-slate-400">{close}</span>
            </>
          )}
          <span className="ml-1 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
            {collapsed ? '>' : 'v'}
          </span>
        </div>
        {!collapsed && (
          <>
            {entries.map(([k, v]) => (
              <JsonNode key={k} data={v} depth={depth + 1} keyName={type === 'array' ? undefined : k} />
            ))}
            <div style={{ paddingLeft: 0 }} className="font-mono text-xs text-slate-400">
              {close}
            </div>
          </>
        )}
      </div>
    )
  }

  const valueColor =
    type === 'string' ? 'text-emerald-300' : type === 'number' ? 'text-amber-300' : type === 'boolean' ? 'text-violet-300' : 'text-slate-300'

  const display = type === 'string' ? `"${String(data)}"` : String(data)

  return (
    <div style={{ paddingLeft: indent }} className="flex gap-1 font-mono text-xs leading-5">
      {keyName && <span className="text-sky-300">"{keyName}"</span>}
      {keyName && <span className="text-slate-600">:</span>}
      <span className={valueColor}>{display}</span>
    </div>
  )
}

interface JsonViewerProps {
  data: unknown
}

export function JsonViewer({ data }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3">
      <button
        onClick={copy}
        className="absolute right-2 top-2 rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <JsonNode data={data} />
    </div>
  )
}
