import { AudioRecorder, enumerateMicrophones } from './recorder'
import './assets/styles.css'
import type { Segment } from '../../shared/types'

declare global {
  interface Window {
    api: {
      transcribe(audioData: number[]): Promise<Segment[]>
      checkWhisper(): Promise<{ ready: boolean; missing: string[] }>
      copyToClipboard(text: string): void
    }
  }
}

const COPY_CONFIRMATION_DURATION_MS = 1500

const copySvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const checkSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'

const recorder = new AudioRecorder()
let isRecording = false
let isBusy = false // prevent double-clicks during start/stop/transcribe

const recordBtn = document.getElementById('record-btn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLDivElement
const transcriptEl = document.getElementById('transcript') as HTMLDivElement
const whisperStatus = document.getElementById('whisper-status') as HTMLDivElement
const micSelect = document.getElementById('mic-select') as HTMLSelectElement
const refreshMicsBtn = document.getElementById('refresh-mics') as HTMLButtonElement

function setStatus(text: string, type: 'idle' | 'recording' | 'processing' | 'error' = 'idle') {
  statusEl.textContent = text
  statusEl.className = `status ${type}`
}

function buildTranscriptBlock(text: string): HTMLElement {
  const block = document.createElement('div')
  block.className = 'transcript-block'
  block.title = 'Click to copy'

  const content = document.createElement('span')
  content.className = 'transcript-text'
  content.textContent = text

  const icon = document.createElement('span')
  icon.className = 'copy-icon'
  icon.innerHTML = copySvg

  block.appendChild(content)
  block.appendChild(icon)

  block.addEventListener('click', () => {
    window.api.copyToClipboard(content.textContent || '')
    block.classList.add('copied')
    icon.innerHTML = checkSvg
    setTimeout(() => {
      block.classList.remove('copied')
      icon.innerHTML = copySvg
    }, COPY_CONFIRMATION_DURATION_MS)
  })

  return block
}

function addTranscript(segments: Segment[]) {
  const text = segments.map((s) => s.text).join(' ')
  transcriptEl.appendChild(buildTranscriptBlock(text))
  transcriptEl.scrollTop = transcriptEl.scrollHeight
}

async function populateMicList() {
  const prev = micSelect.value
  micSelect.innerHTML = ''

  try {
    const mics = await enumerateMicrophones()
    if (mics.length === 0) {
      const opt = document.createElement('option')
      opt.value = ''
      opt.textContent = 'No microphones found'
      micSelect.appendChild(opt)
      recordBtn.disabled = true
      setStatus('No microphones detected', 'error')
      return
    }

    for (const mic of mics) {
      const opt = document.createElement('option')
      opt.value = mic.deviceId
      opt.textContent = mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`
      micSelect.appendChild(opt)
    }

    if (prev && [...micSelect.options].some((o) => o.value === prev)) {
      micSelect.value = prev
    }
  } catch (err) {
    const opt = document.createElement('option')
    opt.value = ''
    opt.textContent = 'Error loading devices'
    micSelect.appendChild(opt)
    setStatus(`Mic enumerate error: ${(err as Error).message}`, 'error')
  }
}

function getSelectedDeviceId(): string | undefined {
  return micSelect.value || undefined
}

async function startRecording() {
  isBusy = true
  recordBtn.classList.add('recording')
  setStatus('Starting mic...', 'recording')

  try {
    await recorder.start(getSelectedDeviceId())
    isRecording = true
    setStatus('Recording — click again to stop', 'recording')
  } catch (err) {
    setStatus(`Mic error: ${(err as Error).message}`, 'error')
    recordBtn.classList.remove('recording')
  } finally {
    isBusy = false
  }
}

async function stopAndTranscribe() {
  isBusy = true
  isRecording = false
  recordBtn.classList.remove('recording')
  setStatus('Transcribing...', 'processing')

  try {
    const samples = await recorder.stop()
    const audioData = Array.from(samples)
    const segments = await window.api.transcribe(audioData)

    if (segments.length === 0) {
      setStatus('No speech detected', 'idle')
    } else {
      addTranscript(segments)
      setStatus('Ready', 'idle')
    }
  } catch (err) {
    setStatus(`Transcription error: ${(err as Error).message}`, 'error')
  } finally {
    await recorder.destroy()
    isBusy = false
  }
}

async function toggleRecording() {
  if (isBusy) return
  if (!isRecording) await startRecording()
  else await stopAndTranscribe()
}

recordBtn.addEventListener('click', toggleRecording)

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    toggleRecording()
  }
})

refreshMicsBtn.addEventListener('click', () => {
  populateMicList()
})

navigator.mediaDevices.addEventListener('devicechange', () => {
  populateMicList()
})

async function checkSetup() {
  try {
    const result = await window.api.checkWhisper()
    if (!result.ready) {
      whisperStatus.textContent = `Setup needed: ${result.missing.join(', ')}`
      whisperStatus.className = 'whisper-status error'
      recordBtn.disabled = true
    } else {
      whisperStatus.textContent = 'whisper.cpp ready'
      whisperStatus.className = 'whisper-status ready'
      setStatus('Ready — click button or press spacebar to record', 'idle')
    }
  } catch {
    whisperStatus.textContent = 'Failed to check whisper status'
    whisperStatus.className = 'whisper-status error'
  }
}

populateMicList()
checkSetup()
