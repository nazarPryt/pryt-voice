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

export function formatShortcut(shortcut: KeyShortcut): string {
   const parts: string[] = []
   if (shortcut.ctrl) parts.push('Ctrl')
   if (shortcut.alt) parts.push('Alt')
   if (shortcut.shift) parts.push('Shift')
   if (shortcut.meta) parts.push('Meta')
   const key = shortcut.code.startsWith('Key')
      ? shortcut.code.slice(3)
      : shortcut.code.startsWith('Digit')
        ? shortcut.code.slice(5)
        : shortcut.code
   parts.push(key)
   return parts.join('+')
}

export function matchesShortcut(e: KeyboardEvent, shortcut: KeyShortcut): boolean {
   return (
      e.code === shortcut.code &&
      e.ctrlKey === shortcut.ctrl &&
      e.shiftKey === shortcut.shift &&
      e.altKey === shortcut.alt &&
      e.metaKey === shortcut.meta
   )
}
