const { lessons } = require('../../data/content')
const { store } = require('../../lib/progress')
Page({
  data: { groups: [], current: null, count: 0, error: '', blocked: false },
  onShow() { this.refresh() },
  refresh() {
    const snapshot = store().load(), progress = snapshot.progress
    const groups = []
    lessons.forEach((lesson, index) => {
      let group = groups.find(item => item.title === lesson.section)
      if (!group) { group = { title: lesson.section, lessons: [] }; groups.push(group) }
      group.lessons.push({ id: lesson.id, title: lesson.title, summary: lesson.summary, duration: lesson.duration, number: index + 1, complete: progress.completed.includes(lesson.id) })
    })
    this.setData({ ...snapshot, groups, current: lessons.find(item => item.id === progress.lessonId), count: progress.completed.length })
  },
  open(event) { wx.navigateTo({ url: '/pages/lesson/index?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  resume() { wx.navigateTo({ url: '/pages/lesson/index?id=' + encodeURIComponent(this.data.current.id) }) },
  retry() { store().retry(); this.refresh() },
  reset() {
    wx.showModal({ title: '重新开始学习？', content: '只重置这个小程序里的学习进度，不影响网页版。此操作无法撤销。', success: result => {
      if (result.confirm) { store().reset(); this.refresh() }
    } })
  },
  onShareAppMessage() { return { title: '从认琴到弹唱、指弹 · 六弦', path: '/pages/learn/index' } },
})
