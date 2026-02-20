import { useEffect, useRef } from 'react'
import { TranscriptBlock } from './TranscriptBlock'
import type { Segment } from '../types'

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
    <div id="transcript" className="transcript-area" ref={ref}>
      {segments.map((group, i) => (
        <TranscriptBlock key={i} text={group.map((s) => s.text).join(' ')} />
      ))}
    </div>
  )
}
