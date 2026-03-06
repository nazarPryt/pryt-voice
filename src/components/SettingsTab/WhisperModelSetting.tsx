import { useAppStore } from '@/stores/useAppStore'

import s from './SettingsTab.module.scss'

export function WhisperModelSetting() {
   const { whisperModel, setWhisperModel } = useAppStore()

   return (
      <li className={s.item}>
         <div className={s.itemLeft}>
            <span className={s.label}>Whisper model</span>
            <span className={s.description}>Larger model is more accurate but slower to transcribe.</span>
         </div>
         <div className={s.radioGroup}>
            <label className={s.radioLabel}>
               <input
                  type="radio"
                  name="whisperModel"
                  value="base"
                  checked={whisperModel === 'base'}
                  onChange={() => setWhisperModel('base')}
               />
               Base <span className={s.modelHint}>fast · 145 MB</span>
            </label>
            <label className={s.radioLabel}>
               <input
                  type="radio"
                  name="whisperModel"
                  value="small"
                  checked={whisperModel === 'small'}
                  onChange={() => setWhisperModel('small')}
               />
               Small <span className={s.modelHint}>accurate · 488 MB</span>
            </label>
         </div>
      </li>
   )
}
