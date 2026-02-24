import s from './MicSelect.module.scss'

interface Props {
   mics: MediaDeviceInfo[]
   selectedId: string
   loading?: boolean
   onSelect: (id: string) => void
   onRefresh: () => void
}

function MicOptions({ mics, loading }: { mics: MediaDeviceInfo[]; loading?: boolean }) {
   if (loading) return <option value="">Loading mics...</option>
   if (mics.length === 0) return <option value="">No microphones found</option>
   return mics.map(mic => (
      <option key={mic.deviceId} value={mic.deviceId}>
         {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
      </option>
   ))
}

export function MicSelect({ mics, selectedId, loading, onSelect, onRefresh }: Props) {
   return (
      <div className={s.wrapper}>
         <label htmlFor="mic-select">Microphone:</label>
         <div className={s.selectWrapper}>
            <select id="mic-select" className={s.select} value={selectedId} onChange={e => onSelect(e.target.value)} disabled={loading}>
               <MicOptions mics={mics} loading={loading} />
            </select>
         </div>
         <button className={s.refreshBtn} title="Refresh device list" onClick={onRefresh}>
            &#x21bb;
         </button>
      </div>
   )
}
