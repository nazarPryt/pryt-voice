import { useAppStore } from '@/stores/useAppStore'

import s from './SettingsTab.module.scss'

export function SettingsTab() {
   const { autoPaste, setAutoPaste } = useAppStore()

   return (
      <div className={s.container}>
         <h2 className={s.heading}>Settings</h2>
         <ul className={s.list}>
            <li className={s.item}>
               <div className={s.itemLeft}>
                  <span className={s.label}>Auto-paste after transcription</span>
                  <span className={s.description}>
                     Paste transcribed text at the cursor when using the global shortcut.
                     Requires <code>xdotool</code> on Linux.
                  </span>
               </div>
               <label className={s.toggle}>
                  <input
                     type="checkbox"
                     checked={autoPaste}
                     onChange={e => setAutoPaste(e.target.checked)}
                  />
                  <span className={s.slider} />
               </label>
            </li>
         </ul>
      </div>
   )
}