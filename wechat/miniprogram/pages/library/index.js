const { scores, levels } = require('../../data/content')
Page({
  data: { levels, level: 0, route: 'all', items: [], routes: [{ id: 'all', label: '全部路线' }, { id: 'foundation', label: '单音入门' }, { id: 'singing', label: '弹唱' }, { id: 'fingerstyle', label: '指弹' }] },
  onLoad() { this.filter() },
  filter() { this.setData({ items: scores.filter(score => (!this.data.level || score.level === this.data.level) && (this.data.route === 'all' || score.route === this.data.route)) }) },
  level(event) { this.setData({ level: Number(event.currentTarget.dataset.level) }); this.filter() },
  route(event) { this.setData({ route: event.currentTarget.dataset.route }); this.filter() },
  clear() { this.setData({ level: 0, route: 'all' }); this.filter() },
  open(event) { wx.navigateTo({ url: '/pages/score/index?id=' + encodeURIComponent(event.currentTarget.dataset.id) }) },
  onShareAppMessage() { return { title: '从单音到完整弹唱、指弹 · 六弦分级曲库', path: '/pages/library/index' } },
})
