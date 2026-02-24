export interface Segment {
   start: string
   end: string
   text: string
}

export interface CheckResult {
   ready: boolean
   missing: string[]
}

export interface KeyShortcut {
   code: string // KeyboardEvent.code, e.g. 'Space', 'KeyR', 'F9'
   ctrl: boolean
   shift: boolean
   alt: boolean
   meta: boolean
}

export const DEFAULT_RECORDING_SHORTCUT: KeyShortcut = {
   code: 'Space',
   ctrl: false,
   shift: false,
   alt: false,
   meta: false,
}
