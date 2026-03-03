import type { StateCreator } from 'zustand'

import { STORAGE_KEYS } from '@/shared/storageKeys'
import { DEFAULT_RECORDING_SHORTCUT } from '@/shared/types'
import type { KeyShortcut } from '@/shared/types'

function loadRecordingShortcut(): KeyShortcut {
   try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECORDING_SHORTCUT)
      return raw ? (JSON.parse(raw) as KeyShortcut) : DEFAULT_RECORDING_SHORTCUT
   } catch {
      return DEFAULT_RECORDING_SHORTCUT
   }
}

export type ShortcutsSlice = {
   recordingShortcut: KeyShortcut
   isCapturingShortcut: boolean
   setRecordingShortcut: (shortcut: KeyShortcut) => void
   setIsCapturingShortcut: (capturing: boolean) => void
}

export const createShortcutsSlice: StateCreator<ShortcutsSlice> = set => ({
   recordingShortcut: loadRecordingShortcut(),
   isCapturingShortcut: false,
   setRecordingShortcut: shortcut => {
      localStorage.setItem(STORAGE_KEYS.RECORDING_SHORTCUT, JSON.stringify(shortcut))
      set({ recordingShortcut: shortcut })
   },
   setIsCapturingShortcut: capturing => set({ isCapturingShortcut: capturing }),
})
