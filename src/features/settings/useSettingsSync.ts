import { useEffect } from 'react'

import { invoke } from '@tauri-apps/api/core'

import { useAppStore } from '@/stores/useAppStore'

export function useSettingsSync() {
   useEffect(() => {
      // Rust resets state on each launch, so sync persisted values on mount.
      const { autoPaste, outputLanguage, whisperModel } = useAppStore.getState()
      invoke('set_auto_paste', { enabled: autoPaste }).catch(() => {})
      invoke('set_output_language', { translate: outputLanguage === 'english' }).catch(() => {})
      invoke('set_model', { model: whisperModel }).catch(() => {})
   }, [])
}
