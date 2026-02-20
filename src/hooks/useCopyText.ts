import { useState, useCallback } from 'react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { invoke } from '@tauri-apps/api/core'

const COPY_DURATION_MS = 1500

export function useCopyText() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    await writeText(text)
    invoke('write_primary', { text }).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_DURATION_MS)
  }, [])

  return { copied, copy }
}