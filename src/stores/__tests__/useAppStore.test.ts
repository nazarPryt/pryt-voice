import { beforeEach, describe, expect, it, vi } from 'vitest'

import { initialDataState, useAppStore } from '../useAppStore'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

vi.mock('@/recorder', () => ({
   enumerateMicrophones: vi.fn(),
}))

const { invoke } = await import('@tauri-apps/api/core')
const { enumerateMicrophones } = await import('@/recorder')
const mockInvoke = vi.mocked(invoke)
const mockEnumerateMicrophones = vi.mocked(enumerateMicrophones)

const seg = (text: string) => ({ start: '00:00:00.000', end: '00:00:01.000', text })

describe('useAppStore', () => {
   beforeEach(() => {
      useAppStore.setState(initialDataState)
      mockInvoke.mockReset()
      mockEnumerateMicrophones.mockReset()
   })

   describe('transcribe', () => {
      it('starts with empty groups, not processing, no error', () => {
         const state = useAppStore.getState()
         expect(state.groups).toEqual([])
         expect(state.isProcessing).toBe(false)
         expect(state.errorMessage).toBeNull()
      })

      it('adds a group when transcription returns segments', async () => {
         const segments = [seg('Hello world')]
         mockInvoke.mockResolvedValue(segments)

         await useAppStore.getState().transcribe(new Float32Array([0.1, 0.2]))

         expect(useAppStore.getState().groups).toHaveLength(1)
         expect(useAppStore.getState().groups[0]).toEqual(segments)
      })

      it('each call creates a separate group', async () => {
         mockInvoke.mockResolvedValueOnce([seg('First')]).mockResolvedValueOnce([seg('Second')])

         await useAppStore.getState().transcribe(new Float32Array([0.1]))
         await useAppStore.getState().transcribe(new Float32Array([0.2]))

         expect(useAppStore.getState().groups).toHaveLength(2)
         expect(useAppStore.getState().groups[1][0].text).toBe('Second')
      })

      it('does not add a group when result is empty', async () => {
         mockInvoke.mockResolvedValue([])

         await useAppStore.getState().transcribe(new Float32Array([0.1]))

         expect(useAppStore.getState().groups).toHaveLength(0)
      })

      it('passes audioData as a plain array to invoke', async () => {
         mockInvoke.mockResolvedValue([])

         await useAppStore.getState().transcribe(new Float32Array([0.5, -0.5, 1.0]))

         expect(mockInvoke).toHaveBeenCalledWith('transcribe', {
            audioData: [0.5, -0.5, 1.0],
         })
      })

      it('sets errorMessage on failure', async () => {
         mockInvoke.mockRejectedValueOnce(new Error('whisper-cli not found'))

         await useAppStore
            .getState()
            .transcribe(new Float32Array([0.1]))
            .catch(() => {})

         expect(useAppStore.getState().errorMessage).toBe('whisper-cli not found')
         expect(useAppStore.getState().isProcessing).toBe(false)
      })

      it('clears errorMessage on next successful call', async () => {
         mockInvoke.mockRejectedValueOnce(new Error('first fail')).mockResolvedValueOnce([seg('Recovery')])

         await useAppStore
            .getState()
            .transcribe(new Float32Array([0.1]))
            .catch(() => {})
         await useAppStore.getState().transcribe(new Float32Array([0.2]))

         expect(useAppStore.getState().errorMessage).toBeNull()
         expect(useAppStore.getState().groups).toHaveLength(1)
      })
   })

   describe('checkSetup', () => {
      it('sets whisperStatus on success', async () => {
         mockInvoke.mockResolvedValue({ ready: true, missing: [] })

         await useAppStore.getState().checkSetup()

         expect(useAppStore.getState().whisperStatus).toEqual({ ready: true, missing: [] })
         expect(useAppStore.getState().checkingWhisper).toBe(false)
      })

      it('sets whisperStatus null on failure', async () => {
         mockInvoke.mockRejectedValueOnce(new Error('not found'))

         await useAppStore.getState().checkSetup()

         expect(useAppStore.getState().whisperStatus).toBeNull()
         expect(useAppStore.getState().checkingWhisper).toBe(false)
      })
   })

   describe('populateMics', () => {
      it('sets mics on success', async () => {
         const fakeDevices = [{ deviceId: 'mic1', label: 'Mic 1' }] as MediaDeviceInfo[]
         mockEnumerateMicrophones.mockResolvedValue(fakeDevices)

         await useAppStore.getState().populateMics()

         expect(useAppStore.getState().mics).toEqual(fakeDevices)
      })

      it('sets error status when no mics found', async () => {
         mockEnumerateMicrophones.mockResolvedValue([])

         await useAppStore.getState().populateMics()

         expect(useAppStore.getState().mics).toHaveLength(0)
         expect(useAppStore.getState().statusType).toBe('error')
      })
   })

   describe('setStatus', () => {
      it('updates statusText and statusType', () => {
         useAppStore.getState().setStatus('Recording', 'recording')

         expect(useAppStore.getState().statusText).toBe('Recording')
         expect(useAppStore.getState().statusType).toBe('recording')
      })

      it('defaults to idle type', () => {
         useAppStore.getState().setStatus('Ready')

         expect(useAppStore.getState().statusType).toBe('idle')
      })
   })
})
