import { lessons } from './lessons'
import { isObject } from './model'

export const learningStorageKey = 'guitar-learn.learning.v1'
export type LearningProgress = {
  version: 1
  view: 'overview' | 'lesson' | 'complete'
  lessonId: string
  step: number
  completed: string[]
  checks: Record<string, number[]>
}
export function freshLearningProgress(): LearningProgress {
  return { version: 1, view: 'overview', lessonId: lessons[0].id, step: 0, completed: [], checks: {} }
}
export function validateLearningProgress(value: unknown): asserts value is LearningProgress {
  if (!isObject(value) || value.version !== 1 || !['overview', 'lesson', 'complete'].includes(String(value.view))) throw new Error('学习进度格式无效')
  const lesson = lessons.find(item => item.id === value.lessonId)
  if (!lesson || !Number.isInteger(value.step) || Number(value.step) < 0 || Number(value.step) > lesson.steps.length) throw new Error('学习位置无效')
  if (!Array.isArray(value.completed) || value.completed.some(id => typeof id !== 'string' || !lessons.some(item => item.id === id)) || new Set(value.completed).size !== value.completed.length) throw new Error('已完成课程资料无效')
  if (!isObject(value.checks)) throw new Error('自查资料无效')
  for (const [id, checks] of Object.entries(value.checks)) {
    const target = lessons.find(item => item.id === id)
    if (!target || !Array.isArray(checks) || checks.some(index => !Number.isInteger(index) || index < 0 || index >= target.checks.length) || new Set(checks).size !== checks.length) throw new Error('自查资料无效')
  }
  if (value.view === 'complete' && (!value.completed.includes(lesson.id) || value.step !== lesson.steps.length)) throw new Error('课程完成状态无效')
}
export function loadLearningProgress(): LearningProgress {
  const raw = localStorage.getItem(learningStorageKey)
  if (raw === null) return freshLearningProgress()
  const value: unknown = JSON.parse(raw)
  validateLearningProgress(value)
  return value
}
export function saveLearningProgress(value: LearningProgress) {
  validateLearningProgress(value)
  localStorage.setItem(learningStorageKey, JSON.stringify(value))
}
