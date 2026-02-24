import { MicSelect } from '@/components/MicSelect'
import { RecordButton } from '@/components/RecordButton'
import { StatusBar } from '@/components/StatusBar'
import { TranscriptArea } from '@/components/TranscriptArea'
import { useAppStore } from '@/stores/useAppStore'

import s from './OverviewTab.module.scss'

interface Props {
   isRecording: boolean
   disabled: boolean
   onToggle: () => void
}

export function OverviewTab({ isRecording, disabled, onToggle }: Props) {
   const { mics, micsLoading, selectedMicId, setSelectedMicId, populateMics, groups, statusText, statusType } =
      useAppStore()

   return (
      <div className={s.overview}>
         <MicSelect
            mics={mics}
            selectedId={selectedMicId}
            loading={micsLoading}
            onSelect={setSelectedMicId}
            onRefresh={populateMics}
         />
         <TranscriptArea segments={groups} />
         <div className={s.controls}>
            <RecordButton isRecording={isRecording} disabled={disabled} onClick={onToggle} />
            <StatusBar text={statusText} type={statusType} />
         </div>
      </div>
   )
}
