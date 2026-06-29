import { useCallback, useRef, useState } from 'react'
import { uploadLog } from '../../api/logApi'
import { useLogStore } from '../../store/useLogStore'

const ACCEPTED = ['.log', '.txt', '.out', '.json']

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { setResult, setIsParsing, setParseError, isParsing } = useLogStore()

  const processFile = useCallback(
    async (file: File) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ACCEPTED.includes(ext)) {
        setParseError(`Unsupported file type: ${ext}. Accepted: ${ACCEPTED.join(', ')}`)
        return
      }

      setIsParsing(true)
      setParseError(null)
      setProgress(`Reading ${file.name} (${(file.size / 1024).toFixed(0)} KB)...`)

      try {
        const result = await uploadLog(file)
        setResult(result)
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setIsParsing(false)
        setProgress(null)
      }
    },
    [setResult, setIsParsing, setParseError]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !isParsing && inputRef.current?.click()}
      className={`
        relative flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200
        ${isDragging
          ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.18)]'
          : 'border-slate-700 bg-slate-900/55 hover:border-slate-500 hover:bg-slate-900/75'
        }
        ${isParsing ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={onFileChange}
      />

      {isParsing ? (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <p className="text-sm text-slate-300">{progress}</p>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/90 ring-1 ring-inset ring-slate-700">
            <svg className="h-6 w-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">Drop your log file here</p>
            <p className="mt-1 text-xs text-slate-400">{ACCEPTED.join(', ')} up to 100 MB</p>
          </div>
          <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            or click to browse
          </span>
        </>
      )}
    </div>
  )
}
