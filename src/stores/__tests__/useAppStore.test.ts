import { beforeEach, describe, expect, it, vi } from 'vitest'

import { initialDataState, useAppStore } from '../useAppStore'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

const { invoke } = await import('@tauri-apps/api/core')
const mockInvoke = vi.mocked(invoke)

const seg = (text: string) => ({ start: '00:00:00.000', end: '00:00:01.000', text })

describe('useAppStore', () => {
   beforeEach(() => {
      useAppStore.setState(initialDataState)
      mockInvoke.mockReset()
   })

   describe('addGroup', () => {
      it('starts with empty groups', () => {
         expect(useAppStore.getState().groups).toEqual([])
      })

      it('adds a group of segments', () => {
         const segments = [seg('Hello world')]
         useAppStore.getState().addGroup(segments)
         expect(useAppStore.getState().groups).toHaveLength(1)
         expect(useAppStore.getState().groups[0]).toEqual(segments)
      })

      it('each call creates a separate group', () => {
         useAppStore.getState().addGroup([seg('First')])
         useAppStore.getState().addGroup([seg('Second')])
         expect(useAppStore.getState().groups).toHaveLength(2)
         expect(useAppStore.getState().groups[1][0].text).toBe('Second')
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
      it('sets mics from list_audio_devices', async () => {
         mockInvoke.mockResolvedValue([
            { id: 'hw:0,0', name: 'Built-in Mic' },
            { id: 'hw:1,0', name: 'USB Mic' },
         ])

         await useAppStore.getState().populateMics()

         const mics = useAppStore.getState().mics
         expect(mics).toHaveLength(2)
         expect(mics[0].deviceId).toBe('hw:0,0')
         expect(mics[0].label).toBe('Built-in Mic')
      })

      it('sets error status when no mics found', async () => {
         mockInvoke.mockResolvedValue([])

         await useAppStore.getState().populateMics()

         expect(useAppStore.getState().mics).toHaveLength(0)
         expect(useAppStore.getState().statusType).toBe('error')
      })

      it('selects saved mic if still available', async () => {
         localStorage.setItem('selectedMicId', 'hw:1,0')
         mockInvoke.mockResolvedValue([
            { id: 'hw:0,0', name: 'Built-in Mic' },
            { id: 'hw:1,0', name: 'USB Mic' },
         ])

         await useAppStore.getState().populateMics()

         expect(useAppStore.getState().selectedMicId).toBe('hw:1,0')
         localStorage.removeItem('selectedMicId')
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
