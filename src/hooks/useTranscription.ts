import { useCallback, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'

import type { Segment } from '@/shared/types'

export type TranscribeStatus = 'idle' | 'processing' | 'error'

export function useTranscription() {
   const [groups, setGroups] = useState<Segment[][]>([])
   const [status, setStatus] = useState<TranscribeStatus>('idle')
   const [errorMessage, setErrorMessage] = useState<string | null>(null)

   const transcribe = useCallback(async (audioData: Float32Array): Promise<Segment[]> => {
      setStatus('processing')
      setErrorMessage(null)
      try {
         const result = await invoke<Segment[]>('transcribe', { audioData: Array.from(audioData) })
         if (result.length > 0) {
            setGroups(prev => [...prev, result])
         }
         setStatus('idle')
         return result
      } catch (err) {
         const msg = err instanceof Error ? err.message : String(err)
         setErrorMessage(msg)
         setStatus('error')
         throw err
      }
   }, [])

   return {
      groups,
      transcribe,
      isProcessing: status === 'processing',
      errorMessage,
   }
}
