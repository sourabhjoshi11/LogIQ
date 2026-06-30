// ─────────────────────────────────────────────
// LogLens — Global State (Zustand)
// ─────────────────────────────────────────────

import { create } from 'zustand'
import type {
  ParseResult,
  AIResponse,
  FilterState,
  LogEvent,
  ActiveTab,
  LogLevel,
} from '../types'

interface LogStore {
  // ── Parse result ──────────────────────────
  result: ParseResult | null
  setResult: (r: ParseResult) => void
  clearResult: () => void

  // ── UI state ──────────────────────────────
  activeTab: ActiveTab
  setActiveTab: (t: ActiveTab) => void

  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void

  // ── Loading ───────────────────────────────
  isParsing: boolean
  setIsParsing: (v: boolean) => void

  isExplaining: boolean
  setIsExplaining: (v: boolean) => void

  parseError: string | null
  setParseError: (e: string | null) => void

  // ── AI ────────────────────────────────────
  aiResponse: AIResponse | null
  setAIResponse: (r: AIResponse | null) => void

  // ── Filters ───────────────────────────────
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  toggleLevel: (level: LogLevel) => void
  resetFilters: () => void

  // ── Derived: filtered events ──────────────
  filteredEvents: () => LogEvent[]
}

const DEFAULT_FILTERS: FilterState = {
  levels: [],
  search: '',
  service: '',
  hasException: false,
  httpMethod: '',
  statusCode: '',
}

export const useLogStore = create<LogStore>((set, get) => ({
  result: null,
  setResult: (r) => set({ result: r, aiResponse: null }),
  clearResult: () =>
    set({ result: null, aiResponse: null, selectedEventId: null }),

  activeTab: 'logs',
  setActiveTab: (t) => set({ activeTab: t }),

  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),

  isParsing: false,
  setIsParsing: (v) => set({ isParsing: v }),

  isExplaining: false,
  setIsExplaining: (v) => set({ isExplaining: v }),

  parseError: null,
  setParseError: (e) => set({ parseError: e }),

  aiResponse: null,
  setAIResponse: (r) => set({ aiResponse: r }),

  filters: DEFAULT_FILTERS,
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  toggleLevel: (level) =>
    set((s) => {
      const levels = s.filters.levels.includes(level)
        ? s.filters.levels.filter((l) => l !== level)
        : [...s.filters.levels, level]
      return { filters: { ...s.filters, levels } }
    }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  filteredEvents: () => {
    const { result, filters } = get()
    if (!result) return []

    return result.events.filter((ev) => {
      if (filters.levels.length > 0 && !filters.levels.includes(ev.level))
        return false

      if (filters.hasException && !ev.exception) return false

      if (
        filters.service &&
        ev.service?.toLowerCase() !== filters.service.toLowerCase()
      )
        return false

      if (
        filters.httpMethod &&
        ev.http_method?.toUpperCase() !== filters.httpMethod.toUpperCase()
      )
        return false

      if (filters.statusCode && String(ev.status_code) !== filters.statusCode)
        return false

      if (filters.search) {
        const q = filters.search.toLowerCase()
        const hit =
          ev.message.toLowerCase().includes(q) ||
          ev.raw.toLowerCase().includes(q) ||
          ev.request_id?.toLowerCase().includes(q) ||
          ev.trace_id?.toLowerCase().includes(q) ||
          ev.exception?.toLowerCase().includes(q) ||
          ev.url?.toLowerCase().includes(q)
        if (!hit) return false
      }

      return true
    })
  },
}))
