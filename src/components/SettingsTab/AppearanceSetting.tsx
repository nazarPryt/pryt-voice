import { clsx } from 'clsx'

import { THEMES } from '@/features/theme/types'
import { useAppStore } from '@/stores/useAppStore'

import s from './SettingsTab.module.scss'

export function AppearanceSetting() {
   const { theme, setTheme } = useAppStore()

   return (
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
   )
}
