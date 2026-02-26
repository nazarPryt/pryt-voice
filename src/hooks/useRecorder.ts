import { useCallback, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'

export function useRecorder() {
   const [isRecording, setIsRecording] = useState(false)
   const [isBusy, setIsBusy] = useState(false)

   const startRecording = useCallback(async (deviceId?: string): Promise<void> => {
      setIsBusy(true)
      try {
         await invoke('start_recording', { deviceName: deviceId || null })
         setIsRecording(true)
      } finally {
         setIsBusy(false)
      }
   }, [])

   const stopRecording = useCallback(async (): Promise<void> => {
      setIsBusy(true)
      try {
         // Fire-and-forget: results arrive via 'transcription-result' event
         await invoke('stop_recording')
         setIsRecording(false)
      } finally {
         setIsBusy(false)
      }
   }, [])

   return { isRecording, isBusy, startRecording, stopRecording }
}