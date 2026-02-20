interface Props {
  isRecording: boolean
  disabled: boolean
  onClick: () => void
}

export function RecordButton({ isRecording, disabled, onClick }: Props) {
  return (
    <button
      id="record-btn"
      className={`record-btn${isRecording ? ' recording' : ''}`}
      title="Click to record (or press spacebar)"
      aria-keyshortcuts="Space"
      disabled={disabled}
      onClick={onClick}
    />
  )
}
