const { theoryTopics, theoryStages, lessons } = require('../../data/content')
const { key, fresh, validate, status, getPending, setPending } = require('../../lib/theory-progress')
const audio = require('../../lib/audio')
Page({
  data: { groups: [], topic: null, task: null, question: 0, status: '', feedback: '', error: '', audioError: '', blocked: false, playing: false, selfChecked: false },
  onLoad(options) {
    this.visible = true
    this.from = lessons.some(item => item.id === options.from) ? options.from : ''
    this.setData({ from: this.from })
    this.progress = fresh()
    const pending = getPending()
    if (pending) { this.progress = pending.progress; this.setData({ error: pending.error, blocked: pending.blocked }) }
    else this.reload()
    if (options.id && !theoryTopics.some(item => item.id === options.id)) { this.setData({ error: '没有找到这个知识点，请从乐理目录重新选择。' }); return }
    this.select(options.id || '')
  },
  reload() {
    try {
      const raw = wx.getStorageSync(key)
      this.progress = raw === '' || raw === undefined || raw === null ? fresh() : validate(raw)
      this.setData({ error: '', blocked: false }); setPending(null)
    } catch { this.setData({ error: '乐理进度无法读取，原始数据未覆盖。仍可阅读和练习。', blocked: true }) }
  },
  board(task) {
    if (!task || task.kind !== 'fretboard') return { boardRows: [], boardFrets: [] }
    const boardFrets = Array.from({ length: Math.max(...task.options.map(option => option.fret)) + 1 }, (_, index) => index)
    return { boardFrets, boardRows: [1, 2, 3, 4, 5, 6].map(string => ({ string, cells: boardFrets.map(fret => ({ fret, option: task.options.find(option => option.string === string && option.fret === fret) || null })) })) }
  },
  refresh() {
    this.setData({ groups: theoryStages.map((title, index) => ({ title, number: index + 1, topics: theoryTopics.filter(topic => topic.stage === index + 1).map(topic => ({ id: topic.id, title: topic.title, status: status(topic, this.progress) })) })),
      status: this.data.topic ? status(this.data.topic, this.progress) : '', selfChecked: this.data.topic ? this.progress.selfChecked.includes(this.data.topic.id) : false })
  },
  save() {
    if (this.data.blocked) { setPending({ progress: this.progress, error: this.data.error, blocked: true }); this.refresh(); return }
    try { validate(this.progress); wx.setStorageSync(key, this.progress); this.setData({ error: '' }); setPending(null) }
    catch { this.setData({ error: '乐理进度未保存，当前操作仍保留，请重试保存。关闭后可能丢失。' }) }
    if (this.data.error) setPending({ progress: this.progress, error: this.data.error, blocked: this.data.blocked })
    this.refresh()
  },
  retry() { if (this.data.blocked) this.reload(); else this.save(); this.refresh() },
  select(id) {
    audio.stop()
    const topic = theoryTopics.find(item => item.id === id) || null
    this.setData({ topic, examples: topic && topic.examples ? topic.examples.map(example => ({ ...example, steps: example.events.map((event, index) => ({ index, text: '第 ' + (Math.floor(index / 4) + 1) + ' 小节第 ' + (index % 4 + 1) + ' 拍：' + event.notes.map(note => note.string + ' 弦 ' + note.fret + ' 品' + (note.role === 'bass' ? '（低音延续四拍）' : '')).join(' + ') })) })) : [], question: 0, task: topic ? topic.tasks[0] : null, feedback: '', audioError: '', playing: false })
    this.setData(this.board(this.data.task))
    this.refresh(); this.draw()
  },
  open(event) { this.select(event.currentTarget.dataset.id) },
  directory() { this.select('') },
  read() { if (!this.data.topic) return; this.progress.read = [...new Set([...this.progress.read, this.data.topic.id])]; this.save() },
  answer(event) {
    const task = this.data.task
    if (!task || !task.options.some(option => option.id === event.currentTarget.dataset.id)) return
    const correct = event.currentTarget.dataset.id === task.answer
    this.setData({ feedback: (correct ? '回答正确。' : '再想一想。') + task.explanation })
    if (correct) { this.progress.passed = [...new Set([...this.progress.passed, task.id])]; this.read() }
  },
  skip() { this.read(); this.setData({ feedback: '已跳过，可稍后重试。' + this.data.task.explanation }) },
  retryAnswer() { this.setData({ feedback: '' }) },
  question(index) {
    if (!this.data.topic || index < 0 || index >= this.data.topic.tasks.length) return
    audio.stop(); this.setData({ question: index, task: this.data.topic.tasks[index], feedback: '', audioError: '', playing: false }); this.setData(this.board(this.data.task)); this.draw()
  },
  previous() { this.question(this.data.question - 1) }, next() { this.question(this.data.question + 1) },
  selfCheck(event) {
    const id = this.data.topic.id
    this.progress.selfChecked = event.detail.value.length ? [...new Set([...this.progress.selfChecked, id])] : this.progress.selfChecked.filter(value => value !== id)
    this.save()
  },
  playExample(event) {
    const example = this.data.topic.examples.find(item => item.id === event.currentTarget.dataset.id)
    if (example) this.startAudio(example.events)
  },
  stopAudio() { audio.stop(); this.setData({ playing: false }) },
  play() {
    if (this.data.playing) { audio.stop(); this.setData({ playing: false }); return }
    if (!this.data.task || !this.data.task.events) return
    this.startAudio(this.data.task.events)
  },
  startAudio(events) {
    audio.stop()
    this.setData({ playing: true, audioError: '' })
    audio.play({ events, bpm: 60, onEnd: () => this.setData({ playing: false }), onError: error => this.setData({ audioError: error, playing: false }) })
  },
  onReady() { this.draw() },
  onShow() { this.visible = true; this.draw() },
  staffTap(event) {
    const task = this.data.task, touch = event.changedTouches && event.changedTouches[0]
    if (!task || task.kind !== 'staff' || !touch) return
    wx.createSelectorQuery().in(this).select('#theoryStaff').boundingClientRect(rect => {
      if (!this.visible || this.data.task !== task || !rect || !rect.width) return
      const x = (touch.clientX - rect.left) * 300 / rect.width, y = touch.clientY - rect.top
      const option = task.options.find((item, index) => Math.abs(x - (85 + index * 70)) <= 24 && Math.abs(y - (114 - item.staffStep * 8)) <= 24)
      if (option) this.answer({ currentTarget: { dataset: { id: option.id } } })
    }).exec()
  },
  draw() {
    const task = this.data.task
    if (!this.visible || !task || task.kind !== 'staff' || !wx.createCanvasContext) return
    wx.nextTick(() => {
      if (!this.visible || this.data.task !== task) return
      wx.createSelectorQuery().in(this).select('#theoryStaff').boundingClientRect(rect => {
        if (!this.visible || this.data.task !== task || !rect || !rect.width) return
        const ctx = wx.createCanvasContext('theoryStaff', this)
        ctx.scale(rect.width / 300, 1)
        ctx.setStrokeStyle('#65748c'); ctx.setLineWidth(1)
        for (const y of [50, 66, 82, 98, 114]) { ctx.moveTo(8, y); ctx.lineTo(292, y) }
        ctx.stroke(); ctx.setFillStyle('#24334e'); ctx.setFontSize(52); ctx.fillText('𝄞', 8, 105)
        task.options.forEach((option, index) => {
          const x = 85 + index * 70, y = 114 - option.staffStep * 8
          if (option.staffStep < 0) { ctx.beginPath(); ctx.moveTo(x - 17, 130); ctx.lineTo(x + 17, 130); ctx.stroke() }
          ctx.beginPath(); ctx.setFillStyle('#254dff'); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.moveTo(x + 7, y); ctx.lineTo(x + 7, y - 30); ctx.stroke()
          ctx.setFontSize(13); ctx.fillText(String.fromCharCode(65 + index), x - 4, 164)
        }); ctx.draw()
      }).exec()
    })
  },
  back() {
    audio.stop()
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const previous = pages[pages.length - 2]
    if (this.from && previous && previous.route === 'pages/lesson/index' && previous.options.id === this.from) wx.navigateBack({ delta: 1 })
    else if (this.from) wx.redirectTo({ url: '/pages/lesson/index?id=' + encodeURIComponent(this.from) })
    else wx.switchTab({ url: '/pages/learn/index' })
  },
  onHide() { this.visible = false; audio.stop(); this.setData({ playing: false }) }, onUnload() { this.visible = false; audio.stop() },
})
