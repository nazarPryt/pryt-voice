import s from './StatusBar.module.scss'

type StatusType = 'idle' | 'recording' | 'processing' | 'error'

interface Props {
   text: string
   type: StatusType
}

export function StatusBar({ text, type }: Props) {
   return <div className={`${s.status} ${s[type] ?? ''}`}>{text}</div>
}
