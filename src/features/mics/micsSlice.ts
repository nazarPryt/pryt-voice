import { invoke } from '@tauri-apps/api/core'
import type { StateCreator } from 'zustand'

import { STORAGE_KEYS } from '@/shared/storageKeys'

import type { StatusType } from '../status/statusSlice'

type Deps = { setStatus: (text: string, type?: StatusType) => void }

export type MicsSlice = {
   mics: MediaDeviceInfo[]
   micsLoading: boolean
   selectedMicId: string
   setSelectedMicId: (id: string) => Promise<void>
   populateMics: () => Promise<void>
}

export const createMicsSlice: StateCreator<MicsSlice & Deps, [], [], MicsSlice> = (set, get) => ({
   mics: [],
   micsLoading: true,
   selectedMicId: '',
   setSelectedMicId: async id => {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MIC_ID, id)
      set({ selectedMicId: id })
      await invoke('set_recording_device', { deviceName: id || null })
   },
   populateMics: async () => {
      set({ micsLoading: true })
      try {
         const devices = await invoke<Array<{ id: string; name: string }>>('list_audio_devices')
         if (devices.length === 0) {
            get().setStatus('No microphones detected', 'error')
            set({ micsLoading: false })
            return
         }
         const mics = devices.map(
            d =>
               ({
                  deviceId: d.id,
                  label: d.name,
                  kind: 'audioinput' as MediaDeviceKind,
                  groupId: '',
                  toJSON: () => ({}),
               }) as MediaDeviceInfo,
         )
         set({ mics })
         const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_MIC_ID)
         const isAvailable = saved && devices.some(d => d.id === saved)
         if (isAvailable) {
            set({ selectedMicId: saved })
         } else if (!get().selectedMicId) {
            set({ selectedMicId: devices[0].id })
         }
      } catch (err) {
         get().setStatus(`Mic enumerate error: ${(err as Error).message}`, 'error')
      } finally {
         set({ micsLoading: false })
      }
   },
})
