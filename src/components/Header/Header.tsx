import { clsx } from 'clsx'

import type { CheckResult } from '@/shared/types'

import s from './Header.module.scss'

interface Props {
   whisperStatus: CheckResult | null
   checking: boolean
}

export function Header({ whisperStatus, checking }: Props) {
   const statusClass = clsx(s.whisperStatus, {
      [s.ready]: !checking && whisperStatus?.ready,
      [s.error]: !checking && !whisperStatus?.ready,
   })

   function getStatusText() {
      if (checking) return 'Checking whisper.cpp...'
      if (whisperStatus?.ready) return 'whisper.cpp ready'
      if (whisperStatus) return `Setup needed: ${whisperStatus.missing.join(', ')}`
      return 'Failed to check whisper status'
   }

   const statusText = getStatusText()

   return (
      <header className={s.header}>
         <h1>
            <span className={s.accent}>Pryt</span> Voice
         </h1>
         <div className={statusClass}>{statusText}</div>
      </header>
   )
}
