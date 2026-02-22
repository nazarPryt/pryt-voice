import { renderHook } from 'vitest-browser-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTranscription } from '../useTranscription'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

const { invoke } = await import('@tauri-apps/api/core')
const mockInvoke = vi.mocked(invoke)

const seg = (text: string) => ({ start: '00:00:00.000', end: '00:00:01.000', text })

describe('useTranscription', () => {
   beforeEach(() => mockInvoke.mockReset())

   it('starts with empty groups, not processing, no error', async () => {
      const { result } = await renderHook(() => useTranscription())
      expect(result.current.groups).toEqual([])
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.errorMessage).toBeNull()
   })

   it('adds a group when transcription returns segments', async () => {
      const segments = [seg('Hello world')]
      mockInvoke.mockResolvedValue(segments)

      const { result, act } = await renderHook(() => useTranscription())
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.1, 0.2]))
      })

      expect(result.current.groups).toHaveLength(1)
      expect(result.current.groups[0]).toEqual(segments)
   })

   it('each call creates a separate group', async () => {
      mockInvoke.mockResolvedValueOnce([seg('First')]).mockResolvedValueOnce([seg('Second')])

      const { result, act } = await renderHook(() => useTranscription())
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.1]))
      })
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.2]))
      })

      expect(result.current.groups).toHaveLength(2)
      expect(result.current.groups[1][0].text).toBe('Second')
   })

   it('does not add a group when result is empty', async () => {
      mockInvoke.mockResolvedValue([])

      const { result, act } = await renderHook(() => useTranscription())
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.1]))
      })

      expect(result.current.groups).toHaveLength(0)
   })

   it('passes audioData as a plain array to invoke', async () => {
      mockInvoke.mockResolvedValue([])

      const { result, act } = await renderHook(() => useTranscription())
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.5, -0.5, 1.0]))
      })

      expect(mockInvoke).toHaveBeenCalledWith('transcribe', {
         audioData: [0.5, -0.5, 1.0],
      })
   })

   it('sets errorMessage on failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('whisper-cli not found'))

      const { result, act } = await renderHook(() => useTranscription())

      // Catch inside act so act doesn't see the rejection;
      // act still flushes the state updates that happen before the rethrow
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.1])).catch(() => {})
      })

      expect(result.current.errorMessage).toBe('whisper-cli not found')
      expect(result.current.isProcessing).toBe(false)
   })

   it('clears errorMessage on next successful call', async () => {
      mockInvoke
         .mockRejectedValueOnce(new Error('first fail'))
         .mockResolvedValueOnce([seg('Recovery')])

      const { result, act } = await renderHook(() => useTranscription())
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.1])).catch(() => {})
      })
      await act(async () => {
         await result.current.transcribe(new Float32Array([0.2]))
      })

      expect(result.current.errorMessage).toBeNull()
      expect(result.current.groups).toHaveLength(1)
   })
})