import s from './HistoryTab.module.scss'

export function HistoryTab() {
   return (
      <div className={s.container}>
         <p className={s.empty}>No recordings yet. Your transcription history will appear here.</p>
      </div>
   )
}
