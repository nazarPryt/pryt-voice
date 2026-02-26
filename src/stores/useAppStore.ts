import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

import { STORAGE_KEYS } from '@/shared/storageKeys'
import { DEFAULT_RECORDING_SHORTCUT } from '@/shared/types'
import type { CheckResult, KeyShortcut, Segment } from '@/shared/types'

type StatusType = 'idle' | 'recording' | 'processing' | 'error'

interface AppState {
   // Setup
   whisperStatus: CheckResult | null
   checkingWhisper: boolean
   // Mics
   mics: MediaDeviceInfo[]
   micsLoading: boolean
   selectedMicId: string
   // Status bar
   statusText: string
   statusType: StatusType
   // Transcription
   groups: Segment[][]
   isProcessing: boolean
   errorMessage: string | null
   // Shortcuts
   recordingShortcut: KeyShortcut
   isCapturingShortcut: boolean
   // Actions
   setStatus: (text: string, type?: StatusType) => void
   setSelectedMicId: (id: string) => Promise<void>
   setRecordingShortcut: (shortcut: KeyShortcut) => void
   setIsCapturingShortcut: (capturing: boolean) => void
   checkSetup: () => Promise<void>
   populateMics: () => Promise<void>
   addGroup: (segments: Segment[]) => void
}

function loadRecordingShortcut(): KeyShortcut {
   try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECORDING_SHORTCUT)
      return raw ? (JSON.parse(raw) as KeyShortcut) : DEFAULT_RECORDING_SHORTCUT
   } catch {
      return DEFAULT_RECORDING_SHORTCUT
   }
}

export const initialDataState = {
   whisperStatus: null,
   checkingWhisper: true,
   mics: [],
   micsLoading: true,
   selectedMicId: '',
   statusText: 'Initializing...',
   statusType: 'idle' as StatusType,
   groups: [],
   isProcessing: false,
   errorMessage: null,
   recordingShortcut: loadRecordingShortcut(),
   isCapturingShortcut: false,
}

export const useAppStore = create<AppState>()((set, get) => ({
   ...initialDataState,

   setStatus: (text, type = 'idle') => set({ statusText: text, statusType: type }),

   setSelectedMicId: async id => {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MIC_ID, id)
      set({ selectedMicId: id })
      await invoke('set_recording_device', { deviceName: id || null })
   },

   setRecordingShortcut: shortcut => {
      localStorage.setItem(STORAGE_KEYS.RECORDING_SHORTCUT, JSON.stringify(shortcut))
      set({ recordingShortcut: shortcut })
   },

   setIsCapturingShortcut: capturing => set({ isCapturingShortcut: capturing }),

   checkSetup: async () => {
      set({ checkingWhisper: true })
      try {
         const result = await invoke<CheckResult>('check_whisper')
         set({ whisperStatus: result })
         if (result.ready) {
            get().setStatus('Ready — click the button or use your shortcut to record', 'idle')
         }
      } catch {
         set({ whisperStatus: null })
      } finally {
         set({ checkingWhisper: false })
      }
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
         // Map to MediaDeviceInfo shape for minimal UI changes
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

   addGroup: (segments: Segment[]) => {
      set(state => ({ groups: [...state.groups, segments] }))
   },
}))