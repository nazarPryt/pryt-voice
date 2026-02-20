import { useCallback, useRef, useState } from 'react'

import { AudioRecorder } from '@/recorder'

export function useRecorder() {
   const recorderRef = useRef<AudioRecorder>(new AudioRecorder())
   const [isRecording, setIsRecording] = useState(false)
   const [isBusy, setIsBusy] = useState(false)

   const startRecording = useCallback(async (deviceId?: string): Promise<void> => {
      setIsBusy(true)
      try {
         await recorderRef.current.start(deviceId)
         setIsRecording(true)
      } finally {
         setIsBusy(false)
      }
   }, [])

   const stopRecording = useCallback(async (): Promise<Float32Array> => {
      setIsBusy(true)
      try {
         const samples = await recorderRef.current.stop()
         setIsRecording(false)
         return samples
      } finally {
         await recorderRef.current.destroy()
         recorderRef.current = new AudioRecorder()
         setIsBusy(false)
      }
   }, [])

   return { isRecording, isBusy, startRecording, stopRecording }
}
