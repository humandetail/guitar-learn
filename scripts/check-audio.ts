/** Synthetic boundary check only. No microphone, browser, guitar, or UI timing is tested.
 * Run: npm run test:audio. Expected algorithm failures produce exit code 1.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { AudioEngine, PitchDetector } from '@kretoffer/guitar-audio-kit'

// Independent equal-temperament reference constants; do not derive expected Hz
// using application/library frequency conversion code under test.
const references = [
  { a4: 430, E2: 80.53400538212165, E6: 1288.5440861139462 },
  { a4: 440, E2: 82.4068892282175, E6: 1318.5102276514797 },
  { a4: 441, E2: 82.59417761282708, E6: 1321.506841805233 },
  { a4: 450, E2: 84.27977307431335, E6: 1348.4763691890134 },
]
const fixtures = references.flatMap(({ a4, E2, E6 }) => [
  { note: 'E2', a4, hz: E2, min: 60, max: 1500, range: 'wide' },
  { note: 'E2', a4, hz: E2, min: 60, max: 110, range: 'narrow' },
  { note: 'E6', a4, hz: E6, min: 60, max: 1500, range: 'wide' },
  { note: 'E6', a4, hz: E6, min: 1200, max: 1400, range: 'narrow' },
  { note: 'A4', a4, hz: a4, min: 60, max: 1500, range: 'wide' },
])
const results = []
for (const sampleRate of [44100, 48000]) {
  for (const fixture of fixtures) {
    const data = Float32Array.from({ length: 4096 }, (_, i) =>
      0.2 * Math.sin(2 * Math.PI * fixture.hz * i / sampleRate))
    const rms = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length)
    // Test boundary stub: replace capture, not PitchDetector's actual algorithm.
    // The cast is required because AudioEngine has private browser-only fields.
    const engine = {
      ready: true,
      getSampleRate: () => sampleRate,
      getRmsEnergy: () => rms,
      getTimeDomainData: () => data,
    } as unknown as AudioEngine
    const detector = new PitchDetector(engine)
    const detectedHz = detector.detect(fixture.min, fixture.max)
    const centsError = detectedHz === null ? null : 1200 * Math.log2(detectedHz / fixture.hz)
    const passed = centsError !== null && Math.abs(centsError) <= 20
    results.push({
      sampleRate, ...fixture, detectedHz, centsError, passed,
      failureReason: passed ? null : detectedHz === null ? 'No pitch detected' : 'Absolute error exceeds 20 cents',
    })
  }
}
const failed = results.filter(result => !result.passed)
const report = {
  evidenceType: 'synthetic-only-not-real-device',
  library: '@kretoffer/guitar-audio-kit@0.0.2',
  invocation: 'npm run test:audio',
  stimulus: { waveform: 'sine', amplitude: 0.2, phaseRadians: 0, samples: 4096 },
  criterion: 'One-frame frequency error within ±20 cents; diagnostic threshold, not ticket acceptance',
  limitations: [
    'No real microphone, instrument, device, browser permission, or capture pipeline is exercised.',
    'Static sine input does not establish 300 ms stability, ≤10 cent variation, or ≤1000 ms UI response.',
    'Narrow ranges use known target notes and do not establish unrestricted wrong-note recognition.',
    'Calibration constants generate reference stimuli; this script does not test application target conversion.',
  ],
  passed: failed.length === 0,
  total: results.length,
  failures: failed.length,
  results,
}
const outputDirectory = new URL('../docs/verification/', import.meta.url)
mkdirSync(outputDirectory, { recursive: true })
writeFileSync(new URL('ticket-01-synthetic.json', outputDirectory), `${JSON.stringify(report, null, 2)}\n`)
console.table(results.map(({ sampleRate, note, a4, range, detectedHz, centsError, passed }) => ({
  sampleRate, note, a4, range, detectedHz, centsError: centsError?.toFixed(3) ?? null, passed,
})))
console.log(`Synthetic only: ${results.length - failed.length}/${results.length} within ±20 cents; ${failed.length} failed.`)
process.exitCode = failed.length > 0 ? 1 : 0
