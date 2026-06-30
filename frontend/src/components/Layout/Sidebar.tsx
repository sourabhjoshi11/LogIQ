import { useLogStore } from '../../store/useLogStore'
import type { ActiveTab } from '../../types'

interface TabDef {
  id: ActiveTab
  label: string
  icon: React.ReactNode
  badge?: number
}

function Icon({ d }: { d: string }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
    </svg>
  )
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const { activeTab, setActiveTab, result } = useLogStore()

  const errors = result
    ? (result.statistics.level_counts['ERROR'] ?? 0) + (result.statistics.level_counts['CRITICAL'] ?? 0)
    : 0

  const tabs: TabDef[] = [
    { id: 'logs', label: 'Logs', icon: <Icon d="M4 6h16M4 10h16M4 14h8" />, badge: result?.statistics.total_events },
    { id: 'timeline', label: 'Timeline', icon: <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />, badge: result?.timeline.length },
    { id: 'stats', label: 'Stats', icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { id: 'ai', label: 'AI', icon: <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />, badge: errors > 0 ? errors : undefined },
  ]

  const handleTab = (id: ActiveTab) => {
    if (!result && id !== 'logs') return
    setActiveTab(id)
    onClose?.()
  }

  return (
    <aside className="flex h-full w-48 flex-col border-r border-slate-800/80 bg-slate-950/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="LogLens" className="h-8 w-8 rounded-md bg-slate-900/70 p-1" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">LogLens</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {tabs.map((tab) => {
          const disabled = !result && tab.id !== 'logs'

          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              disabled={disabled}
              className={`
                flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150
                ${activeTab === tab.id
                  ? 'bg-indigo-500/12 text-slate-100 ring-1 ring-inset ring-indigo-500/20 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'}
                disabled:cursor-not-allowed disabled:opacity-35
              `}
            >
              <div className="flex items-center gap-2.5">
                {tab.icon}
                <span>{tab.label}</span>
              </div>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                    tab.id === 'ai'
                      ? 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/20'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.badge > 9999 ? '9k+' : tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

    </aside>
  )
}
