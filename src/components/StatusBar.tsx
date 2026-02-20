type StatusType = 'idle' | 'recording' | 'processing' | 'error'

interface Props {
  text: string
  type: StatusType
}

export function StatusBar({ text, type }: Props) {
  return <div className={`status ${type}`}>{text}</div>
}
