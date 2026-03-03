import { useEffect, useState } from 'react'

import { formatShortcut } from '@/features/shortcuts/formatShortcut'
import { DEFAULT_RECORDING_SHORTCUT } from '@/shared/types'
import type { KeyShortcut } from '@/shared/types'
import { useAppStore } from '@/stores/useAppStore'

import s from './ShortcutsTab.module.scss'

const MODIFIER_CODES = new Set([
   'ControlLeft',
   'ControlRight',
   'ShiftLeft',
   'ShiftRight',
   'AltLeft',
   'AltRight',
   'MetaLeft',
   'MetaRight',
])

export function ShortcutsTab() {
   const { recordingShortcut, setRecordingShortcut, setIsCapturingShortcut } = useAppStore()
   const [isCapturing, setIsCapturing] = useState(false)
   const [pending, setPending] = useState<KeyShortcut | null>(null)

   const startCapture = () => {
      setIsCapturing(true)
      setIsCapturingShortcut(true)
      setPending(null)
   }

   const cancelCapture = () => {
      setIsCapturing(false)
      setIsCapturingShortcut(false)
      setPending(null)
   }

   const saveShortcut = () => {
      if (pending) setRecordingShortcut(pending)
      setIsCapturing(false)
      setIsCapturingShortcut(false)
      setPending(null)
   }

   const resetToDefault = () => {
      setRecordingShortcut(DEFAULT_RECORDING_SHORTCUT)
      setIsCapturing(false)
      setIsCapturingShortcut(false)
      setPending(null)
   }

   useEffect(() => {
      if (!isCapturing) return

      const onKeyDown = (e: KeyboardEvent) => {
         e.preventDefault()
         if (MODIFIER_CODES.has(e.code)) return
         setPending({
            code: e.code,
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey,
         })
      }

      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
   }, [isCapturing])

   return (
      <div className={s.container}>
         <h2 className={s.heading}>Keyboard Shortcuts</h2>
         <ul className={s.list}>
            <li className={s.item}>
               <div className={s.itemLeft}>
                  <span className={s.description}>Toggle recording</span>
                  {isCapturing ? (
                     <div className={s.captureZone}>
                        {pending ? (
                           <kbd className={s.key}>{formatShortcut(pending)}</kbd>
                        ) : (
                           <span className={s.captureHint}>Press a key combination…</span>
                        )}
                     </div>
                  ) : (
                     <kbd className={s.key}>{formatShortcut(recordingShortcut)}</kbd>
                  )}
               </div>
               <div className={s.itemActions}>
                  {isCapturing ? (
                     <>
                        <button className={s.btn} onClick={saveShortcut} disabled={!pending}>
                           Save
                        </button>
                        <button className={s.btnGhost} onClick={cancelCapture}>
                           Cancel
                        </button>
                     </>
                  ) : (
                     <>
                        <button className={s.btn} onClick={startCapture}>
                           Change
                        </button>
                        <button className={s.btnGhost} onClick={resetToDefault}>
                           Reset
                        </button>
                     </>
                  )}
               </div>
            </li>

            <li className={s.item}>
               <div className={s.itemLeft}>
                  <span className={s.description}>Copy transcript block</span>
                  <kbd className={s.key}>Click</kbd>
               </div>
            </li>
         </ul>
      </div>
   )
}
