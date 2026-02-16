import { AudioRecorder, enumerateMicrophones } from './recorder'
import './assets/styles.css'

interface Segment {
  start: string
  end: string
  text: string
}

declare global {
  interface Window {
    api: {
      transcribe(audioData: number[]): Promise<Segment[]>
      checkWhisper(): Promise<{ ready: boolean; missing: string[] }>
    }
  }
}

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

function addTranscript(segments: Segment[]) {
  for (const seg of segments) {
    const el = document.createElement('p')
    el.className = 'segment'
    el.innerHTML = `<span class="timestamp">[${seg.start} → ${seg.end}]</span> ${seg.text}`
    transcriptEl.appendChild(el)
  }
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

// Toggle recording on/off
async function toggleRecording() {
  if (isBusy) return

  if (!isRecording) {
    // START recording
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
  } else {
    // STOP recording and transcribe
    isBusy = true
    isRecording = false
    recordBtn.classList.remove('recording')
    setStatus('Transcribing...', 'processing')

    try {
      const samples = await recorder.stop()
      await recorder.destroy()

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
      isBusy = false
    }
  }
}

// Click to toggle recording
recordBtn.addEventListener('click', toggleRecording)

// Spacebar to toggle
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    toggleRecording()
  }
})

// Refresh mic list button
refreshMicsBtn.addEventListener('click', () => {
  populateMicList()
})

navigator.mediaDevices.addEventListener('devicechange', () => {
  populateMicList()
})

// Check whisper readiness on startup
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
