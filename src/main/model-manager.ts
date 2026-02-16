import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

const DEV_WHISPER_DIR = join(app.getAppPath(), 'whisper')
const PROD_WHISPER_DIR = join(process.resourcesPath, 'whisper')

function isDev(): boolean {
  return !app.isPackaged
}

export function getWhisperCliPath(): string {
  if (isDev()) {
    return join(DEV_WHISPER_DIR, 'whisper.cpp', 'build', 'bin', 'whisper-cli')
  }
  return join(PROD_WHISPER_DIR, 'whisper-cli')
}

export function getModelPath(): string {
  if (isDev()) {
    return join(DEV_WHISPER_DIR, 'models', 'ggml-base.en.bin')
  }
  return join(PROD_WHISPER_DIR, 'ggml-base.en.bin')
}

export function checkWhisperReady(): { ready: boolean; missing: string[] } {
  const missing: string[] = []
  const cli = getWhisperCliPath()
  const model = getModelPath()

  if (!existsSync(cli)) missing.push(`whisper-cli not found at: ${cli}`)
  if (!existsSync(model)) missing.push(`model not found at: ${model}`)

  return { ready: missing.length === 0, missing }
}
