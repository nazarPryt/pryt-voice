import { contextBridge, ipcRenderer, clipboard } from 'electron'

export interface Segment {
  start: string
  end: string
  text: string
}

contextBridge.exposeInMainWorld('api', {
  transcribe: (audioData: number[]): Promise<Segment[]> => {
    return ipcRenderer.invoke('whisper:transcribe', audioData)
  },
  checkWhisper: (): Promise<{ ready: boolean; missing: string[] }> => {
    return ipcRenderer.invoke('whisper:check')
  },
  copyToClipboard: (text: string): void => {
    clipboard.writeText(text)
  }
})
