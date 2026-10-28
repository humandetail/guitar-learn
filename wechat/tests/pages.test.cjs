const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { lessons, scores } = require('../miniprogram/data/content')
const disk = new Map(), links = [], app = {}
global.wx = {
  getStorageSync: key => disk.get(key) || '', setStorageSync: (key, value) => disk.set(key, structuredClone(value)),
  navigateTo: options => links.push(options.url), redirectTo: options => links.push(options.url), switchTab: options => links.push(options.url),
  pageScrollTo() {}, showModal(options) { options.success({ confirm: false }) },
}
function page(name) {
  const file = path.resolve(__dirname, '../miniprogram/pages', name, 'index.js')
  let definition
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { require: createRequire(file), Page: value => { definition = value }, wx: global.wx, getApp: () => app }, { filename: file })
  const instance = { ...definition, data: structuredClone(definition.data), setData(value) { Object.assign(this.data, value) } }
  return instance
}
const event = data => ({ currentTarget: { dataset: data } })
test('all 14 lessons traverse steps, persist checklists, complete, and reopen correctly', () => {
  for (const lesson of lessons) {
    const p = page('lesson'); p.onLoad({ id: lesson.id })
    assert.equal(p.data.current.title, lesson.steps[0].title)
    for (let i = 1; i <= lesson.steps.length; i++) p.nextStep()
    assert.equal(p.data.current, null); assert.equal(p.data.completed, false)
    p.complete(); assert.equal(p.data.completed, false)
    p.check({ detail: { value: lesson.checks.map((_, index) => String(index)) } })
    p.complete(); assert.equal(p.data.completed, true)
    const reopened = page('lesson'); reopened.onLoad({ id: lesson.id })
    assert.equal(reopened.data.step, lesson.steps.length); assert.equal(reopened.data.completed, true)
    reopened.check({ detail: { value: [] } }); assert.equal(reopened.data.completed, false)
  }
  const invalid = page('lesson'); invalid.onLoad({ id: 'nonexistent' }); assert.match(invalid.data.error, /没有找到/)
})
test('learning tools pass a one-use intent and return to the same lesson step', () => {
  const p = page('lesson'); p.onLoad({ id: 'tuning' })
  const index = lessons.find(item => item.id === 'tuning').steps.findIndex(step => step.tool)
  p.setStep(index); p.tool()
  assert.equal(app.toolIntent.lessonId, 'tuning')
  const tools = page('tools'); tools.onShow()
  assert.equal(tools.data.mode, 'tuning'); assert.equal(app.toolIntent, null)
  tools.returnToLesson(); assert.equal(links.at(-1), '/pages/lesson/index?id=tuning')
  const returned = page('lesson'); returned.onLoad({ id: 'tuning' }); assert.equal(returned.data.step, index)
})
test('library filters routes and levels, provides an empty state, and clears it', () => {
  const p = page('library'); p.onLoad(); assert.equal(p.data.items.length, 12)
  p.route(event({ route: 'fingerstyle' })); assert.equal(p.data.items.length, 4)
  p.level(event({ level: 5 })); assert.equal(p.data.items.length, 2)
  p.level(event({ level: 1 })); assert.equal(p.data.items.length, 0)
  p.clear(); assert.equal(p.data.items.length, 12)
})
test('every score opens with two bars, supports full length, and keeps vocal/hand scores separate', () => {
  for (const score of scores) {
    const p = page('score'); p.onLoad({ id: score.id })
    assert.equal(p.data.exercise.events.reduce((sum, event) => sum + event.beats, 0), 8)
    p.range({ detail: { value: 0 } })
    assert.equal(p.data.exercise.events.reduce((sum, event) => sum + event.beats, 0), score.bars.length * 4)
    if (score.vocalBars) {
      p.mode(event({ mode: 'vocal' })); assert.equal(p.data.mode, 'vocal')
      assert.ok(p.data.exercise.events.some(event => event.lyric))
      assert.ok(p.data.exercise.events.every(event => event.notes.length <= 1))
      p.mode(event({ mode: 'main' })); assert.equal(p.data.mode, 'main')
    }
    assert.ok(p.onShareAppMessage().path.includes(score.id))
  }
  const p = page('score'); p.onLoad({ id: 'nonexistent' }); assert.match(p.data.error, /没有找到/)
})
