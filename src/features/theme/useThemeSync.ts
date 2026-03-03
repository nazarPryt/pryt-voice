import { useEffect } from 'react'

import { useAppStore } from '@/stores/useAppStore'

import { applyTheme } from './applyTheme'

export function useThemeSync() {
   const theme = useAppStore(s => s.theme)
   useEffect(() => {
      applyTheme(theme)
   }, [theme])
}
