import { invoke } from '@tauri-apps/api/core'
import type { StateCreator } from 'zustand'

import { playStartSound, playStopSound } from '@/shared/utils/sounds'

import type { StatusType } from '../status/statusSlice'

type Deps = {
   selectedMicId: string
   setStatus: (text: string, type?: StatusType) => void
}

export type RecordingSlice = {
   isRecording: boolean
   isProcessing: boolean
   isBusy: boolean
   setIsRecording: (v: boolean) => void
   setIsProcessing: (v: boolean) => void
   startRecording: (deviceId?: string) => Promise<void>
   stopRecording: () => Promise<void>
   toggle: () => Promise<void>
}

export const createRecordingSlice: StateCreator<RecordingSlice & Deps, [], [], RecordingSlice> = (set, get) => ({
   isRecording: false,
   isProcessing: false,
   isBusy: false,
   setIsRecording: v => set({ isRecording: v }),
   setIsProcessing: v => set({ isProcessing: v }),
   startRecording: async deviceId => {
      set({ isBusy: true })
      try {
         await invoke('start_recording', { deviceName: deviceId || null })
         set({ isRecording: true })
      } finally {
         set({ isBusy: false })
      }
   },
   stopRecording: async () => {
      set({ isBusy: true })
      try {
         await invoke('stop_recording')
         set({ isRecording: false })
      } finally {
         set({ isBusy: false })
      }
   },
   toggle: async () => {
      const { isBusy, isProcessing, isRecording, selectedMicId, setStatus, startRecording, stopRecording } = get()
      if (isBusy || isProcessing) return
      if (!isRecording) {
         setStatus('Starting mic...', 'recording')
         try {
            await startRecording(selectedMicId || undefined)
            playStartSound()
            setStatus('Recording — click again to stop', 'recording')
         } catch (err) {
            setStatus(`Mic error: ${(err as Error).message}`, 'error')
         }
      } else {
         playStopSound()
         set({ isRecording: false, isProcessing: true })
         setStatus('Transcribing...', 'processing')
         await stopRecording()
      }
   },
})
