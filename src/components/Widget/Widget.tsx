import { useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import type { ThemeId } from '@/shared/storageKeys'

import s from './Widget.module.scss'

type State = 'recording' | 'processing' | 'done'

function applyTheme(theme: ThemeId) {
   if (theme === 'default') {
      delete document.documentElement.dataset.theme
   } else {
      document.documentElement.dataset.theme = theme
   }
}

export function Widget() {
   const [state, setState] = useState<State>('recording')

   useEffect(() => {
      // Apply saved theme on mount
      const saved = localStorage.getItem('theme') as ThemeId | null
      applyTheme(saved ?? 'default')

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
