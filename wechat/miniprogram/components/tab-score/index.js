const { rows, columns } = require('../../lib/score')
const audio = require('../../lib/audio')
Component({
  options: { styleIsolation: 'apply-shared' },
  properties: { exercise: { type: Object, value: null, observer() { this.configure() } } },
  data: { rows: [], selected: 0, current: null, speeds: [], speedIndex: 0, bpm: 60, playing: false, error: '', labels: [1, 2, 3, 4, 5, 6] },
  lifetimes: { detached() { this._disposed = true; this.stop() } },
  pageLifetimes: { hide() { this.stop() } },
  methods: {
    configure() {
      this.stop()
      const exercise = this.data.exercise
      if (!exercise || !exercise.events || !exercise.events.length) { this.setData({ rows: [], current: null }); return }
      const speeds = Array.from(new Set([40, 50, 60, 80, exercise.bpm])).sort((a, b) => a - b)
      // Range/mode changes retain the user's speed for this mounted score.
      const bpm = this._configured ? this.data.bpm : exercise.bpm
      this._configured = true
      if (!speeds.includes(bpm)) speeds.push(bpm)
      speeds.sort((a, b) => a - b)
      this._columns = columns(exercise.events, exercise.startBar || 1)
      this.setData({ rows: rows(exercise.events, exercise.startBar || 1), selected: 0, current: this._columns[0], speeds, bpm, speedIndex: speeds.indexOf(bpm), error: '' })
    },
    choose(event) { this.stop(); this.select(Number(event.currentTarget.dataset.index)) },
    select(index) { if (this._columns && this._columns[index]) this.setData({ selected: index, current: this._columns[index] }) },
    previous() { this.stop(); this.select(this.data.selected - 1) },
    next() { this.stop(); this.select(this.data.selected + 1) },
    speed(event) { this.stop(); const index = Number(event.detail.value); this.setData({ speedIndex: index, bpm: this.data.speeds[index] }) },
    stop() {
      this._epoch = (this._epoch || 0) + 1
      if (this._cancel) { const cancel = this._cancel; this._cancel = null; cancel() }
      this._lastRow = null
      if (!this._disposed) this.setData({ playing: false })
    },
    play() {
      if (this.data.playing) { this.stop(); return }
      const epoch = this._epoch = (this._epoch || 0) + 1
      this.setData({ playing: true, error: '', selected: 0 })
      this._cancel = audio.play({ events: this.data.exercise.events, bpm: this.data.bpm,
        onIndex: index => {
          if (this._disposed || this._epoch !== epoch) return
          this.select(index)
          const row = this.data.rows.find(item => item.columns.some(column => column.index === index))
          if (row && row.id !== this._lastRow) {
            this._lastRow = row.id
            this.createSelectorQuery().select('#score-row-' + row.id).boundingClientRect(rect => {
              if (!rect || !this.data.playing || this._epoch !== epoch) return
              wx.createSelectorQuery().selectViewport().scrollOffset(viewport => {
                if (viewport && this.data.playing && this._epoch === epoch) wx.pageScrollTo({ scrollTop: Math.max(0, viewport.scrollTop + rect.top - 180), duration: 0 })
              }).exec()
            }).exec()
          }
        },
        onEnd: () => { if (!this._disposed && this._epoch === epoch) { this._lastRow = null; this.setData({ playing: false }) } },
        onError: error => { if (!this._disposed && this._epoch === epoch) this.setData({ error }) },
      })
    },
  },
})
