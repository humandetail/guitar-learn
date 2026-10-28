export type LessonTool = {
  label: string
  target: 'tuner' | 'chords' | 'practice' | 'metronome'
  chord?: 'Em' | 'Am'
  bpm?: number
}

export type LessonStep = {
  title: string
  body: string[]
  diagram?: 'anatomy' | 'notation' | 'rhythm-values' | 'strings' | 'frets' | 'em' | 'am' | 'beats'
  tool?: LessonTool
  exercise?: string
}

export type Lesson = {
  id: string
  title: string
  summary: string
  duration: string
  goal: string
  section: '认识与准备' | '识谱与基本功' | '和弦与伴奏' | '弹唱与独奏'
  steps: LessonStep[]
  checks: string[]
}
