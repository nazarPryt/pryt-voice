import type { KeyShortcut } from '@/shared/types'

export function formatShortcut(shortcut: KeyShortcut): string {
   const parts: string[] = []
   if (shortcut.ctrl) parts.push('Ctrl')
   if (shortcut.alt) parts.push('Alt')
   if (shortcut.shift) parts.push('Shift')
   if (shortcut.meta) parts.push('Super')
   const key = shortcut.code.startsWith('Key')
      ? shortcut.code.slice(3)
      : shortcut.code.startsWith('Digit')
        ? shortcut.code.slice(5)
        : shortcut.code
   parts.push(key)
   return parts.join('+')
}
