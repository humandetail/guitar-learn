import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { test } from 'node:test'
import { AudioEngine, PitchDetector } from '@kretoffer/guitar-audio-kit'

const code = readFileSync(new URL('../GuitarLearn/Resources/PitchDetector.js', import.meta.url), 'utf8')
function make(rate) {
  const context = createContext({})
  runInContext(code, context)
  return context.createGuitarDetector(rate)
}
const target = 82.4068892282175
const wave = (rate, hz, offset = 0) => Array.from({ length: 4096 }, (_, i) => 0.35 * Math.sin(2 * Math.PI * hz * (i + offset) / rate))

test('bundled detector matches the installed library, including its errors', () => {
  let cases = 0
  for (const rate of [44100, 48000]) {
    for (const hz of [0, 70, 80.53400538212165, target, 84.27977307431335, 110, 164.813778456435, 440]) {
      const pcm = wave(rate, hz)
      const engine = new AudioEngine()
      Object.defineProperty(engine, 'ready', { get: () => true })
      engine.getSampleRate = () => rate
      engine.getTimeDomainData = () => Float32Array.from(pcm)
      engine.getRmsEnergy = () => Math.sqrt(pcm.reduce((sum, v) => sum + v * v, 0) / pcm.length)
      const original = new PitchDetector(engine)
      const bridge = make(rate)
      for (let i = 0; i < 10; i++) {
        assert.equal(bridge.analyze(pcm, i * 0.05).rawFrequency, original.detect(target * 2 ** (-5 / 12), target * 2 ** (5 / 12)))
        cases++
      }
    }
  }
  assert.equal(cases, 160)
})

test('a full 300 ms stable window is required; silence and interruption reset it', () => {
  const bridge = make(48000)
  const pcm = wave(48000, target)
  for (let i = 0; i < 6; i++) assert.equal(bridge.analyze(pcm, i * 0.05).frequency, null)
  const stable = bridge.analyze(pcm, 0.3)
  assert.equal(stable.note, 'E2')
  assert.ok(Math.abs(stable.cents) < 5)
  assert.equal(bridge.analyze(pcm, 0.5).frequency, null, '200 ms gap cannot count as stability')
  for (let i = 1; i <= 6; i++) bridge.analyze(pcm, 0.5 + i * 0.05)
  assert.equal(bridge.analyze(Array(4096).fill(0), 0.85).frequency, null)
  assert.equal(bridge.analyze(pcm, 0.9).frequency, null)
  bridge.reset()
  assert.equal(bridge.analyze(pcm, 1).frequency, null)
})

test('pitch variation restarts the window and malformed input is rejected', () => {
  const bridge = make(48000)
  const pcm = wave(48000, target)
  for (let i = 0; i < 10; i++) bridge.analyze(pcm, i * 0.05)
  const changed = wave(48000, target * 2 ** (25 / 1200))
  // Median history can hold the previous pitch for two frames; the third must reset.
  for (let i = 0; i < 3; i++) bridge.analyze(changed, 0.5 + i * 0.05)
  assert.equal(bridge.analyze(changed, 0.65).frequency, null)
  assert.throws(() => bridge.analyze([1, 2, 3], 0.7), /4096/)
  assert.throws(() => bridge.analyze(Array(4096).fill(NaN), 0.7), /finite/)
  assert.equal(bridge.analyze(pcm, 0.8).frequency, null)
})

test('moving-phase E2 retains the known precision failures instead of masking them', () => {
  for (const [rate, expected] of [[44100, 82.7], [48000, 82.9]]) {
    const bridge = make(rate)
    let result
    for (let i = 0; i < 12; i++) result = bridge.analyze(wave(rate, target, i * 2048), (i * 2048 + 4096) / rate)
    assert.equal(result.frequency, expected)
    assert.ok(Math.abs(result.cents) > 5, 'This is an explicit precision failure, not an acceptance pass')
  }
})
