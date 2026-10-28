const { lessons } = require('../data/content')
const key = 'guitar-learn.wechat.learning.v1'
const fresh = () => ({ version: 1, lessonId: lessons[0].id, step: 0, completed: [], checks: {} })
const clone = value => JSON.parse(JSON.stringify(value))
function validate(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.completed) || !value.checks || typeof value.checks !== 'object' || Array.isArray(value.checks)) throw new Error('进度格式无效')
  const lesson = lessons.find(item => item.id === value.lessonId)
  if (!lesson || !Number.isInteger(value.step) || value.step < 0 || value.step > lesson.steps.length) throw new Error('学习位置无效')
  if (new Set(value.completed).size !== value.completed.length || value.completed.some(id => !lessons.some(item => item.id === id))) throw new Error('完成记录无效')
  Object.keys(value.checks).forEach(id => {
    const target = lessons.find(item => item.id === id)
    const checks = value.checks[id]
    if (!target || !Array.isArray(checks) || new Set(checks).size !== checks.length || checks.some(index => !Number.isInteger(index) || index < 0 || index >= target.checks.length)) throw new Error('自查记录无效')
  })
  if (value.completed.some(id => (value.checks[id] || []).length !== lessons.find(item => item.id === id).checks.length)) throw new Error('完成记录缺少自查')
  return value
}
function createStore(platform) {
  let state, error = '', blocked = false, dirty = false
  function snapshot() { return { progress: clone(state), error, blocked, dirty } }
  function load() {
    if (state) return snapshot()
    try {
      const raw = platform.getStorageSync(key)
      state = raw === '' || raw === undefined || raw === null ? fresh() : validate(raw)
    } catch {
      state = fresh(); blocked = true; error = '无法读取已有进度。原记录未覆盖，请重试读取，或确认后重新开始。'
    }
    return snapshot()
  }
  function save() {
    if (blocked) return snapshot()
    try { platform.setStorageSync(key, clone(state)); error = ''; dirty = false }
    catch { error = '进度未能保存，当前操作仍保留。请重试保存，暂不要关闭微信。'; dirty = true }
    return snapshot()
  }
  return {
    load,
    update(change) {
      load()
      if (blocked) return snapshot()
      const next = clone(state); change(next); validate(next); state = next
      return save()
    },
    retry() { if (blocked) { state = null; blocked = false; error = ''; return load() } return save() },
    reset() {
      // Called only after an explicit confirmation in the UI.
      const previous = state
      try { const next = fresh(); platform.setStorageSync(key, next); state = next; error = ''; dirty = false; blocked = false }
      catch { state = previous || fresh(); error = '重置失败，原记录未删除，请重试。' }
      return snapshot()
    },
  }
}
let singleton
function store() { if (!singleton) singleton = createStore(wx); return singleton }
module.exports = { createStore, store, validate, key }
