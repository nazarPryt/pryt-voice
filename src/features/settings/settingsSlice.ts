import { invoke } from '@tauri-apps/api/core'
import type { StateCreator } from 'zustand'

import { STORAGE_KEYS } from '@/shared/storageKeys'

export type SettingsSlice = {
   autoPaste: boolean
   setAutoPaste: (val: boolean) => Promise<void>
}

export const createSettingsSlice: StateCreator<SettingsSlice> = set => ({
   autoPaste: localStorage.getItem(STORAGE_KEYS.AUTO_PASTE) === 'true',
   setAutoPaste: async val => {
      localStorage.setItem(STORAGE_KEYS.AUTO_PASTE, String(val))
      set({ autoPaste: val })
      await invoke('set_auto_paste', { enabled: val })
   },
})
