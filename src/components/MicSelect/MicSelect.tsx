import s from './MicSelect.module.scss'

interface Props {
   mics: MediaDeviceInfo[]
   selectedId: string
   onSelect: (id: string) => void
   onRefresh: () => void
}

export function MicSelect({ mics, selectedId, onSelect, onRefresh }: Props) {
   return (
      <div className={s.wrapper}>
         <label htmlFor="mic-select">Microphone:</label>
         <div className={s.selectWrapper}>
            <select id="mic-select" className={s.select} value={selectedId} onChange={e => onSelect(e.target.value)}>
               {mics.length === 0 ? (
                  <option value="">No microphones found</option>
               ) : (
                  mics.map(mic => (
                     <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                     </option>
                  ))
               )}
            </select>
         </div>
         <button className={s.refreshBtn} title="Refresh device list" onClick={onRefresh}>
            &#x21bb;
         </button>
      </div>
   )
}
