import { useAppStore } from '@/stores/useAppStore'

import s from './SettingsTab.module.scss'

export function HistoryLimitSetting() {
   const { maxHistory, setMaxHistory } = useAppStore()

   return (
      <li className={s.item}>
         <div className={s.itemLeft}>
            <span className={s.label}>History limit</span>
            <span className={s.description}>Maximum number of transcriptions to keep in history (1–20).</span>
         </div>
         <input
            type="number"
            className={s.numberInput}
            min={1}
            max={20}
            value={maxHistory}
            onChange={e => setMaxHistory(Number(e.target.value))}
         />
      </li>
   )
}
