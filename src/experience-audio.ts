import { isMicrophoneActive } from './audio-bus'
import { midiFrequency, openMidi } from './model'

export type Strike = { string: number; fret: number; delay?: number; duration?: number }

export class ExperienceAudio {
  private context: AudioContext | null = null
  private readonly voices = new Set<OscillatorNode>()
  private generation = 0
  private nextSweepTime = 0
  private onEnd?: () => void

  unlock() {
    if (isMicrophoneActive() || document.hidden) return
    try {
      const context = this.context ??= new AudioContext()
      if (context.state !== 'running') void context.resume().catch(() => {})
    } catch { /* The playback action reports errors to the user. */ }
  }

  async play(notes: Strike[], reference: number, { onEnd, sweep = false }: { onEnd?: () => void; sweep?: boolean } = {}) {
    if (isMicrophoneActive() || document.hidden || !notes.length) return false
    const generation = this.generation
    const context = this.context ??= new AudioContext()
    if (context.state !== 'running') {
      try { await context.resume() }
      catch (error) {
        if (generation !== this.generation) return false
        throw error
      }
    }
    if (generation !== this.generation || isMicrophoneActive() || document.hidden) return false
    this.onEnd = onEnd
    const start = sweep ? Math.max(context.currentTime, this.nextSweepTime) : context.currentTime
    if (sweep) this.nextSweepTime = start + (notes.at(-1)?.delay ?? 0) + .007
    for (const note of notes) {
      const voice = context.createOscillator()
      const gain = context.createGain()
      const at = start + (note.delay ?? 0)
      const until = at + (note.duration ?? .72)
      voice.type = 'triangle'
      voice.frequency.value = midiFrequency(openMidi[6 - note.string] + note.fret, reference)
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(.08, at + .006)
      gain.gain.exponentialRampToValueAtTime(.0001, until)
      voice.connect(gain).connect(context.destination)
      this.voices.add(voice)
      voice.onended = () => {
        voice.disconnect(); gain.disconnect()
        if (this.voices.delete(voice) && this.voices.size === 0) this.finish()
      }
      voice.start(at); voice.stop(until + .008)
    }
    return true
  }

  stop() {
    this.generation++
    this.nextSweepTime = 0
    for (const voice of this.voices) {
      try { voice.stop() } catch { /* Voice already stopped. */ }
    }
    this.voices.clear()
    this.finish()
  }

  close() {
    this.stop()
    const context = this.context
    this.context = null
    if (context) void context.close().catch(() => {})
  }

  private finish() {
    const notify = this.onEnd
    this.onEnd = undefined
    notify?.()
  }
}
