import type { Settings } from './model'

export type Rhythm = Pick<Settings, 'bpm' | 'beats' | 'subdivision'>
type Pulse = { time: number; step: number; bar: number; rhythm: Rhythm; oscillator?: OscillatorNode }

// Timers only fill the queue; AudioContext.currentTime owns the beat clock.
export class MetronomeClock {
  private context: AudioContext | null = null
  private timer = 0
  private frame = 0
  private queue: Pulse[] = []
  private nodes = new Set<OscillatorNode>()
  private time = 0
  private step = 0
  private bar = 0
  private rhythm: Rhythm
  private wanted: Rhythm
  private audible = true
  constructor(rhythm: Rhythm, private pulse: (step: number, rhythm: Rhythm) => void, private interrupted: () => void) {
    this.rhythm = rhythm
    this.wanted = rhythm
  }
  async start() {
    const context = new AudioContext()
    this.context = context
    await context.resume()
    if (this.context !== context) return
    this.time = context.currentTime + .035
    context.onstatechange = () => { if (this.context === context && context.state === 'suspended') this.interrupted() }
    this.pump()
    this.paint()
  }
  update(rhythm: Rhythm) {
    this.wanted = rhythm
    const now = this.context?.currentTime ?? 0
    this.flush(now)
    const future = this.queue.find(event => event.time > now)
    if (future) {
      this.time = future.time
      this.step = future.step
      this.bar = future.bar
      this.rhythm = future.rhythm
      this.queue.forEach(event => { if (event.oscillator) this.cancel(event.oscillator) })
      this.queue = []
    }
  }
  sound(enabled: boolean) {
    this.audible = enabled
    if (!enabled) this.nodes.forEach(node => this.cancel(node))
  }
  stop() {
    clearTimeout(this.timer)
    cancelAnimationFrame(this.frame)
    this.nodes.forEach(node => this.cancel(node))
    this.queue = []
    const context = this.context
    this.context = null
    if (context) { context.onstatechange = null; void context.close().catch(() => {}) }
  }
  private cancel(node: OscillatorNode) { try { node.stop() } catch { /* already ended */ } node.disconnect(); this.nodes.delete(node) }
  private flush(now: number) {
    while (this.queue.length && this.queue[0].time <= now) {
      const event = this.queue.shift()!
      this.pulse(event.step, event.rhythm)
    }
  }
  private paint = () => {
    if (!this.context) return
    this.flush(this.context.currentTime)
    this.frame = requestAnimationFrame(this.paint)
  }
  private pump = () => {
    const context = this.context
    if (!context) return
    const now = context.currentTime
    // A long foreground stall pauses instead of issuing a burst of overdue clicks.
    if (this.time < now - .02) { this.interrupted(); return }
    while (this.time < now + .05) {
      if (this.step === 0 && this.bar > 0) this.rhythm = { ...this.wanted }
      const event: Pulse = { time: this.time, step: this.step, bar: this.bar, rhythm: this.rhythm }
      if (this.audible) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const main = this.step % this.rhythm.subdivision === 0
        oscillator.frequency.value = this.step === 0 ? 1200 : main ? 800 : 550
        gain.gain.setValueAtTime(this.step === 0 ? .18 : main ? .12 : .07, this.time)
        gain.gain.exponentialRampToValueAtTime(.001, this.time + .025)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(this.time)
        oscillator.stop(this.time + .03)
        this.nodes.add(oscillator)
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes.delete(oscillator) }
        event.oscillator = oscillator
      }
      this.queue.push(event)
      this.time += 60 / this.rhythm.bpm / this.rhythm.subdivision
      this.step = (this.step + 1) % (this.rhythm.beats * this.rhythm.subdivision)
      if (this.step === 0) this.bar++
    }
    this.timer = window.setTimeout(this.pump, 25)
  }
}
