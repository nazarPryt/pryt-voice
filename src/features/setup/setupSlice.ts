import { invoke } from '@tauri-apps/api/core'
import type { StateCreator } from 'zustand'

import type { CheckResult } from '@/shared/types'

import type { StatusType } from '../status/statusSlice'

type Deps = { setStatus: (text: string, type?: StatusType) => void }

export type SetupSlice = {
   whisperStatus: CheckResult | null
   checkingWhisper: boolean
   checkSetup: () => Promise<void>
}

export const createSetupSlice: StateCreator<SetupSlice & Deps, [], [], SetupSlice> = (set, get) => ({
   whisperStatus: null,
   checkingWhisper: true,
   checkSetup: async () => {
      set({ checkingWhisper: true })
      try {
         const result = await invoke<CheckResult>('check_whisper')
         set({ whisperStatus: result })
         if (result.ready) {
            get().setStatus('Ready — click the button or use your shortcut to record', 'idle')
         }
      } catch {
         set({ whisperStatus: null })
      } finally {
         set({ checkingWhisper: false })
      }
   },
})
