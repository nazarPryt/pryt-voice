import { useCallback, useEffect } from 'react'

import * as Tabs from '@radix-ui/react-tabs'
import { clsx } from 'clsx'
import { History, Keyboard, Mic, Settings } from 'lucide-react'

import { HistoryTab } from '@/components/HistoryTab'
import { OverviewTab } from '@/components/OverviewTab'
import { SettingsTab } from '@/components/SettingsTab'
import { ShortcutsTab } from '@/components/ShortcutsTab'
import { useRecorder } from '@/hooks/useRecorder'
import { useAppStore } from '@/stores/useAppStore'
import { matchesShortcut } from '@/shared/types'

import s from './App.module.scss'

const NAV_ITEMS = [
   { value: 'overview', label: 'Overview', Icon: Mic },
   { value: 'history', label: 'History', Icon: History },
   { value: 'shortcuts', label: 'Shortcuts', Icon: Keyboard },
   { value: 'settings', label: 'Settings', Icon: Settings },
] as const

export function App() {
   const {
      whisperStatus,
      checkingWhisper,
      mics,
      selectedMicId,
      isProcessing,
      recordingShortcut,
      setStatus,
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
         if (!e.repeat && matchesShortcut(e, recordingShortcut)) {
            e.preventDefault()
            toggleRecording()
         }
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
   }, [toggleRecording, recordingShortcut])

   const isDisabled = !whisperStatus?.ready || mics.length === 0

   const whisperStatusClass = clsx(s.whisperBadge, {
      [s.ready]: !checkingWhisper && whisperStatus?.ready,
      [s.error]: !checkingWhisper && !whisperStatus?.ready,
   })

   function getWhisperText() {
      if (checkingWhisper) return 'Checking...'
      if (whisperStatus?.ready) return 'whisper.cpp ready'
      if (whisperStatus) return `Missing: ${whisperStatus.missing.join(', ')}`
      return 'Setup needed'
   }

   return (
      <Tabs.Root orientation="vertical" defaultValue="overview" className={s.app}>
         <Tabs.List className={s.sidebar}>
            <div className={s.logo}>
               <span className={s.accent}>Pryt</span> Voice
            </div>

            <nav className={s.nav}>
               {NAV_ITEMS.map(({ value, label, Icon }) => (
                  <Tabs.Trigger key={value} value={value} className={s.navItem}>
                     <Icon size={16} />
                     <span>{label}</span>
                  </Tabs.Trigger>
               ))}
            </nav>

            <div className={s.sidebarFooter}>
               <span className={whisperStatusClass}>{getWhisperText()}</span>
            </div>
         </Tabs.List>

         <div className={s.content}>
            <Tabs.Content value="overview" className={s.tabContent}>
               <OverviewTab
                  isRecording={isRecording}
                  disabled={isDisabled || isBusy || isProcessing}
                  onToggle={toggleRecording}
               />
            </Tabs.Content>
            <Tabs.Content value="history" className={s.tabContent}>
               <HistoryTab />
            </Tabs.Content>
            <Tabs.Content value="shortcuts" className={s.tabContent}>
               <ShortcutsTab />
            </Tabs.Content>
            <Tabs.Content value="settings" className={s.tabContent}>
               <SettingsTab />
            </Tabs.Content>
         </div>
      </Tabs.Root>
   )
}
