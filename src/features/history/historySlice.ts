import type { StateCreator } from 'zustand'

import type { Segment } from '@/shared/types'

export type HistorySlice = {
   groups: Segment[][]
   addGroup: (segments: Segment[]) => void
}

export const createHistorySlice: StateCreator<HistorySlice> = set => ({
   groups: [],
   addGroup: segments => set(state => ({ groups: [...state.groups, segments] })),
})
