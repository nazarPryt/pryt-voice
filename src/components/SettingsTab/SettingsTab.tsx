import { clsx } from 'clsx'

import { THEMES } from '@/features/theme/types'
import { useAppStore } from '@/stores/useAppStore'

import s from './SettingsTab.module.scss'

export function SettingsTab() {
   const {
      autoPaste,
      setAutoPaste,
      theme,
      setTheme,
      maxHistory,
      setMaxHistory,
      outputLanguage,
      setOutputLanguage,
      whisperModel,
      setWhisperModel,
   } = useAppStore()

   return (
      <div className={s.container}>
         <h2 className={s.heading}>Settings</h2>
         <ul className={s.list}>
            <li className={s.item}>
               <div className={s.itemLeft}>
                  <span className={s.label}>Appearance</span>
                  <span className={s.description}>Choose a visual theme for the app.</span>
               </div>
               <div className={s.themeGrid}>
                  {THEMES.map(t => (
                     <button
                        key={t.id}
                        className={clsx(s.themeBtn, theme === t.id && s.themeBtnActive)}
                        onClick={() => setTheme(t.id)}
                        title={t.description}
                     >
                        <span className={clsx(s.themeSwatch, s[`swatch_${t.id}`])} />
                        <span className={s.themeLabel}>{t.label}</span>
                     </button>
                  ))}
               </div>
            </li>
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
            <li className={s.item}>
               <div className={s.itemLeft}>
                  <span className={s.label}>Output language</span>
                  <span className={s.description}>
                     Speak any language — result will appear in the selected language.
                  </span>
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
            <li className={s.item}>
               <div className={s.itemLeft}>
                  <span className={s.label}>Auto-paste after transcription</span>
                  <span className={s.description}>
                     Paste transcribed text at the cursor when using the global shortcut. Requires <code>xdotool</code>{' '}
                     on Linux.
                  </span>
               </div>
               <label className={s.toggle}>
                  <input type="checkbox" checked={autoPaste} onChange={e => setAutoPaste(e.target.checked)} />
                  <span className={s.slider} />
               </label>
            </li>
         </ul>
      </div>
   )
}
