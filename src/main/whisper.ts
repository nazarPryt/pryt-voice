import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getWhisperCliPath, getModelPath } from './model-manager'

export interface Segment {
  start: string
  end: string
  text: string
}

export function encodeWav(samples: Float32Array): Buffer {
  const numChannels = 1
  const sampleRate = 16000
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = samples.length * (bitsPerSample / 8)
  const headerSize = 44

  const buffer = Buffer.alloc(headerSize + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // chunk size
  buffer.writeUInt16LE(1, 20) // PCM format
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Write PCM samples (convert float32 [-1,1] to int16)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    const val = s < 0 ? s * 0x8000 : s * 0x7fff
    buffer.writeInt16LE(Math.round(val), headerSize + i * 2)
  }

  return buffer
}

function parseWhisperOutput(stdout: string): Segment[] {
  const segments: Segment[] = []
  const lines = stdout.split('\n')

  for (const line of lines) {
    // Format: [00:00:00.000 --> 00:00:02.000]   Hello world
    const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/)
    if (match) {
      segments.push({
        start: match[1],
        end: match[2],
        text: match[3].trim()
      })
    }
  }

  return segments
}

export function transcribe(audioSamples: Float32Array): Promise<Segment[]> {
  return new Promise((resolve, reject) => {
    const wavBuffer = encodeWav(audioSamples)

    const tmpDir = join(tmpdir(), 'pryt-voice')
    mkdirSync(tmpDir, { recursive: true })
    const tmpFile = join(tmpDir, `recording-${Date.now()}.wav`)
    writeFileSync(tmpFile, wavBuffer)

    const cliPath = getWhisperCliPath()
    const modelPath = getModelPath()

    const proc = spawn(cliPath, [
      '-m', modelPath,
      '-f', tmpFile,
      '--no-prints',
      '-l', 'en'
    ])

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      // Clean up temp file
      try {
        unlinkSync(tmpFile)
      } catch {
        // ignore cleanup errors
      }

      if (code !== 0) {
        reject(new Error(`whisper-cli exited with code ${code}: ${stderr}`))
        return
      }

      const segments = parseWhisperOutput(stdout)
      resolve(segments)
    })

    proc.on('error', (err) => {
      try {
        unlinkSync(tmpFile)
      } catch {
        // ignore
      }
      reject(new Error(`Failed to spawn whisper-cli: ${err.message}`))
    })
  })
}
