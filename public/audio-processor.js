class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffers = []
    this._recording = false

    this.port.onmessage = (event) => {
      if (event.data.command === 'start') {
        this._buffers = []
        this._recording = true
      } else if (event.data.command === 'stop') {
        this._recording = false
        // Concatenate all buffers and send back
        const totalLength = this._buffers.reduce((sum, buf) => sum + buf.length, 0)
        const result = new Float32Array(totalLength)
        let offset = 0
        for (const buf of this._buffers) {
          result.set(buf, offset)
          offset += buf.length
        }
        this.port.postMessage({ command: 'audio-data', data: result })
        this._buffers = []
      }
    }
  }

  process(inputs) {
    if (!this._recording) return true

    const input = inputs[0]
    if (input && input[0]) {
      // Copy the input data (it gets reused)
      this._buffers.push(new Float32Array(input[0]))
    }
    return true
  }
}

registerProcessor('audio-processor', AudioProcessor)
