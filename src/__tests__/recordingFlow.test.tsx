import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { App } from '@/App'
import { initialDataState, useAppStore } from '@/stores/useAppStore'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
   writeText: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/recorder', () => {
   class AudioRecorder {
      start = vi.fn().mockResolvedValue(undefined)
      stop = vi.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]))
      destroy = vi.fn().mockResolvedValue(undefined)
   }

   return {
      AudioRecorder,
      enumerateMicrophones: vi
         .fn()
         .mockResolvedValue([{ deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic', groupId: 'group-1' }]),
   }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const { invoke } = await import('@tauri-apps/api/core')
const mockInvoke = vi.mocked(invoke)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Recording flow', () => {
   beforeEach(() => {
      useAppStore.setState(initialDataState)
      mockInvoke.mockReset()
      mockInvoke.mockImplementation((cmd: string) => {
         if (cmd === 'check_whisper') return Promise.resolve({ ready: true, missing: [] })
         if (cmd === 'transcribe')
            return Promise.resolve([{ text: 'Hello world', start: '00:00:00.000', end: '00:00:01.500' }])
         return Promise.resolve(undefined)
      })
   })

   it('record button is initially disabled, then enables once whisper and mic are ready', async () => {
      const screen = await render(<App />)

      await expect.element(screen.getByTestId('record-btn')).not.toBeDisabled()
      expect(mockInvoke).toHaveBeenCalledWith('check_whisper')
   })

   it('shows transcript text after record → stop cycle', async () => {
      const screen = await render(<App />)
      const btn = screen.getByTestId('record-btn')

      await expect.element(btn).not.toBeDisabled()

      await btn.click() // start recording
      await btn.click() // stop + transcribe

      await expect.element(screen.getByText('Hello world')).toBeVisible()
   })

   it('status bar reflects state transitions throughout the flow', async () => {
      const screen = await render(<App />)
      const btn = screen.getByTestId('record-btn')

      await expect.element(btn).not.toBeDisabled()

      await btn.click()
      await expect.element(screen.getByText('Recording — click again to stop')).toBeVisible()

      await btn.click()
      await expect.element(screen.getByText('Ready', { exact: true })).toBeVisible()
   })

   it('each recording creates a new transcript group', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
         if (cmd === 'check_whisper') return Promise.resolve({ ready: true, missing: [] })
         if (cmd === 'transcribe')
            return Promise.resolve([{ text: 'First recording', start: '00:00:00.000', end: '00:00:01.000' }])
         return Promise.resolve(undefined)
      })

      const screen = await render(<App />)
      const btn = screen.getByTestId('record-btn')

      await expect.element(btn).not.toBeDisabled()

      await btn.click()
      await btn.click()
      await expect.element(screen.getByText('First recording')).toBeVisible()

      mockInvoke.mockImplementation((cmd: string) => {
         if (cmd === 'check_whisper') return Promise.resolve({ ready: true, missing: [] })
         if (cmd === 'transcribe')
            return Promise.resolve([{ text: 'Second recording', start: '00:00:00.000', end: '00:00:02.000' }])
         return Promise.resolve(undefined)
      })

      await btn.click()
      await btn.click()

      await expect.element(screen.getByText('First recording')).toBeVisible()
      await expect.element(screen.getByText('Second recording')).toBeVisible()
   })

   it('shows error status when transcription fails', async () => {
      mockInvoke.mockImplementation((cmd: string) => {
         if (cmd === 'check_whisper') return Promise.resolve({ ready: true, missing: [] })
         if (cmd === 'transcribe') return Promise.reject(new Error('whisper-cli crashed'))
         return Promise.resolve(undefined)
      })

      const screen = await render(<App />)
      const btn = screen.getByTestId('record-btn')

      await expect.element(btn).not.toBeDisabled()

      await btn.click()
      await btn.click()

      await expect.element(screen.getByText(/Transcription error.*whisper-cli crashed/)).toBeVisible()
   })
})
