import { useEffect, useState } from 'react'

import * as Tabs from '@radix-ui/react-tabs'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { clsx } from 'clsx'
import { History, Keyboard, Mic, Settings } from 'lucide-react'

import { HistoryTab } from '@/components/HistoryTab'
import { OverviewTab } from '@/components/OverviewTab'
import { SettingsTab } from '@/components/SettingsTab'
import { ShortcutsTab } from '@/components/ShortcutsTab'
import { useRecorder } from '@/hooks/useRecorder'
import { formatShortcut } from '@/shared/utils/shortcut'
import { playStartSound, playStopSound } from '@/shared/utils/sounds'
import { useAppStore } from '@/stores/useAppStore'
import type { Segment } from '@/shared/types'

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
      recordingShortcut,
      setStatus,
      checkSetup,
      populateMics,
      addGroup,
   } = useAppStore()
   const { isBusy, startRecording, stopRecording } = useRecorder()
   const [isRecordingState, setIsRecordingState] = useState(false)
   const [isProcessing, setIsProcessing] = useState(false)

   // Listen to Rust-emitted recording/transcription events.
   useEffect(() => {
      const handlers = [
         listen('recording-started', () => {
            playStartSound()
            setIsRecordingState(true)
            setStatus('Recording — press shortcut again to stop', 'recording')
         }),
         listen('recording-stopping', () => {
            playStopSound()
            setIsRecordingState(false)
            setIsProcessing(true)
            setStatus('Transcribing...', 'processing')
         }),
         listen('recording-stopped', () => {
            setIsRecordingState(false)
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
            setIsRecordingState(false)
            setStatus(`Error: ${payload}`, 'error')
         }),
      ]

      return () => {
         handlers.forEach(p => p.then(fn => fn()))
      }
   }, [setStatus, addGroup])

   useEffect(() => {
      checkSetup()
      populateMics()
   }, [checkSetup, populateMics])

   // Register the global (OS-level) shortcut whenever it changes.
   useEffect(() => {
      const shortcutStr = formatShortcut(recordingShortcut)
      invoke('register_shortcut', { shortcut: shortcutStr }).catch(err =>
         setStatus(`Shortcut error: ${String(err)}`, 'error'),
      )
   }, [recordingShortcut, setStatus])

   // Manual toggle from the UI button (when window is open).
   const handleToggle = async () => {
      if (isBusy || isProcessing) return

      if (!isRecordingState) {
         setStatus('Starting mic...', 'recording')
         try {
            await startRecording(selectedMicId || undefined)
            playStartSound()
            setIsRecordingState(true)
            setStatus('Recording — click again to stop', 'recording')
         } catch (err) {
            setStatus(`Mic error: ${(err as Error).message}`, 'error')
         }
      } else {
         playStopSound()
         setIsRecordingState(false)
         setIsProcessing(true)
         setStatus('Transcribing...', 'processing')
         await stopRecording()
         // Result arrives via 'transcription-result' event
      }
   }

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
                  isRecording={isRecordingState}
                  disabled={isDisabled || isBusy || isProcessing}
                  onToggle={handleToggle}
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