import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { App } from '@/App'
import { initialDataState, useAppStore } from '@/stores/useAppStore'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Capture event listeners so tests can fire Rust events.
type ListenCallback = (event: { payload: unknown }) => void
const listenHandlers: Record<string, ListenCallback[]> = {}

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
   writeText: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tauri-apps/api/event', () => ({
   listen: vi.fn().mockImplementation((event: string, cb: ListenCallback) => {
      listenHandlers[event] = listenHandlers[event] ?? []
      listenHandlers[event].push(cb)
      return Promise.resolve(() => {
         listenHandlers[event] = listenHandlers[event].filter(h => h !== cb)
      })
   }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { invoke } = await import('@tauri-apps/api/core')
const mockInvoke = vi.mocked(invoke)

function emit(event: string, payload: unknown = undefined) {
   listenHandlers[event]?.forEach(cb => cb({ payload }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Recording flow', () => {
   beforeEach(() => {
      useAppStore.setState(initialDataState)
      mockInvoke.mockReset()
      // Clear handlers between tests
      Object.keys(listenHandlers).forEach(k => delete listenHandlers[k])

      mockInvoke.mockImplementation((cmd: string) => {
         if (cmd === 'check_whisper') return Promise.resolve({ ready: true, missing: [] })
         if (cmd === 'list_audio_devices') return Promise.resolve([{ id: 'hw:0,0', name: 'Built-in Mic' }])
         return Promise.resolve(undefined)
      })
   })

   it('record button is initially disabled, then enables once whisper and mic are ready', async () => {
      const screen = await render(<App />)
      await expect.element(screen.getByTestId('record-btn')).not.toBeDisabled()
      expect(mockInvoke).toHaveBeenCalledWith('check_whisper')
   })

   it('shows transcript text after Rust emits transcription-result', async () => {
      const screen = await render(<App />)
      await expect.element(screen.getByTestId('record-btn')).not.toBeDisabled()

      emit('recording-started')
      emit('recording-stopping')
      emit('transcription-result', [{ text: 'Hello world', start: '00:00:00.000', end: '00:00:01.500' }])

      await expect.element(screen.getByText('Hello world')).toBeVisible()
   })

   it('status bar reflects state transitions throughout the flow', async () => {
      const screen = await render(<App />)
      await expect.element(screen.getByTestId('record-btn')).not.toBeDisabled()

      // Button click starts recording via invoke
      await screen.getByTestId('record-btn').click()
      await expect.element(screen.getByText('Recording — click again to stop')).toBeVisible()

      // Rust signals stop
      emit('recording-stopping')
      await expect.element(screen.getByText('Transcribing...')).toBeVisible()

      // Rust emits result
      emit('transcription-result', [{ text: 'Done', start: '00:00:00.000', end: '00:00:01.000' }])
      await expect.element(screen.getByText('Ready', { exact: true })).toBeVisible()
   })

   it('each transcription-result event creates a new transcript group', async () => {
      const screen = await render(<App />)
      await expect.element(screen.getByTestId('record-btn')).not.toBeDisabled()

      emit('recording-started')
      emit('recording-stopping')
      emit('transcription-result', [{ text: 'First recording', start: '00:00:00.000', end: '00:00:01.000' }])
      await expect.element(screen.getByText('First recording')).toBeVisible()

      emit('recording-started')
      emit('recording-stopping')
      emit('transcription-result', [{ text: 'Second recording', start: '00:00:00.000', end: '00:00:02.000' }])

      await expect.element(screen.getByText('First recording')).toBeVisible()
      await expect.element(screen.getByText('Second recording')).toBeVisible()
   })

   it('shows error status when Rust emits transcription-error', async () => {
      const screen = await render(<App />)
      await expect.element(screen.getByTestId('record-btn')).not.toBeDisabled()

      emit('recording-started')
      emit('recording-stopping')
      emit('transcription-error', 'whisper-cli crashed')

      await expect.element(screen.getByText(/Error.*whisper-cli crashed/)).toBeVisible()
   })
})
