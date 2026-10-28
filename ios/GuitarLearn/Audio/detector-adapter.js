// No browser objects or audio algorithm here. AVAudioEngine supplies mono PCM.
// Keep the target-local range and 300 ms / 10-cent rule aligned with src/audio.ts.
globalThis.createGuitarDetector = function (sampleRate) {
  const target = 440 * 2 ** ((40 - 69) / 12)
  let pcm = new Float32Array(4096)
  let rms = 0
  let samples = []
  const engine = {
    ready: true,
    getSampleRate: () => sampleRate,
    getTimeDomainData: () => pcm,
    getRmsEnergy: () => rms,
  }
  const detector = new PitchDetector(engine)
  function reset() { samples = []; detector.reset() }
  function analyze(values, time) {
    if (values.length !== 4096 || !Number.isFinite(time) || !values.every(Number.isFinite)) {
      reset()
      throw new Error('Expected 4096 finite PCM samples and a monotonic timestamp')
    }
    pcm = Float32Array.from(values)
    rms = Math.sqrt(pcm.reduce((sum, value) => sum + value * value, 0) / pcm.length)
    const frequency = detector.detect(target * 2 ** (-5 / 12), target * 2 ** (5 / 12))
    const empty = { rms, frequency: null, rawFrequency: frequency }
    if (frequency === null) { samples = []; return empty }
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
    const previous = samples[samples.length - 1]
    if (previous && (midi !== previous.midi || time - previous.time > 0.100001 || time <= previous.time)) samples = []
    samples.push({ time, frequency, midi })
    while (samples.length > 1 && samples[1].time <= time - 0.3) samples.shift()
    const min = Math.min(...samples.map(sample => sample.frequency))
    const max = Math.max(...samples.map(sample => sample.frequency))
    if (1200 * Math.log2(max / min) > 10) {
      samples = [samples[samples.length - 1]]
      return empty
    }
    if (time - samples[0].time < 0.3 - 1e-9) return empty
    const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
    return { rms, rawFrequency: frequency, frequency, cents: 1200 * Math.log2(frequency / target), note: notes[(midi % 12 + 12) % 12] + (Math.floor(midi / 12) - 1) }
  }
  return { analyze, reset }
}
