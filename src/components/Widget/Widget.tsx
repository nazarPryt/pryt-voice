import { useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { applyTheme } from '@/features/theme/applyTheme'
import type { ThemeId } from '@/features/theme/types'
import { STORAGE_KEYS } from '@/shared/storageKeys'

import s from './Widget.module.scss'

type State = 'recording' | 'processing' | 'done'

export function Widget() {
   const [state, setState] = useState<State>('recording')

   useEffect(() => {
      applyTheme((localStorage.getItem(STORAGE_KEYS.THEME) as ThemeId | null) ?? 'default')

      const unsubs = [
         listen('recording-started', () => setState('recording')),
         listen('recording-stopping', () => setState('processing')),
         listen('recording-stopped', () => setState('processing')),
         listen('transcription-result', () => setState('done')),
         listen('transcription-error', () => setState('done')),
         listen<ThemeId>('theme-changed', e => applyTheme(e.payload)),
      ]
      return () => {
         unsubs.forEach(p => p.then(fn => fn()))
      }
   }, [])

   const handleMouseDown = () => {
      getCurrentWindow()
         .startDragging()
         .catch(() => {})
   }

   const label = state === 'recording' ? 'Recording…' : state === 'processing' ? 'Transcribing…' : 'Done'

   return (
      <div className={s.widget} data-state={state} onMouseDown={handleMouseDown}>
         <div className={s.dot} />
         <span className={s.appName}>Pryt</span>
         <span className={s.label}>{label}</span>
      </div>
   )
}
