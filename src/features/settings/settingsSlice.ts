import { invoke } from '@tauri-apps/api/core'
import type { StateCreator } from 'zustand'

import { STORAGE_KEYS } from '@/shared/storageKeys'

export type OutputLanguage = 'english' | 'original'

export type SettingsSlice = {
   autoPaste: boolean
   setAutoPaste: (val: boolean) => Promise<void>
   outputLanguage: OutputLanguage
   setOutputLanguage: (val: OutputLanguage) => Promise<void>
}

export const createSettingsSlice: StateCreator<SettingsSlice> = set => ({
   autoPaste: localStorage.getItem(STORAGE_KEYS.AUTO_PASTE) === 'true',
   setAutoPaste: async val => {
      localStorage.setItem(STORAGE_KEYS.AUTO_PASTE, String(val))
      set({ autoPaste: val })
      await invoke('set_auto_paste', { enabled: val })
   },
   outputLanguage: (localStorage.getItem(STORAGE_KEYS.OUTPUT_LANGUAGE) as OutputLanguage | null) ?? 'english',
   setOutputLanguage: async val => {
      localStorage.setItem(STORAGE_KEYS.OUTPUT_LANGUAGE, val)
      set({ outputLanguage: val })
      await invoke('set_output_language', { translate: val === 'english' })
   },
})
