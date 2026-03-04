import { useEffect } from 'react'

import { invoke } from '@tauri-apps/api/core'

import { useAppStore } from '@/stores/useAppStore'

import { formatShortcut } from './formatShortcut'

export function useShortcutRegistration() {
   const recordingShortcut = useAppStore(s => s.recordingShortcut)
   const setStatus = useAppStore(s => s.setStatus)

   useEffect(() => {
      const shortcutStr = formatShortcut(recordingShortcut)
      invoke('register_shortcut', { shortcut: shortcutStr }).catch((err: unknown) => {
         const msg = String(err)
         const isConflict = msg.toLowerCase().includes('already registered')
         setStatus(
            isConflict
               ? `Shortcut conflict: ${shortcutStr} is already taken by another app — choose a different shortcut`
               : `Shortcut error: ${msg}`,
            'error',
         )
      })
   }, [recordingShortcut, setStatus])
}
