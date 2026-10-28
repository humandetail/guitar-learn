const { chords, lessons } = require('../../data/content')
const audio = require('../../lib/audio')
Page({
  data: { mode: 'metronome', modes: [{ id: 'metronome', label: '节拍器' }, { id: 'chords', label: '和弦指法' }, { id: 'tuning', label: '调弦参考' }],
    bpm: 60, beats: 4, subdivision: 1, beatOptions: [2, 3, 4], subdivisions: [{ value: 1, label: '每拍 1 下' }, { value: 2, label: '每拍 2 下' }, { value: 4, label: '每拍 4 下' }],
    dots: [0, 1, 2, 3], activeBeat: -1, playing: false, error: '', chords, chordName: 'Em',
    strings: [{ string: 6, note: 'E2' }, { string: 5, note: 'A2' }, { string: 4, note: 'D3' }, { string: 3, note: 'G3' }, { string: 2, note: 'B3' }, { string: 1, note: 'E4' }], returnLesson: null },
  onShow() {
    const intent = getApp().toolIntent
    if (intent) {
      getApp().toolIntent = null
      this.setData({ mode: intent.target === 'tuner' ? 'tuning' : intent.target === 'metronome' ? 'metronome' : 'chords', bpm: intent.bpm,
        chordName: intent.chord || 'Em', returnLesson: lessons.find(item => item.id === intent.lessonId) || null })
    }
  },
  onHide() { this.stop() }, onUnload() { this.stop() },
  stop() { if (this._cancel) { const cancel = this._cancel; this._cancel = null; cancel() } },
  mode(event) { this.stop(); this.setData({ mode: event.currentTarget.dataset.mode, error: '' }) },
  tempo(event) { this.stop(); this.setData({ bpm: Number(event.detail.value) }) },
  beat(event) { this.stop(); const beats = Number(event.currentTarget.dataset.beats); this.setData({ beats, dots: Array.from({ length: beats }, (_, index) => index) }) },
  subdivision(event) { this.stop(); this.setData({ subdivision: Number(event.currentTarget.dataset.value) }) },
  play() {
    if (this.data.playing) { this.stop(); return }
    this.setData({ playing: true, error: '' })
    this._cancel = audio.play({ rhythm: { bpm: this.data.bpm, beats: this.data.beats, subdivision: this.data.subdivision },
      onIndex: index => this.setData({ activeBeat: Math.floor(index / this.data.subdivision) }),
      onEnd: () => this.setData({ playing: false, activeBeat: -1 }), onError: error => this.setData({ error }) })
  },
  chord(event) { this.stop(); this.setData({ chordName: event.currentTarget.dataset.name }) },
  listenChord() {
    const chord = chords.find(item => item.name === this.data.chordName)
    this.listen(chord.frets.flatMap((fret, index) => fret === null ? [] : [{ string: 6 - index, fret }]))
  },
  reference(event) { this.listen([{ string: Number(event.currentTarget.dataset.string), fret: 0 }]) },
  listen(notes) {
    this.stop(); this.setData({ playing: true, error: '' })
    this._cancel = audio.play({ events: [{ notes, beats: 2 }], bpm: 60,
      onEnd: () => this.setData({ playing: false }), onError: error => this.setData({ error }) })
  },
  returnToLesson() { wx.navigateTo({ url: '/pages/lesson/index?id=' + this.data.returnLesson.id }) },
})
