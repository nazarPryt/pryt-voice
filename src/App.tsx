import { useCallback, useEffect } from 'react'

import { Header } from '@/components/Header'
import { MicSelect } from '@/components/MicSelect'
import { RecordButton } from '@/components/RecordButton'
import { StatusBar } from '@/components/StatusBar'
import { TranscriptArea } from '@/components/TranscriptArea'
import { useRecorder } from '@/hooks/useRecorder'
import { useAppStore } from '@/stores/useAppStore'

import s from './App.module.scss'

export function App() {
   const {
      groups,
      whisperStatus,
      checkingWhisper,
      mics,
      selectedMicId,
      statusText,
      statusType,
      isProcessing,
      setStatus,
      setSelectedMicId,
      checkSetup,
      populateMics,
      transcribe,
   } = useAppStore()
   const { isRecording, isBusy, startRecording, stopRecording } = useRecorder()

   const toggleRecording = useCallback(async () => {
      if (isBusy || isProcessing) return

      if (!isRecording) {
         setStatus('Starting mic...', 'recording')
         try {
            await startRecording(selectedMicId || undefined)
            setStatus('Recording — click again to stop', 'recording')
         } catch (err) {
            setStatus(`Mic error: ${(err as Error).message}`, 'error')
         }
      } else {
         setStatus('Transcribing...', 'processing')
         try {
            const samples = await stopRecording()
            const segments = await transcribe(samples)
            setStatus(segments.length === 0 ? 'No speech detected' : 'Ready', 'idle')
         } catch (err) {
            setStatus(`Transcription error: ${err instanceof Error ? err.message : 'unknown'}`, 'error')
         }
      }
   }, [isBusy, isProcessing, isRecording, selectedMicId, startRecording, stopRecording, setStatus, transcribe])

   useEffect(() => {
      populateMics()
      checkSetup()

      const handler = () => populateMics()
      navigator.mediaDevices.addEventListener('devicechange', handler)
      return () => navigator.mediaDevices.removeEventListener('devicechange', handler)
   }, [populateMics, checkSetup])

   useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
         if (e.code === 'Space' && !e.repeat) {
            e.preventDefault()
            toggleRecording()
         }
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
   }, [toggleRecording])

   const isDisabled = !whisperStatus?.ready || mics.length === 0

   return (
      <div className={s.app}>
         <Header whisperStatus={whisperStatus} checking={checkingWhisper} />
         <MicSelect mics={mics} selectedId={selectedMicId} onSelect={setSelectedMicId} onRefresh={populateMics} />
         <TranscriptArea segments={groups} />
         <div className={s.controls}>
            <RecordButton
               isRecording={isRecording}
               disabled={isDisabled || isBusy || isProcessing}
               onClick={toggleRecording}
            />
            <StatusBar text={statusText} type={statusType} />
         </div>
      </div>
   )
}
