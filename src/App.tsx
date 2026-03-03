import * as Tabs from '@radix-ui/react-tabs'
import { clsx } from 'clsx'
import { History, Keyboard, Mic, Settings } from 'lucide-react'

import { HistoryTab } from '@/components/HistoryTab'
import { OverviewTab } from '@/components/OverviewTab'
import { SettingsTab } from '@/components/SettingsTab'
import { ShortcutsTab } from '@/components/ShortcutsTab'
import { useRecordingEvents } from '@/features/recording/useRecordingEvents'
import { useSettingsSync } from '@/features/settings/useSettingsSync'
import { useWhisperSetup } from '@/features/setup/useWhisperSetup'
import { useShortcutRegistration } from '@/features/shortcuts/useShortcutRegistration'
import { useThemeSync } from '@/features/theme/useThemeSync'
import { useAppStore } from '@/stores/useAppStore'

import s from './App.module.scss'

const NAV_ITEMS = [
   { value: 'overview', label: 'Overview', Icon: Mic },
   { value: 'history', label: 'History', Icon: History },
   { value: 'shortcuts', label: 'Shortcuts', Icon: Keyboard },
   { value: 'settings', label: 'Settings', Icon: Settings },
] as const

export function App() {
   useThemeSync()
   useWhisperSetup()
   useRecordingEvents()
   useShortcutRegistration()
   useSettingsSync()

   const { whisperStatus, checkingWhisper } = useAppStore()

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
               <OverviewTab />
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
