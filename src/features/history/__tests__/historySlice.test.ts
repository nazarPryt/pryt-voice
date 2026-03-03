import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createHistorySlice } from '@/features/history/historySlice'
import { initialDataState, useAppStore } from '@/stores/useAppStore'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

const seg = (text: string) => ({ start: '00:00:00.000', end: '00:00:01.000', text })

describe('historySlice', () => {
   beforeEach(() => {
      localStorage.clear()
      useAppStore.setState(initialDataState)
   })

   // ─── addGroup ──────────────────────────────────────────────────────────────
   describe('addGroup', () => {
      it('starts with empty history', () => {
         expect(useAppStore.getState().history).toEqual([])
      })

      it('adds a history entry with the segment text', () => {
         useAppStore.getState().addGroup([seg('Hello world')])
         const { history } = useAppStore.getState()
         expect(history).toHaveLength(1)
         expect(history[0].text).toBe('Hello world')
      })

      it('joins multiple segments with a space', () => {
         useAppStore.getState().addGroup([seg('Hello'), seg('world')])
         expect(useAppStore.getState().history[0].text).toBe('Hello world')
      })

      it('prepends new entries so the latest appears first', () => {
         useAppStore.getState().addGroup([seg('First')])
         useAppStore.getState().addGroup([seg('Second')])
         const { history } = useAppStore.getState()
         expect(history[0].text).toBe('Second')
         expect(history[1].text).toBe('First')
      })

      it('assigns a unique id to each entry', () => {
         useAppStore.getState().addGroup([seg('A')])
         useAppStore.getState().addGroup([seg('B')])
         const ids = useAppStore.getState().history.map(e => e.id)
         expect(new Set(ids).size).toBe(2)
      })

      it('records a createdAt timestamp', () => {
         const before = Date.now()
         useAppStore.getState().addGroup([seg('Timed')])
         const after = Date.now()
         const { createdAt } = useAppStore.getState().history[0]
         expect(createdAt).toBeGreaterThanOrEqual(before)
         expect(createdAt).toBeLessThanOrEqual(after)
      })

      it('does not add an entry when all segment text is blank', () => {
         useAppStore.getState().addGroup([seg(''), seg('   ')])
         expect(useAppStore.getState().history).toHaveLength(0)
      })

      it('trims excess entries when history is at the limit', () => {
         useAppStore.setState({ maxHistory: 3 })
         useAppStore.getState().addGroup([seg('A')])
         useAppStore.getState().addGroup([seg('B')])
         useAppStore.getState().addGroup([seg('C')])
         useAppStore.getState().addGroup([seg('D')])
         const { history } = useAppStore.getState()
         expect(history).toHaveLength(3)
         expect(history[0].text).toBe('D')
         expect(history[2].text).toBe('B')
      })

      it('persists history to localStorage', () => {
         useAppStore.getState().addGroup([seg('Persisted')])
         const stored = JSON.parse(localStorage.getItem('history') ?? '[]') as { text: string }[]
         expect(stored[0].text).toBe('Persisted')
      })
   })

   // ─── clearHistory ──────────────────────────────────────────────────────────
   describe('clearHistory', () => {
      it('removes all entries from history', () => {
         useAppStore.getState().addGroup([seg('One')])
         useAppStore.getState().addGroup([seg('Two')])
         useAppStore.getState().clearHistory()
         expect(useAppStore.getState().history).toEqual([])
      })

      it('removes history from localStorage', () => {
         useAppStore.getState().addGroup([seg('Gone')])
         useAppStore.getState().clearHistory()
         expect(localStorage.getItem('history')).toBeNull()
      })
   })

   // ─── setMaxHistory ─────────────────────────────────────────────────────────
   describe('setMaxHistory', () => {
      it('updates the maxHistory value', () => {
         useAppStore.getState().setMaxHistory(5)
         expect(useAppStore.getState().maxHistory).toBe(5)
      })

      it('persists the new limit to localStorage', () => {
         useAppStore.getState().setMaxHistory(7)
         expect(localStorage.getItem('maxHistory')).toBe('7')
      })

      it('clamps value to minimum of 1', () => {
         useAppStore.getState().setMaxHistory(0)
         expect(useAppStore.getState().maxHistory).toBe(1)
      })

      it('clamps value to maximum of 20', () => {
         useAppStore.getState().setMaxHistory(99)
         expect(useAppStore.getState().maxHistory).toBe(20)
      })

      it('trims history to the new smaller limit', () => {
         useAppStore.getState().addGroup([seg('A')])
         useAppStore.getState().addGroup([seg('B')])
         useAppStore.getState().addGroup([seg('C')])
         useAppStore.getState().setMaxHistory(2)
         expect(useAppStore.getState().history).toHaveLength(2)
      })

      it('keeps the most recent entries when trimming', () => {
         useAppStore.getState().addGroup([seg('Old')])
         useAppStore.getState().addGroup([seg('New')])
         useAppStore.getState().setMaxHistory(1)
         expect(useAppStore.getState().history[0].text).toBe('New')
      })
   })

   // ─── localStorage persistence on init ─────────────────────────────────────
   describe('localStorage persistence on init', () => {
      it('loads history from localStorage when the slice is created', () => {
         const entry = { id: 'abc', text: 'Restored', createdAt: 1000 }
         localStorage.setItem('history', JSON.stringify([entry]))
         // createHistorySlice reads localStorage eagerly — call it after setting storage
         const freshState = createHistorySlice(
            () => {},
            () => ({}) as never,
            {} as never,
         )
         expect(freshState.history[0].text).toBe('Restored')
      })

      it('falls back to empty array when localStorage contains invalid JSON', () => {
         localStorage.setItem('history', 'not-json')
         const freshState = createHistorySlice(
            () => {},
            () => ({}) as never,
            {} as never,
         )
         expect(freshState.history).toEqual([])
      })

      it('loads maxHistory from localStorage when the slice is created', () => {
         localStorage.setItem('maxHistory', '15')
         const freshState = createHistorySlice(
            () => {},
            () => ({}) as never,
            {} as never,
         )
         expect(freshState.maxHistory).toBe(15)
      })

      it('falls back to default maxHistory of 10 when localStorage is empty', () => {
         const freshState = createHistorySlice(
            () => {},
            () => ({}) as never,
            {} as never,
         )
         expect(freshState.maxHistory).toBe(10)
      })
   })
})
