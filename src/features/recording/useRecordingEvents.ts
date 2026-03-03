import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'

import type { Segment } from '@/shared/types'
import { playStartSound, playStopSound } from '@/shared/utils/sounds'
import { useAppStore } from '@/stores/useAppStore'

export function useRecordingEvents() {
   const setIsRecording = useAppStore(s => s.setIsRecording)
   const setIsProcessing = useAppStore(s => s.setIsProcessing)
   const setStatus = useAppStore(s => s.setStatus)
   const addGroup = useAppStore(s => s.addGroup)

   useEffect(() => {
      const handlers = [
         listen('recording-started', () => {
            playStartSound()
            setIsRecording(true)
            setStatus('Recording — press shortcut again to stop', 'recording')
         }),
         listen('recording-stopping', () => {
            playStopSound()
            setIsRecording(false)
            setIsProcessing(true)
            setStatus('Transcribing...', 'processing')
         }),
         listen('recording-stopped', () => {
            setIsRecording(false)
         }),
         listen<Segment[]>('transcription-result', ({ payload }) => {
            setIsProcessing(false)
            if (payload.length > 0) {
               addGroup(payload)
            }
            setStatus(payload.length === 0 ? 'No speech detected' : 'Ready', 'idle')
         }),
         listen<string>('transcription-error', ({ payload }) => {
            setIsProcessing(false)
            setIsRecording(false)
            setStatus(`Error: ${payload}`, 'error')
         }),
      ]

      return () => {
         handlers.forEach(p => p.then(fn => fn()))
      }
   }, [setIsRecording, setIsProcessing, setStatus, addGroup])
}
