import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { initialDataState, useAppStore } from '@/stores/useAppStore'

import { HistoryTab } from '../HistoryTab'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
   writeText: vi.fn().mockResolvedValue(undefined),
}))

const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
const mockWriteText = vi.mocked(writeText)

const entry = (text: string, overrides: Partial<{ id: string; createdAt: number }> = {}) => ({
   id: overrides.id ?? crypto.randomUUID(),
   text,
   createdAt: overrides.createdAt ?? Date.now(),
})

describe('HistoryTab', () => {
   beforeEach(() => {
      localStorage.clear()
      useAppStore.setState(initialDataState)
      mockWriteText.mockReset()
      vi.useFakeTimers()
   })
   afterEach(() => vi.useRealTimers())

   // ─── Empty state ───────────────────────────────────────────────────────────
   describe('empty state', () => {
      it('shows the empty-state message when there is no history', async () => {
         const screen = await render(<HistoryTab />)
         await expect.element(screen.getByText(/no recordings yet/i)).toBeVisible()
      })

      it('does not render any history items when history is empty', async () => {
         const screen = await render(<HistoryTab />)
         await expect.element(screen.getByTestId('history-item')).not.toBeInTheDocument()
      })

      it('does not show the clear button when history is empty', async () => {
         const screen = await render(<HistoryTab />)
         await expect.element(screen.getByTestId('clear-history-btn')).not.toBeInTheDocument()
      })
   })

   // ─── With entries ──────────────────────────────────────────────────────────
   describe('with history entries', () => {
      it('renders one item per history entry', async () => {
         useAppStore.setState({ history: [entry('Hello'), entry('World')] })
         const screen = await render(<HistoryTab />)
         const items = await screen.getByTestId('history-item').elements()
         expect(items).toHaveLength(2)
      })

      it('displays the text of each entry', async () => {
         useAppStore.setState({ history: [entry('Test transcription')] })
         const screen = await render(<HistoryTab />)
         await expect.element(screen.getByText('Test transcription')).toBeVisible()
      })

      it('shows the clear all button when history has entries', async () => {
         useAppStore.setState({ history: [entry('Something')] })
         const screen = await render(<HistoryTab />)
         await expect.element(screen.getByTestId('clear-history-btn')).toBeVisible()
      })
   })

   // ─── Copy on click ─────────────────────────────────────────────────────────
   describe('copy on click', () => {
      it('does not have copied state before clicking', async () => {
         useAppStore.setState({ history: [entry('Click me')] })
         const screen = await render(<HistoryTab />)
         await expect.element(screen.getByTestId('history-item')).not.toHaveAttribute('data-copied', 'true')
      })

      it('gains copied state after clicking', async () => {
         useAppStore.setState({ history: [entry('Click me')] })
         const screen = await render(<HistoryTab />)
         await screen.getByTestId('history-item').click()
         await expect.element(screen.getByTestId('history-item')).toHaveAttribute('data-copied', 'true')
      })

      it('shows Copied! label while in copied state', async () => {
         useAppStore.setState({ history: [entry('Click me')] })
         const screen = await render(<HistoryTab />)
         await screen.getByTestId('history-item').click()
         await expect.element(screen.getByText('Copied!')).toBeVisible()
      })

      it('calls writeText with the entry text on click', async () => {
         useAppStore.setState({ history: [entry('Copy this text')] })
         const screen = await render(<HistoryTab />)
         await screen.getByTestId('history-item').click()
         expect(mockWriteText).toHaveBeenCalledWith('Copy this text')
      })

      it('loses copied state after 1500ms', async () => {
         useAppStore.setState({ history: [entry('Timer test')] })
         const screen = await render(<HistoryTab />)
         await screen.getByTestId('history-item').click()

         await vi.advanceTimersByTimeAsync(1500)
         await expect.element(screen.getByTestId('history-item')).not.toHaveAttribute('data-copied', 'true')
      })

      it('copies the correct text for each item independently', async () => {
         useAppStore.setState({ history: [entry('Second', { id: 'b' }), entry('First', { id: 'a' })] })
         const screen = await render(<HistoryTab />)
         await screen.getByTestId('history-item').nth(1).click()
         expect(mockWriteText).toHaveBeenCalledWith('First')
      })
   })

   // ─── Clear all ─────────────────────────────────────────────────────────────
   describe('clear all', () => {
      it('clears all items after clicking the clear button', async () => {
         useAppStore.setState({ history: [entry('One'), entry('Two')] })
         const screen = await render(<HistoryTab />)
         await screen.getByTestId('clear-history-btn').click()
         expect(useAppStore.getState().history).toHaveLength(0)
      })

      it('hides the list after clearing', async () => {
         useAppStore.setState({ history: [entry('Disappear')] })
         const screen = await render(<HistoryTab />)
         await screen.getByTestId('clear-history-btn').click()
         await expect.element(screen.getByText(/no recordings yet/i)).toBeVisible()
      })
   })
})
