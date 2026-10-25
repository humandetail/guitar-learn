import { isMicrophoneActive, registerReferenceStop } from './audio-bus'
import { midiFrequency, openMidi, type Chord } from './model'
let context: AudioContext | null = null
let generation = 0
const voices = new Set<OscillatorNode>()
function stop() { generation++; voices.forEach(voice => { try { voice.stop() } catch { /* already ended */ } }); voices.clear() }
registerReferenceStop(stop)
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) stop() })
export async function playChord(chord: Chord, reference: number, index?: number) {
  if (isMicrophoneActive()) throw new Error('麦克风检测期间暂停参考音，结束后请重新点击播放。')
  stop()
  const current = generation
  context ??= new AudioContext()
  await context.resume()
  if (current !== generation || isMicrophoneActive() || document.hidden) return
  const selected = chord.frets.map((fret, i) => ({ fret, i })).filter(item => item.fret !== null && (index === undefined || item.i === index))
  selected.forEach(({ fret, i }, offset) => {
    const start = context!.currentTime + offset * .055
    const voice = context!.createOscillator(); const envelope = context!.createGain()
    voice.type = 'triangle'; voice.frequency.value = midiFrequency(openMidi[i] + fret!, reference)
    envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(.15 / Math.sqrt(selected.length), start + .008); envelope.gain.exponentialRampToValueAtTime(.0001, start + 1.6)
    voice.connect(envelope); envelope.connect(context!.destination); voices.add(voice)
    voice.onended = () => { voices.delete(voice); voice.disconnect(); envelope.disconnect() }
    voice.start(start); voice.stop(start + 1.65)
  })
}
