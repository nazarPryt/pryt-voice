import type { StateCreator } from 'zustand'

import { STORAGE_KEYS } from '@/shared/storageKeys'
import type { HistoryEntry, Segment } from '@/shared/types'

export const DEFAULT_MAX_HISTORY = 10
const MIN_HISTORY_LIMIT = 1
const MAX_HISTORY_LIMIT = 20

function loadHistory(): HistoryEntry[] {
   try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY)
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
   } catch {
      return []
   }
}

function loadMaxHistory(): number {
   const raw = localStorage.getItem(STORAGE_KEYS.MAX_HISTORY)
   if (!raw) return DEFAULT_MAX_HISTORY
   const parsed = parseInt(raw, 10)
   return isNaN(parsed) ? DEFAULT_MAX_HISTORY : Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_HISTORY_LIMIT, parsed))
}

export type HistorySlice = {
   groups: Segment[][]
   addGroup: (segments: Segment[]) => void
   history: HistoryEntry[]
   maxHistory: number
   setMaxHistory: (val: number) => void
   clearHistory: () => void
}

export const createHistorySlice: StateCreator<HistorySlice> = set => ({
   groups: [],
   addGroup: segments =>
      set(state => {
         const text = segments
            .map(seg => seg.text)
            .join(' ')
            .trim()
         if (!text) return { groups: [...state.groups, segments] }

         const entry: HistoryEntry = { id: crypto.randomUUID(), text, createdAt: Date.now() }
         const newHistory = [entry, ...state.history].slice(0, state.maxHistory)
         localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory))
         return { groups: [...state.groups, segments], history: newHistory }
      }),
   history: loadHistory(),
   maxHistory: loadMaxHistory(),
   setMaxHistory: val => {
      const clamped = Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_HISTORY_LIMIT, val))
      localStorage.setItem(STORAGE_KEYS.MAX_HISTORY, String(clamped))
      set(state => {
         const trimmed = state.history.slice(0, clamped)
         localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed))
         return { maxHistory: clamped, history: trimmed }
      })
   },
   clearHistory: () => {
      localStorage.removeItem(STORAGE_KEYS.HISTORY)
      set({ history: [] })
   },
})
