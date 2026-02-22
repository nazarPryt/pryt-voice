import { renderHook } from 'vitest-browser-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCopyText } from '../useCopyText'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
   writeText: vi.fn().mockResolvedValue(undefined),
}))

const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
const mockWriteText = vi.mocked(writeText)

describe('useCopyText', () => {
   beforeEach(() => {
      vi.useFakeTimers()
      mockWriteText.mockResolvedValue(undefined)
   })

   afterEach(() => {
      vi.useRealTimers()
   })

   it('starts with copied = false', async () => {
      const { result } = await renderHook(() => useCopyText())
      expect(result.current.copied).toBe(false)
   })

   it('sets copied = true after copy()', async () => {
      const { result, act } = await renderHook(() => useCopyText())
      await act(async () => {
         await result.current.copy('hello')
      })
      expect(result.current.copied).toBe(true)
   })

   it('calls writeText with the provided text', async () => {
      const { result, act } = await renderHook(() => useCopyText())
      await act(async () => {
         await result.current.copy('copy this')
      })
      expect(mockWriteText).toHaveBeenCalledWith('copy this')
   })

   it('resets copied to false after 1500ms', async () => {
      const { result, act } = await renderHook(() => useCopyText())
      await act(async () => {
         await result.current.copy('hello')
      })
      expect(result.current.copied).toBe(true)

      await act(async () => {
         vi.advanceTimersByTime(1500)
      })
      expect(result.current.copied).toBe(false)
   })

   it('stays true before 1500ms elapses', async () => {
      const { result, act } = await renderHook(() => useCopyText())
      await act(async () => {
         await result.current.copy('hello')
      })

      await act(async () => {
         vi.advanceTimersByTime(1499)
      })
      expect(result.current.copied).toBe(true)
   })
})