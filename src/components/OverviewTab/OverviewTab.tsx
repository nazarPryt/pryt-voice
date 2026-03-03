import { MicSelect } from '@/components/MicSelect'
import { RecordButton } from '@/components/RecordButton'
import { StatusBar } from '@/components/StatusBar'
import { TranscriptArea } from '@/components/TranscriptArea'
import { useAppStore } from '@/stores/useAppStore'

import s from './OverviewTab.module.scss'

export function OverviewTab() {
   const {
      mics,
      micsLoading,
      selectedMicId,
      setSelectedMicId,
      populateMics,
      groups,
      statusText,
      statusType,
      whisperStatus,
      isRecording,
      isProcessing,
      isBusy,
      toggle,
   } = useAppStore()

   const isDisabled = !whisperStatus?.ready || mics.length === 0 || isBusy || isProcessing

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
            <RecordButton isRecording={isRecording} disabled={isDisabled} onClick={toggle} />
            <StatusBar text={statusText} type={statusType} />
         </div>
      </div>
   )
}
