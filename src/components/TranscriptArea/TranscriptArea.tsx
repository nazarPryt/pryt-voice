import { useEffect, useRef } from 'react'

import { TranscriptBlock } from '@/components/TranscriptBlock'
import type { Segment } from '@/shared/types'

import s from './TranscriptArea.module.scss'

interface Props {
   segments: Segment[][]
}

export function TranscriptArea({ segments }: Props) {
   const ref = useRef<HTMLDivElement>(null)

   useEffect(() => {
      if (ref.current) {
         ref.current.scrollTop = ref.current.scrollHeight
      }
   }, [segments])

   return (
      <div id="transcript" className={s.area} ref={ref}>
         {segments.map((group, i) => (
            <TranscriptBlock key={i} text={group.map(seg => seg.text).join(' ')} />
         ))}
      </div>
   )
}
