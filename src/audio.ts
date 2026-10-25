import { AudioEngine, PitchDetector } from '@kretoffer/guitar-audio-kit'

// Own the input lifecycle so a late permission response can never reopen a stopped session.
// Frequency detection remains entirely in guitar-audio-kit.
export class MicrophoneInput extends AudioEngine {
  private inputStream: MediaStream | null = null
  private analyserNode: AnalyserNode | null = null
  private inputNode: MediaStreamAudioSourceNode | null = null
  private closed = false
  onInterrupted: (() => void) | null = null

  override async init() {
    const context = new AudioContext()
    this.ctx = context
    try {
      await context.resume()
      if (this.closed) throw new DOMException('Session stopped', 'AbortError')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      } })
      if (this.closed) {
        stream.getTracks().forEach(track => track.stop())
        throw new DOMException('Session stopped', 'AbortError')
      }
      this.inputStream = stream
      this.analyserNode = context.createAnalyser()
      this.analyserNode.fftSize = 4096
      this.inputNode = context.createMediaStreamSource(stream)
      this.inputNode.connect(this.analyserNode)
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', this.interrupted))
      context.addEventListener('statechange', this.contextChanged)
    } catch (error) {
      this.destroy()
      throw error
    }
  }

  private interrupted = () => { if (!this.closed) this.onInterrupted?.() }
  private contextChanged = () => {
    if (this.ctx?.state !== 'running') this.interrupted()
  }
  override get ready() { return this.analyserNode !== null && this.ctx?.state === 'running' }
  override getSampleRate() { return this.ctx?.sampleRate ?? 44100 }
  override getFftSize() { return this.analyserNode?.fftSize ?? 4096 }
  override getTimeDomainData() {
    const buffer = new Float32Array(this.getFftSize())
    this.analyserNode?.getFloatTimeDomainData(buffer)
    return buffer
  }
  override getRmsEnergy() {
    const buffer = this.getTimeDomainData()
    return Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length)
  }
  override destroy() {
    this.closed = true
    this.inputStream?.getTracks().forEach(track => {
      track.removeEventListener('ended', this.interrupted)
      track.stop()
    })
    this.inputStream = null
    this.inputNode?.disconnect()
    this.inputNode = null
    this.analyserNode?.disconnect()
    this.analyserNode = null
    if (this.ctx) {
      this.ctx.removeEventListener('statechange', this.contextChanged)
      void this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}

export function microphoneError(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return '麦克风权限未开启，请在浏览器中允许麦克风后重试。'
  if (name === 'NotFoundError') return '没有找到麦克风，请连接输入设备后重试。'
  if (name === 'NotReadableError') return '麦克风暂时不可用，请检查是否被其他应用占用。'
  return '无法启动麦克风，请检查输入设备与浏览器权限后重试。'
}

export type PitchReading = { note: string; cents: number; frequency: number }
export function describePitch(frequency: number, reference = 440): PitchReading {
  const midi = 69 + 12 * Math.log2(frequency / reference)
  const nearest = Math.round(midi)
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  return { note: `${names[((nearest % 12) + 12) % 12]}${Math.floor(nearest / 12) - 1}`, cents: 1200 * Math.log2(frequency / (reference * 2 ** ((40 - 69) / 12))), frequency }
}

export function listenForE2(input: MicrophoneInput, onReading: (reading: PitchReading | null) => void) {
  // Construct after init: the library caches the input sample rate in its constructor.
  const detector = new PitchDetector(input)
  let frame = 0
  let samples: { time: number; frequency: number; note: string }[] = []
  let lastSample = -Infinity
  const poll = (time: number) => {
    if (time - lastSample >= 35) {
      lastSample = time
      // Ticket 01 intentionally limits detection to the E2 region. Broad-range capability
      // is not established; see the audio verification report before expanding it.
      const frequency = detector.detect(60, 110)
      if (frequency === null) {
        samples = []
        onReading(null)
      } else {
        const reading = describePitch(frequency)
        const previous = samples.at(-1)
        if (previous && previous.note !== reading.note) samples = []
        samples.push({ time, frequency, note: reading.note })
        // Keep one sample on or before the 300ms boundary to require a full window.
        while (samples.length > 1 && samples[1].time <= time - 300) samples.shift()
        const min = Math.min(...samples.map(sample => sample.frequency))
        const max = Math.max(...samples.map(sample => sample.frequency))
        if (1200 * Math.log2(max / min) > 10) {
          samples = [samples.at(-1)!]
          onReading(null)
        } else {
          onReading(time - samples[0].time >= 300 ? reading : null)
        }
      }
    }
    frame = requestAnimationFrame(poll)
  }
  frame = requestAnimationFrame(poll)
  return () => { cancelAnimationFrame(frame); detector.reset() }
}
