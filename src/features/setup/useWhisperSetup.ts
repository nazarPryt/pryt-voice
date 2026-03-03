import { useEffect } from 'react'

import { useAppStore } from '@/stores/useAppStore'

export function useWhisperSetup() {
   const checkSetup = useAppStore(s => s.checkSetup)
   const populateMics = useAppStore(s => s.populateMics)

   useEffect(() => {
      checkSetup()
      populateMics()
   }, [checkSetup, populateMics])
}
