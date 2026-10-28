const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createAudio } = require('../miniprogram/lib/audio')
const events = [{ notes: [{ string: 1, fret: 0 }], beats: 1 }, { notes: [{ string: 2, fret: 0 }], beats: 1 }]
const settle = () => new Promise(resolve => setImmediate(resolve))
function harness(deferred = false) {
  const contexts = [], ticks = new Set()
  const platform = { createWebAudioContext() {
    const ctx = { currentTime: 0, sampleRate: 48000, destination: {}, closed: false, started: [], stopped: [], resumes: null,
      get state() { if (this.closed) throw Error('Read closed context'); return 'running' },
      resume() { return deferred ? new Promise(resolve => { this.resumes = resolve }) : Promise.resolve() },
      close() { this.closed = true; return Promise.resolve() },
      createOscillator() { return { type: '', frequency: {}, connect() {}, disconnect() {}, start(at) { ctx.started.push(at) }, stop(at) { ctx.stopped.push(at) } } },
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} } },
      createBuffer(channels, length) { const pcm = new Float32Array(length); return { getChannelData: () => pcm } },
      createBufferSource() { const node = this.createOscillator(); this.loopNode = node; return node },
    }; contexts.push(ctx); return ctx
  } }
  const audio = createAudio(platform, { setInterval(callback) { ticks.add(callback); return callback }, clearInterval(callback) { ticks.delete(callback) } })
  return { audio, contexts, ticks, tick() { for (const tick of ticks) tick() } }
}
test('cancel before resume never schedules notes or reads a closed context', async () => {
  const h = harness(true); let end = 0
  const cancel = h.audio.play({ events, onEnd() { end++ } })
  cancel(); h.contexts[0].resumes(); await settle()
  assert.equal(h.contexts[0].started.length, 0); assert.equal(h.contexts[0].closed, true); assert.equal(end, 1)
  assert.equal(h.ticks.size, 0)
})
test('new playback owns audio; highlights follow context time and end at range boundary', async () => {
  const h = harness(), positions = []
  h.audio.play({ events }); await settle()
  h.audio.play({ events, onIndex: index => positions.push(index) }); await settle()
  assert.equal(h.contexts[0].closed, true)
  const ctx = h.contexts[1]
  assert.deepEqual(ctx.started, [0.06, 1.06])
  ctx.currentTime = 0.7; h.tick(); ctx.currentTime = 1.3; h.tick()
  assert.deepEqual(positions, [0, 1])
  ctx.currentTime = 2.1; h.tick(); assert.equal(ctx.closed, true); assert.equal(h.ticks.size, 0)
})
test('background cancels pending and active playback; return is silent', async () => {
  const h = harness(true)
  h.audio.play({ events }); h.audio.setForeground(false); h.contexts[0].resumes(); await settle()
  assert.equal(h.contexts[0].started.length, 0)
  h.audio.setForeground(true); assert.equal(h.contexts.length, 1)
  const live = harness()
  live.audio.play({ events }); await settle(); live.audio.setForeground(false)
  assert.equal(live.contexts[0].closed, true); assert.equal(live.ticks.size, 0)
})
test('metronome loops PCM on audio clock; interruption releases it', async () => {
  const h = harness(), positions = []
  h.audio.play({ rhythm: { bpm: 60, beats: 3, subdivision: 2 }, onIndex: index => positions.push(index) }); await settle()
  const ctx = h.contexts[0]
  assert.equal(ctx.loopNode.loop, true)
  ctx.currentTime = 1.1; h.tick(); ctx.currentTime = 3.1; h.tick()
  assert.deepEqual(positions, [2, 0])
  Object.defineProperty(ctx, 'state', { value: 'suspended' }); ctx.onstatechange()
  assert.equal(ctx.closed, true); assert.equal(h.ticks.size, 0)
})
test('unsupported playback returns an actionable error without a running session', async () => {
  const audio = createAudio({}); let message = '', ended = 0
  audio.play({ events, onError: error => { message = error }, onEnd: () => { ended++ } }); await settle()
  assert.match(message, /升级微信/); assert.equal(ended, 1)
})
