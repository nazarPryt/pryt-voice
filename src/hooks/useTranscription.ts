import { useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Segment } from '../types'

export type TranscribeStatus = 'idle' | 'processing' | 'error'

export function useTranscription() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [status, setStatus] = useState<TranscribeStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const transcribe = useCallback(async (audioData: Float32Array): Promise<Segment[]> => {
    setStatus('processing')
    setErrorMessage(null)
    try {
      const result = await invoke<Segment[]>('transcribe', { audioData: Array.from(audioData) })
      setSegments((prev) => [...prev, ...result])
      setStatus('idle')
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      setStatus('error')
      throw err
    }
  }, [])

  return { segments, transcribe, status, errorMessage }
}
