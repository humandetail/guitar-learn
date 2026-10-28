const { scores } = require('../../data/content')
const audio = require('../../lib/audio')
Page({
  data: { score: null, mode: 'main', rangeIndex: 0, ranges: [], exercise: null, chordNames: [], error: '' },
  onLoad(options) {
    const score = scores.find(item => item.id === options.id)
    if (!score) { this.setData({ error: '没有找到这份曲谱，请返回曲库选择。' }); return }
    const ranges = [{ label: '全曲 · ' + score.bars.length + ' 小节', start: 0, end: score.bars.length }]
    for (let i = 0; i < score.bars.length; i += 2) ranges.push({ label: '第 ' + (i + 1) + '–' + Math.min(i + 2, score.bars.length) + ' 小节', start: i, end: Math.min(i + 2, score.bars.length) })
    this.setData({ score, ranges, rangeIndex: 1 })
    this.configure()
  },
  configure() {
    audio.stop()
    const { score, mode, ranges, rangeIndex } = this.data
    const range = ranges[rangeIndex]
    const bars = mode === 'vocal' ? score.vocalBars : score.bars.map(bar => bar.events)
    this.setData({ exercise: { id: score.id + ':' + mode + ':' + rangeIndex, title: score.title + (mode === 'vocal' ? ' · 跟唱旋律' : score.route === 'singing' ? ' · 伴奏谱' : ' · 六线谱'), description: ranges[rangeIndex].label,
      bpm: score.bpm, beatsPerBar: 4, startBar: range.start + 1, events: bars.slice(range.start, range.end).flat() },
      chordNames: Array.from(new Set(score.bars.slice(range.start, range.end).map(bar => bar.chord))) })
  },
  range(event) { this.setData({ rangeIndex: Number(event.detail.value) }); this.configure() },
  mode(event) {
    const mode = event.currentTarget.dataset.mode
    if (!['main', 'vocal'].includes(mode) || (mode === 'vocal' && !this.data.score.vocalBars)) return
    this.setData({ mode }); this.configure()
  },
  lesson(event) { wx.navigateTo({ url: '/pages/lesson/index?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  source(event) { wx.setClipboardData({ data: event.currentTarget.dataset.url }) },
  home() { wx.switchTab({ url: '/pages/library/index' }) },
  onHide() { audio.stop() }, onUnload() { audio.stop() },
  onShareAppMessage() { return { title: this.data.score ? this.data.score.title + ' · ' + this.data.score.subtitle : '六弦曲库', path: this.data.score ? '/pages/score/index?id=' + this.data.score.id : '/pages/library/index' } },
})
