const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { lessons, scores } = require('../miniprogram/data/content')
const disk = new Map(), links = [], app = {}, stack = []
global.wx = {
  getStorageSync: key => disk.get(key) || '', setStorageSync: (key, value) => disk.set(key, structuredClone(value)),
  navigateTo: options => links.push(options.url), redirectTo: options => links.push(options.url), switchTab: options => links.push(options.url),
  navigateBack() { stack.pop(); links.push('back') },
  pageScrollTo() {}, showModal(options) { options.success({ confirm: false }) },
}
function page(name) {
  const file = path.resolve(__dirname, '../miniprogram/pages', name, 'index.js')
  let definition
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { require: createRequire(file), Page: value => { definition = value }, getCurrentPages: () => stack, wx: global.wx, getApp: () => app }, { filename: file })
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
test('theory links from lessons, explains answers, persists progress and returns to original step', () => {
  const lesson = page('lesson'); lesson.onLoad({ id: 'tuning' }); lesson.setStep(1)
  lesson.theory(event({ id: 'note-names' }))
  assert.match(links.at(-1), /pages\/theory\/index\?id=note-names/)
  const p = page('theory'); p.onLoad({ id: 'note-names', from: 'tuning', step: '1' })
  p.read(); p.answer(event({ id: 'a' })); assert.match(p.data.feedback, /再想一想/)
  p.skip(); assert.equal(p.data.status, '已阅读')
  p.answer(event({ id: 'e' })); assert.equal(p.data.status, '练习通过')
  const reopened = page('theory'); reopened.onLoad({ id: 'note-names' })
  assert.equal(reopened.data.status, '练习通过')
  p.back(); assert.match(links.at(-1), /lesson\/index\?id=tuning/)
  const returned = page('lesson'); returned.onLoad({ id: 'tuning' }); assert.equal(returned.data.step, 1)
})
test('theory tasks across three stages complete, self-check stays separate and unknown links are safe', () => {
  const cases = [
    ['fretboard', ['f', '0']], ['rhythm-theory', ['1', '0']], ['scale-intervals', ['0', '0', 'c']],
    ['triads', ['0', '0']], ['staff', ['e', '0', '0']], ['transpose', ['0', '0', '0']],
    ['progressions', ['0', '0']], ['sevenths', ['0', '0']], ['inversions', ['0', 'e2']],
    ['harmony', ['0', '0', '0']], ['arranging', ['0', '0']],
  ]
  for (const [id, answers] of cases) {
    const p = page('theory'); p.onLoad({ id })
    if (id === 'arranging') {
      assert.equal(p.data.examples.length, 3)
      assert.match(p.data.examples[1].steps[0].text, /5 弦 3 品/)
      p.selfCheck({ detail: { value: ['checked'] } }); assert.notEqual(p.data.status, '练习通过')
    }
    answers.forEach((answer, index) => { p.question(index); p.answer(event({ id: answer })); assert.match(p.data.feedback, /回答正确/) })
    assert.equal(p.data.status, '练习通过', id)
    const reopened = page('theory'); reopened.onLoad({ id }); assert.equal(reopened.data.status, '练习通过')
  }
  const invalid = page('theory'); invalid.onLoad({ id: 'unknown' }); assert.match(invalid.data.error, /没有找到/)
})
test('theory failed saves retry and corrupt data is preserved while reading remains available', () => {
  const key = 'guitar-learn.wechat.theory.v1', original = wx.setStorageSync
  disk.delete(key)
  const p = page('theory'); p.onLoad({ id: 'note-names' })
  wx.setStorageSync = () => { throw new Error('full') }
  try { p.answer(event({ id: 'e' })); assert.match(p.data.error, /未保存/) }
  finally { wx.setStorageSync = original }
  const pending = page('theory'); pending.onLoad({ id: 'note-names' }); assert.match(pending.data.error, /未保存/); assert.equal(pending.data.status, '练习通过')
  pending.retry(); assert.equal(pending.data.error, '')
  const saved = page('theory'); saved.onLoad({ id: 'note-names' }); assert.equal(saved.data.status, '练习通过')
  disk.set(key, '{broken-theory')
  const corrupt = page('theory'); corrupt.onLoad({ id: 'note-names' }); corrupt.read(); corrupt.answer(event({ id: 'e' }))
  assert.match(corrupt.data.error, /原始数据未覆盖/); assert.equal(disk.get(key), '{broken-theory')
  disk.delete(key); corrupt.retry()
  assert.equal(corrupt.data.blocked, false)
  const recovered = page('theory'); recovered.onLoad({ id: 'note-names' })
  assert.equal(recovered.data.blocked, false); assert.equal(recovered.data.error, '')
  recovered.answer(event({ id: 'e' })); assert.equal(recovered.data.status, '练习通过')
})
test('staff canvas hit testing follows scaled note positions and ignores late callbacks', () => {
  const p = page('theory'); p.onLoad({ id: 'staff' })
  let callback
  wx.createSelectorQuery = () => ({ in() { return this }, select() { return this }, boundingClientRect(fn) { callback = fn; return this }, exec() { callback({ left: 10, top: 20, width: 240 }) } })
  try {
    p.staffTap({ changedTouches: [{ clientX: 10 + 155 * .8, clientY: 20 + 114 }] })
    assert.match(p.data.feedback, /回答正确/)
    p.retryAnswer(); p.onHide()
    p.staffTap({ changedTouches: [{ clientX: 10 + 155 * .8, clientY: 20 + 114 }] })
    assert.equal(p.data.feedback, '')
  } finally { delete wx.createSelectorQuery }
})

test('returning from theory reuses the original lesson without growing the page stack', () => {
  for (let index = 0; index < 12; index++) {
    stack.length = 0; stack.push({ route: 'pages/learn/index', options: {} }, { route: 'pages/lesson/index', options: { id: 'tuning' } }, { route: 'pages/theory/index', options: { id: 'note-names' } })
    const p = page('theory'); p.onLoad({ id: 'note-names', from: 'tuning' }); p.back()
    assert.equal(links.at(-1), 'back'); assert.equal(stack.length, 2)
  }
  stack.length = 0
})
