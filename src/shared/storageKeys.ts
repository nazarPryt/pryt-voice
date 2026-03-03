export const STORAGE_KEYS = {
   SELECTED_MIC_ID: 'selectedMicId',
   RECORDING_SHORTCUT: 'recordingShortcut',
   AUTO_PASTE: 'autoPaste',
   THEME: 'theme',
} as const

export type ThemeId = 'default' | 'v1' | 'v2' | 'v3'

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
   { id: 'default', label: 'Default', description: 'Deep purple dark' },
   { id: 'v1', label: 'CRT Amber', description: 'Terminal amber precision' },
   { id: 'v2', label: 'Editorial', description: 'Refined coral on dark' },
   { id: 'v3', label: 'Bauhaus', description: 'Industrial red on warm dark' },
]
