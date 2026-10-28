import type { TabEvent } from './exercises'

export type RepertoireLevel = 1 | 2 | 3 | 4 | 5
export type RepertoireRoute = 'foundation' | 'singing' | 'fingerstyle'
export type GradedScore = {
  id: string
  songId: string
  title: string
  subtitle: string
  level: RepertoireLevel
  route: RepertoireRoute
  summary: string
  focus: string
  tips: string[]
  prerequisites: { lessonId: string; label: string }[]
  source: { label: string; url: string }[]
  sourceNote: string
  bpm: number
  key: string
  bars: { events: TabEvent[]; chord: string }[]
  // Optional separate vocal melody for learning a singing arrangement.
  vocalBars?: TabEvent[][]
  lyrics?: { title: string; lines: string[]; note: string }
  technique: { title: string; steps: string[] }
  readiness: string[]
  legacyAccompaniment?: boolean
}

export const repertoireLevels: { level: RepertoireLevel; title: string; goal: string }[] = [
  { level: 1, title: '单音入门', goal: '看懂弦与品，跟拍弹完一首旋律。' },
  { level: 2, title: '和弦配唱', goal: '慢速切换开放和弦，唱进正确的拍子。' },
  { level: 3, title: '完整弹唱', goal: '保持伴奏节奏，从第一句唱到结尾。' },
  { level: 4, title: '旋律加低音', goal: '拇指弹低音，其他手指弹清主旋律。' },
  { level: 5, title: '完整指弹', goal: '连接旋律、低音与填充音，完成整首独奏。' },
]
