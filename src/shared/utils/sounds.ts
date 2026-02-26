let ctx: AudioContext | null = null

function getCtx(): AudioContext {
   if (!ctx) ctx = new AudioContext()
   return ctx
}

function playTone(frequency: number, startTime: number, duration: number, gainValue = 1.0): void {
   const audioCtx = getCtx()
   const oscillator = audioCtx.createOscillator()
   const gainNode = audioCtx.createGain()

   oscillator.connect(gainNode)
   gainNode.connect(audioCtx.destination)

   oscillator.type = 'triangle'
   oscillator.frequency.setValueAtTime(frequency, startTime)

   gainNode.gain.setValueAtTime(gainValue, startTime)
   gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

   oscillator.start(startTime)
   oscillator.stop(startTime + duration)
}

// Two ascending notes: low → high
export function playStartSound(): void {
   const t = getCtx().currentTime
   playTone(660, t, 0.09)
   playTone(990, t + 0.1, 0.09)
}

// Two descending notes: high → low
export function playStopSound(): void {
   const t = getCtx().currentTime
   playTone(880, t, 0.09)
   playTone(550, t + 0.1, 0.11)
}
