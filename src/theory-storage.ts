import { theoryTopics } from './theory'

export const theoryStorageKey = 'guitar-learn.theory.v1'
export type TheoryProgress = { version: 1; read: string[]; passed: string[]; selfChecked: string[] }
export const freshTheoryProgress = (): TheoryProgress => ({ version: 1, read: [], passed: [], selfChecked: [] })
export function validateTheoryProgress(value: unknown): asserts value is TheoryProgress {
  if (!value || typeof value !== 'object') throw new Error('乐理进度格式无效')
  const data = value as TheoryProgress
  if (data.version !== 1) throw new Error('乐理进度版本无效')
  for (const field of ['read', 'passed', 'selfChecked'] as const) {
    if (!Array.isArray(data[field]) || new Set(data[field]).size !== data[field].length || data[field].some(id => typeof id !== 'string' || !theoryTopics.some(topic => field === 'passed' ? topic.tasks.some(task => task.id === id) : topic.id === id))) throw new Error('乐理进度内容无效')
  }
}
export function loadTheoryProgress(): TheoryProgress {
  const raw = localStorage.getItem(theoryStorageKey)
  if (raw === null) return freshTheoryProgress()
  const data: unknown = JSON.parse(raw)
  validateTheoryProgress(data)
  return data
}
export function saveTheoryProgress(data: TheoryProgress) {
  validateTheoryProgress(data)
  localStorage.setItem(theoryStorageKey, JSON.stringify(data))
}
export function theoryStatus(topicId: string, progress: TheoryProgress) {
  const topic = theoryTopics.find(item => item.id === topicId)!
  return topic.tasks.every(task => progress.passed.includes(task.id)) ? '练习通过' : progress.read.includes(topicId) ? '已阅读' : '未阅读'
}
