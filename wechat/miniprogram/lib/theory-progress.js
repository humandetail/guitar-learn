const { theoryTopics } = require('../data/content')
const key = 'guitar-learn.wechat.theory.v1'
const fresh = () => ({ version: 1, read: [], passed: [], selfChecked: [] })
function validate(data) {
  if (!data || data.version !== 1) throw new Error('乐理进度格式无效')
  for (const field of ['read', 'passed', 'selfChecked']) {
    if (!Array.isArray(data[field]) || new Set(data[field]).size !== data[field].length || data[field].some(id => typeof id !== 'string' || !theoryTopics.some(topic => field === 'passed' ? topic.tasks.some(task => task.id === id) : topic.id === id))) throw new Error('乐理进度内容无效')
  }
  return data
}
function status(topic, progress) {
  return topic.tasks.every(task => progress.passed.includes(task.id)) ? '练习通过' : progress.read.includes(topic.id) ? '已阅读' : '未阅读'
}
let pending = null
module.exports = { key, fresh, validate, status, getPending: () => pending, setPending(value) { pending = value ? JSON.parse(JSON.stringify(value)) : null } }
