import type { StateCreator } from 'zustand'

export type StatusType = 'idle' | 'recording' | 'processing' | 'error'

export type StatusSlice = {
   statusText: string
   statusType: StatusType
   setStatus: (text: string, type?: StatusType) => void
}

export const createStatusSlice: StateCreator<StatusSlice> = set => ({
   statusText: 'Initializing...',
   statusType: 'idle' as StatusType,
   setStatus: (text, type = 'idle') => set({ statusText: text, statusType: type }),
})
