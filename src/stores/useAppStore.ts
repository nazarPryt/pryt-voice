import { create } from 'zustand'

import type { HistorySlice } from '@/features/history/historySlice'
import { createHistorySlice } from '@/features/history/historySlice'
import type { MicsSlice } from '@/features/mics/micsSlice'
import { createMicsSlice } from '@/features/mics/micsSlice'
import type { RecordingSlice } from '@/features/recording/recordingSlice'
import { createRecordingSlice } from '@/features/recording/recordingSlice'
import type { SettingsSlice } from '@/features/settings/settingsSlice'
import { createSettingsSlice } from '@/features/settings/settingsSlice'
import type { SetupSlice } from '@/features/setup/setupSlice'
import { createSetupSlice } from '@/features/setup/setupSlice'
import type { ShortcutsSlice } from '@/features/shortcuts/shortcutsSlice'
import { createShortcutsSlice } from '@/features/shortcuts/shortcutsSlice'
import type { StatusSlice } from '@/features/status/statusSlice'
import { createStatusSlice } from '@/features/status/statusSlice'
import type { ThemeSlice } from '@/features/theme/themeSlice'
import { createThemeSlice } from '@/features/theme/themeSlice'
import type { ThemeId } from '@/features/theme/types'
import { STORAGE_KEYS } from '@/shared/storageKeys'
import { DEFAULT_RECORDING_SHORTCUT } from '@/shared/types'
import type { CheckResult, KeyShortcut, Segment } from '@/shared/types'

export type AppState = ThemeSlice &
   StatusSlice &
   SetupSlice &
   MicsSlice &
   ShortcutsSlice &
   SettingsSlice &
   HistorySlice &
   RecordingSlice

function loadRecordingShortcut(): KeyShortcut {
   try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECORDING_SHORTCUT)
      return raw ? (JSON.parse(raw) as KeyShortcut) : DEFAULT_RECORDING_SHORTCUT
   } catch {
      return DEFAULT_RECORDING_SHORTCUT
   }
}

/** Data-only initial state — used to reset the store in tests. */
export const initialDataState = {
   statusText: 'Initializing...',
   statusType: 'idle' as const,
   theme: ((localStorage.getItem(STORAGE_KEYS.THEME) as ThemeId | null) ?? 'default') as ThemeId,
   whisperStatus: null as CheckResult | null,
   checkingWhisper: true,
   mics: [] as MediaDeviceInfo[],
   micsLoading: true,
   selectedMicId: '',
   recordingShortcut: loadRecordingShortcut(),
   isCapturingShortcut: false,
   autoPaste: localStorage.getItem(STORAGE_KEYS.AUTO_PASTE) === 'true',
   groups: [] as Segment[][],
   isRecording: false,
   isProcessing: false,
   isBusy: false,
}

// Slice creators are typed against their own slice shape; casting `set/get` to
// `any` here is intentional so each slice can stay self-contained without
// importing the full combined AppState type.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const useAppStore = create<AppState>()((set, get, api) => ({
   ...createThemeSlice(set as any, get as any, api),
   ...createStatusSlice(set as any, get as any, api),
   ...createSetupSlice(set as any, get as any, api),
   ...createMicsSlice(set as any, get as any, api),
   ...createShortcutsSlice(set as any, get as any, api),
   ...createSettingsSlice(set as any, get as any, api),
   ...createHistorySlice(set as any, get as any, api),
   ...createRecordingSlice(set as any, get as any, api),
}))
/* eslint-enable @typescript-eslint/no-explicit-any */
