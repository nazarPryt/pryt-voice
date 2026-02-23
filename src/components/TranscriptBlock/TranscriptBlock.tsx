import { clsx } from 'clsx'
import { Check, Copy } from 'lucide-react'

import { useCopyText } from '@/hooks/useCopyText'

import s from './TranscriptBlock.module.scss'

interface Props {
   text: string
}

export function TranscriptBlock({ text }: Props) {
   const { copied, copy } = useCopyText()

   return (
      <div
         data-testid="transcript-block"
         data-copied={copied}
         className={clsx(s.block, copied && s.copied)}
         title="Click to copy"
         onClick={() => copy(text)}
      >
         <span>{text}</span>
         <span className={s.copyIcon}>{copied ? <Check size={16} /> : <Copy size={16} />}</span>
      </div>
   )
}
