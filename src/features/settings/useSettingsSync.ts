import { useEffect } from 'react'

import { invoke } from '@tauri-apps/api/core'

import { useAppStore } from '@/stores/useAppStore'

export function useSettingsSync() {
   useEffect(() => {
      // Rust resets state on each launch, so sync the persisted value on mount.
      invoke('set_auto_paste', { enabled: useAppStore.getState().autoPaste }).catch(() => {})
   }, [])
}
