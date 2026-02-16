export class AudioRecorder {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private resolveStop: ((samples: Float32Array) => void) | null = null
  private startPromise: Promise<void> | null = null

  async start(deviceId?: string): Promise<void> {
    this.startPromise = this._start(deviceId)
    return this.startPromise
  }

  private async _start(deviceId?: string): Promise<void> {
    this.context = new AudioContext({ sampleRate: 16000 })

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    const workletUrl = window.location.protocol === 'file:'
      ? new URL('./audio-processor.js', window.location.href).href
      : '/audio-processor.js'
    await this.context.audioWorklet.addModule(workletUrl)

    const audioConstraints: MediaTrackConstraints = {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true
    }
    if (deviceId) {
      audioConstraints.deviceId = { exact: deviceId }
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints
    })
    this.source = this.context.createMediaStreamSource(this.stream)
    this.workletNode = new AudioWorkletNode(this.context, 'audio-processor')

    this.workletNode.port.onmessage = (event) => {
      if (event.data.command === 'audio-data') {
        const data = event.data.data as Float32Array
        this.cleanup()

        if (this.resolveStop) {
          this.resolveStop(data)
          this.resolveStop = null
        }
      }
    }

    this.source.connect(this.workletNode)
    this.workletNode.connect(this.context.destination)

    this.workletNode.port.postMessage({ command: 'start' })
  }

  async stop(): Promise<Float32Array> {
    // Wait for start() to fully complete before stopping
    if (this.startPromise) {
      try {
        await this.startPromise
      } catch {
        return new Float32Array(0)
      }
      this.startPromise = null
    }

    return new Promise((resolve) => {
      this.resolveStop = resolve

      if (this.workletNode) {
        this.workletNode.port.postMessage({ command: 'stop' })
      } else {
        resolve(new Float32Array(0))
      }
    })
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
  }

  async destroy(): Promise<void> {
    this.cleanup()
    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }
    if (this.context) {
      await this.context.close()
      this.context = null
    }
  }
}

export async function enumerateMicrophones(): Promise<MediaDeviceInfo[]> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
  } catch {
    // Permission denied — return whatever we can
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audioinput')
}
