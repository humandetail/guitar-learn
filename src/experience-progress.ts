const key = 'guitar-learn.experience.v1'
export const challengeNames = { basics: '第一关 · 空弦与品位', rhythm: '第二关 · 跟拍扫弦', melody: '第三关 · 小星星' }
export type ChallengeId = keyof typeof challengeNames

export function readExperienceProgress(): ChallengeId[] {
  const raw = localStorage.getItem(key)
  if (raw === null) return []
  const progress = JSON.parse(raw)
  if (progress?.version !== 1 || !Array.isArray(progress.passed) || progress.passed.some((id: unknown) => typeof id !== 'string' || !Object.hasOwn(challengeNames, id))) throw new Error('体验馆进度格式无效')
  return [...new Set<ChallengeId>(progress.passed)]
}

export function saveExperienceProgress(passed: ChallengeId[]) {
  const merged = [...new Set([...readExperienceProgress(), ...passed])]
  localStorage.setItem(key, JSON.stringify({ version: 1, passed: merged }))
  return merged
}
