const { voices } = require('./score')

function clickData({ bpm, beats, subdivision }, rate) {
  if (!Number.isInteger(bpm) || bpm < 30 || bpm > 240 || ![2, 3, 4].includes(beats) || ![1, 2, 4].includes(subdivision)) throw new Error('节拍设置无效')
  const length = Math.round(rate * 60 / bpm * beats)
  const pcm = new Float32Array(length)
  const starts = []
  for (let step = 0; step < beats * subdivision; step++) {
    const start = Math.round(rate * 60 / bpm / subdivision * step)
    starts.push(start / rate)
    const main = step % subdivision === 0
    const hz = step === 0 ? 1200 : main ? 800 : 550
    const volume = step === 0 ? 0.18 : main ? 0.12 : 0.07
    for (let i = 0; i < Math.min(Math.round(rate * 0.03), length - start); i++) {
      const t = i / rate
      pcm[start + i] = Math.sin(2 * Math.PI * hz * t) * volume * Math.min(1, t / 0.001) * Math.max(0, 1 - t / 0.03) * Math.exp(-t * 110)
    }
  }
  return { pcm, starts, duration: length / rate }
}

function createAudio(platform, timers = { setInterval, clearInterval }) {
  let current = null, foreground = true
  function stop() { if (current) current() }
  function play({ events, bpm = 60, rhythm, onIndex = () => {}, onEnd = () => {}, onError = () => {} }) {
    stop()
    let context = null, ended = false, timer = null
    const nodes = []
    function cancel() {
      if (ended) return
      ended = true
      if (timer !== null) timers.clearInterval(timer)
      if (context) context.onstatechange = null
      nodes.forEach(node => { try { node.stop() } catch {} try { node.disconnect() } catch {} })
      if (context) { try { Promise.resolve(context.close()).catch(() => {}) } catch {} }
      if (current === cancel) current = null
      onEnd()
    }
    current = cancel
    async function start() {
      try {
        if (!foreground) throw new Error('请回到小程序后再播放。')
        if (typeof platform.createWebAudioContext !== 'function') throw new Error('当前微信不支持示范播放，请升级微信后重试；仍可照谱练习。')
        context = platform.createWebAudioContext()
        await context.resume()
        if (ended) return // Never access a closed WeChat WebAudioContext.
        if (!foreground || context.state !== 'running') throw new Error('声音没有启动，请检查音量并重试。')
        context.onstatechange = () => { if (!ended && context.state !== 'running') cancel() }
        let plan
        const begin = context.currentTime + 0.06
        if (rhythm) {
          plan = clickData(rhythm, context.sampleRate)
          const buffer = context.createBuffer(1, plan.pcm.length, context.sampleRate)
          buffer.getChannelData(0).set(plan.pcm)
          const node = context.createBufferSource()
          nodes.push(node); node.buffer = buffer; node.loop = true
          node.connect(context.destination); node.start(begin)
        } else {
          plan = voices(events, bpm)
          plan.voices.forEach(voice => {
            const node = context.createOscillator(), gain = context.createGain()
            nodes.push(node)
            node.type = 'triangle'; node.frequency.value = voice.hz
            const at = begin + voice.at, release = at + voice.duration * 0.94
            gain.gain.setValueAtTime(0, at)
            gain.gain.linearRampToValueAtTime(voice.volume, at + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.0001, release)
            node.connect(gain); gain.connect(context.destination)
            node.onended = () => { node.disconnect(); gain.disconnect() }
            node.start(at); node.stop(release + 0.01)
          })
        }
        let last = -1
        timer = timers.setInterval(() => {
          if (ended) return
          if (!foreground) { cancel(); return }
          const elapsed = context.currentTime - begin
          if (elapsed < 0) return
          if (!rhythm && elapsed >= plan.duration) { cancel(); return }
          const position = rhythm ? elapsed % plan.duration : elapsed
          let index = 0
          while (index + 1 < plan.starts.length && plan.starts[index + 1] <= position) index++
          if (index !== last) { last = index; onIndex(index) }
        }, 30)
      } catch (error) {
        if (ended) return
        cancel(); onError(error instanceof Error ? error.message : '无法播放，请重试。')
      }
    }
    void start()
    return cancel
  }
  return { play, stop, setForeground(value) { foreground = value; if (!value) stop() } }
}
let instance
function shared() { if (!instance) instance = createAudio(wx); return instance }
module.exports = {
  createAudio, clickData,
  play: options => shared().play(options),
  stop: () => { if (instance) instance.stop() },
  setForeground: value => shared().setForeground(value),
}
