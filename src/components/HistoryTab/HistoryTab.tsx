import { useCallback } from 'react'

import { clsx } from 'clsx'
import { format, isToday } from 'date-fns'
import { Trash2 } from 'lucide-react'

import { useCopyText } from '@/hooks/useCopyText'
import type { HistoryEntry } from '@/shared/types'
import { useAppStore } from '@/stores/useAppStore'

import s from './HistoryTab.module.scss'

function formatTime(timestamp: number): string {
   const date = new Date(timestamp)
   return isToday(date) ? format(date, 'HH:mm') : format(date, 'MMM d · HH:mm')
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
   const { copied, copy } = useCopyText()
   const handleClick = useCallback(() => copy(entry.text), [copy, entry.text])
   return (
      <li
         data-testid="history-item"
         data-copied={copied}
         className={clsx(s.entry, copied && s.copied)}
         onClick={handleClick}
         title="Click to copy"
      >
         <p className={s.entryText}>{entry.text}</p>
         <span className={s.entryTime}>{copied ? 'Copied!' : formatTime(entry.createdAt)}</span>
      </li>
   )
}

export function HistoryTab() {
   const { history, clearHistory } = useAppStore()

   if (history.length === 0) {
      return (
         <div className={clsx(s.container, s.empty)}>
            <p className={s.emptyText}>No recordings yet. Your transcription history will appear here.</p>
         </div>
      )
   }

   return (
      <div className={s.container}>
         <div className={s.header}>
            <h2 className={s.heading}>History</h2>
            <button
               data-testid="clear-history-btn"
               className={s.clearBtn}
               onClick={clearHistory}
               title="Clear all history"
            >
               <Trash2 size={14} />
               Clear all
            </button>
         </div>
         <ul className={s.list}>
            {history.map(entry => (
               <HistoryItem key={entry.id} entry={entry} />
            ))}
         </ul>
      </div>
   )
}
