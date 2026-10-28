import { isMicrophoneActive, registerReferenceStop } from './audio-bus'
import { midiFrequency, openMidi } from './model'
import { stopReferenceAudio } from './reference-audio'
import type { TabExerciseData } from './exercises'

let stopCurrent: (() => void) | null = null
export function stopExerciseAudio() { stopCurrent?.() }
registerReferenceStop(stopExerciseAudio)

export async function playExercise({ exercise, bpm, reference, onEvent, onEnd }: {
  exercise: TabExerciseData; bpm: number; reference: number; onEvent: (index: number) => void; onEnd: () => void
}): Promise<() => void> {
  if (isMicrophoneActive()) throw new Error('麦克风检测中，请先停止检测再播放示范。')
  if (document.hidden) throw new Error('请回到课程页面后再播放示范。')
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 120) throw new Error('请选择 30–120 BPM 的示范速度。')
  stopExerciseAudio()
  stopReferenceAudio()
  const context = new AudioContext()
  const voices: OscillatorNode[] = []
  let stopped = false
  let frame = 0
  let lastIndex = -1
  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', hide)
    window.removeEventListener('pagehide', stop)
    context.removeEventListener('statechange', interrupted)
    for (const voice of voices) { try { voice.stop() } catch { /* Already ended. */ } }
    void context.close().catch(() => {})
    if (stopCurrent === stop) stopCurrent = null
    onEnd()
  }
  const hide = () => { if (document.hidden) stop() }
  const interrupted = () => { if (context.state !== 'running') stop() }
  stopCurrent = stop
  document.addEventListener('visibilitychange', hide)
  window.addEventListener('pagehide', stop)
  try {
    await context.resume()
    if (stopped) return stop
    if (document.hidden || isMicrophoneActive()) { stop(); return stop }
    context.addEventListener('statechange', interrupted)
    const secondsPerBeat = 60 / bpm
    const begin = context.currentTime + .06
    let cursor = 0
    const starts: number[] = []
    const totalBeats = exercise.events.reduce((sum, event) => sum + event.beats, 0)
    let beatCursor = 0
    for (const [eventIndex, event] of exercise.events.entries()) {
      starts.push(begin + cursor)
      const duration = event.beats * secondsPerBeat
      for (const note of event.notes) {
        const voice = context.createOscillator()
        const envelope = context.createGain()
        const at = begin + cursor
        // A string cannot keep its old pitch after it is plucked again. Also
        // stop at an explicit rest or the end of the selected practice range.
        let availableBeats = totalBeats - beatCursor
        let followingBeat = event.beats
        for (let next = eventIndex + 1; next < exercise.events.length; next++) {
          const following = exercise.events[next]
          if (!following.notes.length || following.notes.some(item => item.string === note.string)) {
            availableBeats = followingBeat
            break
          }
          followingBeat += following.beats
        }
        const soundingBeats = Math.min(note.sustainBeats ?? event.beats, availableBeats)
        const release = at + soundingBeats * secondsPerBeat * .94
        voice.type = 'triangle'
        voice.frequency.value = midiFrequency(openMidi[6 - note.string] + note.fret, reference)
        envelope.gain.setValueAtTime(0, at)
        const balance = note.role === 'fill' ? .55 : note.role === 'bass' ? .8 : 1
        envelope.gain.linearRampToValueAtTime(.13 * balance / Math.sqrt(event.notes.length), at + .012)
        envelope.gain.exponentialRampToValueAtTime(.0001, release)
        voice.connect(envelope).connect(context.destination)
        voice.onended = () => { voice.disconnect(); envelope.disconnect() }
        voices.push(voice)
        voice.start(at); voice.stop(release + .01)
      }
      cursor += duration
      beatCursor += event.beats
    }
    const tick = () => {
      if (stopped) return
      const now = context.currentTime
      if (now >= begin + cursor) { stop(); return }
      let index = starts.findLastIndex(at => now >= at)
      if (index < 0) index = 0
      if (index !== lastIndex) { lastIndex = index; onEvent(index) }
      frame = requestAnimationFrame(tick)
    }
    tick()
    return stop
  } catch {
    stop()
    throw new Error('示范声音无法启动，请检查浏览器声音设置后重试。')
  }
}
