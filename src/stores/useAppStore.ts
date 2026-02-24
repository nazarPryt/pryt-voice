import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'

import { enumerateMicrophones } from '@/recorder'
import { STORAGE_KEYS } from '@/shared/storageKeys'
import type { CheckResult, Segment } from '@/shared/types'

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
   // Actions
   setStatus: (text: string, type?: StatusType) => void
   setSelectedMicId: (id: string) => void
   checkSetup: () => Promise<void>
   populateMics: () => Promise<void>
   transcribe: (audioData: Float32Array) => Promise<Segment[]>
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
}

export const useAppStore = create<AppState>()((set, get) => ({
   ...initialDataState,

   setStatus: (text, type = 'idle') => set({ statusText: text, statusType: type }),

   setSelectedMicId: id => {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MIC_ID, id)
      set({ selectedMicId: id })
   },

   checkSetup: async () => {
      set({ checkingWhisper: true })
      try {
         const result = await invoke<CheckResult>('check_whisper')
         set({ whisperStatus: result })
         if (result.ready) {
            get().setStatus('Ready — click button or press spacebar to record', 'idle')
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
         const devices = await enumerateMicrophones()
         set({ mics: devices })
         if (devices.length === 0) {
            get().setStatus('No microphones detected', 'error')
            return
         }
         const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_MIC_ID)
         const isAvailable = saved && devices.some(d => d.deviceId === saved)
         if (isAvailable) {
            set({ selectedMicId: saved })
         } else if (!get().selectedMicId) {
            set({ selectedMicId: devices[0].deviceId })
         }
      } catch (err) {
         get().setStatus(`Mic enumerate error: ${(err as Error).message}`, 'error')
      } finally {
         set({ micsLoading: false })
      }
   },

   transcribe: async (audioData: Float32Array): Promise<Segment[]> => {
      set({ isProcessing: true, errorMessage: null })
      try {
         const result = await invoke<Segment[]>('transcribe', { audioData: Array.from(audioData) })
         if (result.length > 0) {
            set(state => ({ groups: [...state.groups, result] }))
         }
         set({ isProcessing: false })
         return result
      } catch (err) {
         const msg = err instanceof Error ? err.message : String(err)
         set({ errorMessage: msg, isProcessing: false })
         throw err
      }
   },
}))
