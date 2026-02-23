import s from './ShortcutsTab.module.scss'

const shortcuts = [
   { key: 'Space', description: 'Start / stop recording' },
   { key: 'Click', description: 'Copy transcript block to clipboard' },
]

export function ShortcutsTab() {
   return (
      <div className={s.container}>
         <h2 className={s.heading}>Keyboard Shortcuts</h2>
         <ul className={s.list}>
            {shortcuts.map(({ key, description }) => (
               <li key={key} className={s.item}>
                  <kbd className={s.key}>{key}</kbd>
                  <span className={s.description}>{description}</span>
               </li>
            ))}
         </ul>
      </div>
   )
}
