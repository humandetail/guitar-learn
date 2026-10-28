const { lessons, exercises } = require('../../data/content')
const { store } = require('../../lib/progress')
const audio = require('../../lib/audio')
Page({
  data: { lesson: null, step: 0, current: null, exercise: null, checks: [], allChecked: false, completed: false, error: '', blocked: false, next: null },
  onLoad(options) {
    const lesson = lessons.find(item => item.id === options.id)
    if (!lesson) { this.setData({ error: '没有找到这节课，请返回学习目录。' }); return }
    const { progress } = store().load()
    this.lesson = lesson
    const step = progress.lessonId === lesson.id ? progress.step : 0
    this.setStep(step)
  },
  onHide() { audio.stop() }, onUnload() { audio.stop() },
  refresh() {
    const snapshot = store().load(), checked = snapshot.progress.checks[this.lesson.id] || []
    this.setData({ ...snapshot, checks: this.lesson.checks.map((text, index) => ({ text, index, value: String(index), checked: checked.includes(index) })),
      allChecked: checked.length === this.lesson.checks.length, completed: snapshot.progress.completed.includes(this.lesson.id) })
  },
  setStep(step) {
    audio.stop()
    if (!Number.isInteger(step) || step < 0 || step > this.lesson.steps.length) return
    store().update(progress => { progress.lessonId = this.lesson.id; progress.step = step })
    const current = this.lesson.steps[step] || null
    this.setData({ lesson: this.lesson, step, current, exercise: current && current.exercise ? exercises[current.exercise] : null,
      next: lessons[lessons.findIndex(item => item.id === this.lesson.id) + 1] || null })
    this.refresh(); wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },
  previous() { this.setStep(this.data.step - 1) }, nextStep() { this.setStep(this.data.step + 1) },
  check(event) {
    const values = event.detail.value.map(Number)
    store().update(progress => {
      progress.checks[this.lesson.id] = values
      if (values.length < this.lesson.checks.length) progress.completed = progress.completed.filter(id => id !== this.lesson.id)
    }); this.refresh()
  },
  complete() {
    if (!this.data.allChecked) return
    store().update(progress => { if (!progress.completed.includes(this.lesson.id)) progress.completed.push(this.lesson.id) }); this.refresh()
  },
  nextLesson() { wx.redirectTo({ url: '/pages/lesson/index?id=' + encodeURIComponent(this.data.next.id) }) },
  retry() { store().retry(); this.refresh() },
  home() { wx.switchTab({ url: '/pages/learn/index' }) },
  tool() {
    const tool = this.data.current.tool
    audio.stop()
    // switchTab cannot carry a query; a one-use local intent restores the lesson link.
    getApp().toolIntent = { target: tool.target, chord: tool.chord || '', bpm: tool.bpm || 60, lessonId: this.lesson.id }
    wx.switchTab({ url: '/pages/tools/index' })
  },
  onShareAppMessage() { return { title: this.lesson ? this.lesson.title + ' · 六弦' : '零基础学吉他', path: '/pages/lesson/index?id=' + (this.lesson ? this.lesson.id : lessons[0].id) } },
})
