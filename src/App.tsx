import { useCallback, useEffect, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'

import { Header } from '@/components/Header'
import { MicSelect } from '@/components/MicSelect'
import { RecordButton } from '@/components/RecordButton'
import { StatusBar } from '@/components/StatusBar'
import { TranscriptArea } from '@/components/TranscriptArea'
import { useRecorder } from '@/hooks/useRecorder'
import { useTranscription } from '@/hooks/useTranscription'
import { enumerateMicrophones } from '@/recorder'
import type { CheckResult } from '@/shared/types'

import s from './App.module.scss'

type StatusType = 'idle' | 'recording' | 'processing' | 'error'

export function App() {
   const [mics, setMics] = useState<MediaDeviceInfo[]>([])
   const [selectedMicId, setSelectedMicId] = useState('')
   const [whisperStatus, setWhisperStatus] = useState<CheckResult | null>(null)
   const [checkingWhisper, setCheckingWhisper] = useState(true)
   const [statusText, setStatusText] = useState('Initializing...')
   const [statusType, setStatusType] = useState<StatusType>('idle')
   const { isRecording, isBusy, startRecording, stopRecording } = useRecorder()
   const { groups, transcribe, isProcessing } = useTranscription()

   const setStatus = useCallback((text: string, type: StatusType = 'idle') => {
      setStatusText(text)
      setStatusType(type)
   }, [])

   const populateMicList = useCallback(async () => {
      try {
         const devices = await enumerateMicrophones()
         setMics(devices)
         if (devices.length === 0) {
            setStatus('No microphones detected', 'error')
         }
      } catch (err) {
         setStatus(`Mic enumerate error: ${(err as Error).message}`, 'error')
      }
   }, [setStatus])

   const checkSetup = useCallback(async () => {
      setCheckingWhisper(true)
      try {
         const result = await invoke<CheckResult>('check_whisper')
         setWhisperStatus(result)
         if (result.ready) {
            setStatus('Ready — click button or press spacebar to record', 'idle')
         }
      } catch {
         setWhisperStatus(null)
      } finally {
         setCheckingWhisper(false)
      }
   }, [setStatus])

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
   }, [isBusy, isProcessing, isRecording, selectedMicId, startRecording, stopRecording, setStatus])

   useEffect(() => {
      populateMicList()
      checkSetup()

      const handler = () => populateMicList()
      navigator.mediaDevices.addEventListener('devicechange', handler)
      return () => navigator.mediaDevices.removeEventListener('devicechange', handler)
   }, [populateMicList, checkSetup])

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
         <MicSelect mics={mics} selectedId={selectedMicId} onSelect={setSelectedMicId} onRefresh={populateMicList} />
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
