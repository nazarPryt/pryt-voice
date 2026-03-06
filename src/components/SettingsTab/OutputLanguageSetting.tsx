import { useAppStore } from '@/stores/useAppStore'

import s from './SettingsTab.module.scss'

export function OutputLanguageSetting() {
   const { outputLanguage, setOutputLanguage } = useAppStore()

   return (
      <li className={s.item}>
         <div className={s.itemLeft}>
            <span className={s.label}>Output language</span>
            <span className={s.description}>Speak any language — result will appear in the selected language.</span>
         </div>
         <div className={s.radioGroup}>
            <label className={s.radioLabel}>
               <input
                  type="radio"
                  name="outputLanguage"
                  value="english"
                  checked={outputLanguage === 'english'}
                  onChange={() => setOutputLanguage('english')}
               />
               English
            </label>
            <label className={s.radioLabel}>
               <input
                  type="radio"
                  name="outputLanguage"
                  value="original"
                  checked={outputLanguage === 'original'}
                  onChange={() => setOutputLanguage('original')}
               />
               Keep original
            </label>
         </div>
      </li>
   )
}
