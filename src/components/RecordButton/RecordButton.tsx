import { clsx } from 'clsx'

import s from './RecordButton.module.scss'

interface Props {
   isRecording: boolean
   disabled: boolean
   onClick: () => void
}

export function RecordButton({ isRecording, disabled, onClick }: Props) {
   return (
      <button
         id="record-btn"
         data-testid="record-btn"
         className={clsx(s.btn, isRecording && s.recording)}
         title="Click to record (or press spacebar)"
         aria-keyshortcuts="Space"
         disabled={disabled}
         onClick={onClick}
      >
         <span className={s.dot} />
         <span className={s.label}>{isRecording ? 'Stop' : 'Record'}</span>
      </button>
   )
}
