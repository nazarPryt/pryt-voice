import type { CheckResult } from '../types'

interface Props {
  whisperStatus: CheckResult | null
  checking: boolean
}

export function Header({ whisperStatus, checking }: Props) {
  const statusClass = checking
    ? 'whisper-status'
    : whisperStatus?.ready
      ? 'whisper-status ready'
      : 'whisper-status error'

  const statusText = checking
    ? 'Checking whisper.cpp...'
    : whisperStatus?.ready
      ? 'whisper.cpp ready'
      : whisperStatus
        ? `Setup needed: ${whisperStatus.missing.join(', ')}`
        : 'Failed to check whisper status'

  return (
    <header>
      <h1><span>Pryt</span> Voice</h1>
      <div className={statusClass}>{statusText}</div>
    </header>
  )
}
