import { emit } from '@tauri-apps/api/event'
import type { StateCreator } from 'zustand'

import { STORAGE_KEYS } from '@/shared/storageKeys'

import type { ThemeId } from './types'

export type ThemeSlice = {
   theme: ThemeId
   setTheme: (theme: ThemeId) => void
}

export const createThemeSlice: StateCreator<ThemeSlice> = set => ({
   theme: (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeId | null) ?? 'default',
   setTheme: theme => {
      localStorage.setItem(STORAGE_KEYS.THEME, theme)
      set({ theme })
      void emit('theme-changed', theme)
   },
})
