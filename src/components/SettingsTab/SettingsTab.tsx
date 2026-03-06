import { AppearanceSetting } from './AppearanceSetting'
import { AutoPasteSetting } from './AutoPasteSetting'
import { HistoryLimitSetting } from './HistoryLimitSetting'
import { OutputLanguageSetting } from './OutputLanguageSetting'
import s from './SettingsTab.module.scss'
import { WhisperModelSetting } from './WhisperModelSetting'

export function SettingsTab() {
   return (
      <div className={s.container}>
         <h2 className={s.heading}>Settings</h2>
         <ul className={s.list}>
            <AppearanceSetting />
            <HistoryLimitSetting />
            <WhisperModelSetting />
            <OutputLanguageSetting />
            <AutoPasteSetting />
         </ul>
      </div>
   )
}
