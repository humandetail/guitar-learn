import { test, expect, type Page } from '@playwright/test'
import { gradedRepertoire } from '../src/graded-repertoire'
import type { TabEvent, TabNote } from '../src/exercises'
import { lessons } from '../src/lessons'
import { builtinChords } from '../src/chords'
import { openMidi } from '../src/model'
import type { GradedScore } from '../src/repertoire-types'

const range = (page: Page) => page.getByRole('combobox', { name: '练习范围', exact: true })
const play = (page: Page) => page.getByRole('button', { name: '播放合成示范', exact: true })
const stop = (page: Page) => page.getByRole('button', { name: '停止示范', exact: true })
const midi = (note: TabNote) => openMidi[6 - note.string] + note.fret
const eventsOf = (score: GradedScore) => score.bars.flatMap(bar => bar.events)
const onsets = (events: TabEvent[]) => {
  let beat = 0
  return events.map(event => { const onset = beat; beat += event.beats; return { event, onset } })
}

function assertCompleteBars(bars: TabEvent[][], title: string) {
  expect(bars.length, title).toBeGreaterThanOrEqual(8)
  for (const [index, bar] of bars.entries()) {
    expect(bar.reduce((sum, event) => sum + event.beats, 0), `${title} 第 ${index + 1} 小节`).toBe(4)
    for (const event of bar) {
      expect([0.5, 1, 1.5, 2, 3, 4]).toContain(event.beats)
      expect(new Set(event.notes.map(note => note.string)).size, `${title} 同一列不能重复同一根弦`).toBe(event.notes.length)
      for (const note of event.notes) {
        expect(Number.isInteger(note.string)).toBe(true)
        expect(note.string).toBeGreaterThanOrEqual(1)
        expect(note.string).toBeLessThanOrEqual(6)
        expect(Number.isInteger(note.fret)).toBe(true)
        expect(note.fret).toBeGreaterThanOrEqual(0)
        expect(note.fret).toBeLessThanOrEqual(5)
        if (note.finger !== undefined) expect([1, 2, 3, 4]).toContain(note.finger)
        if (note.sustainBeats !== undefined) expect(note.sustainBeats).toBeGreaterThan(0)
      }
    }
  }
}

function assertPlayableSustain(score: GradedScore) {
  const events = eventsOf(score)
  const timeline = onsets(events)
  const total = events.reduce((sum, event) => sum + event.beats, 0)
  const attacks = timeline.flatMap(({ event, onset }) => event.notes.map(note => ({ ...note, onset, end: onset + (note.sustainBeats ?? event.beats) })))
  for (const note of attacks) {
    expect(note.end, `${score.id} 弦 ${note.string} 不能延出全曲`).toBeLessThanOrEqual(total)
    const next = attacks.find(other => other.string === note.string && other.onset > note.onset)
    if (next) expect(note.end, `${score.id} 弦 ${note.string} 在 ${note.onset} 拍的延音跨过下一次拨弦`).toBeLessThanOrEqual(next.onset)
  }
  for (const { onset } of timeline) {
    const held = attacks.filter(note => note.onset <= onset && note.end > onset && note.fret > 0)
    if (!held.length) continue
    const frets = held.map(note => note.fret)
    expect(Math.max(...frets) - Math.min(...frets), `${score.id} 第 ${onset} 拍跨度`).toBeLessThanOrEqual(4)
    for (const finger of [1, 2, 3, 4]) {
      const fingerFrets = held.filter(note => note.finger === finger).map(note => note.fret)
      expect(new Set(fingerFrets).size, `${score.id} 第 ${onset} 拍同一手指按住不同品位`).toBeLessThanOrEqual(1)
      if (score.route === 'fingerstyle') expect(fingerFrets.length, `${score.id} 未教横按，不让同一手指同时按住两根弦`).toBeLessThanOrEqual(1)
    }
  }
}

test('分级曲库覆盖五级、两条路线和完整小节，前置课程与和弦可查', () => {
  expect(gradedRepertoire).toHaveLength(12)
  expect(new Set(gradedRepertoire.map(score => score.id)).size).toBe(12)
  expect(new Set(gradedRepertoire.map(score => score.songId)).size).toBe(4)
  expect([...new Set(gradedRepertoire.map(score => score.level))].sort()).toEqual([1, 2, 3, 4, 5])
  expect(gradedRepertoire.filter(score => score.route === 'singing')).toHaveLength(4)
  expect(gradedRepertoire.filter(score => score.route === 'fingerstyle')).toHaveLength(4)
  for (const score of gradedRepertoire) {
    assertCompleteBars(score.bars.map(bar => bar.events), score.id)
    for (const bar of score.bars) expect(builtinChords.some(chord => chord.name === bar.chord), `${score.id} 的 ${bar.chord} 指法`).toBe(true)
    for (const prerequisite of score.prerequisites) expect(lessons.some(lesson => lesson.id === prerequisite.lessonId), `${score.id} 前置课`).toBe(true)
    expect(score.readiness.length).toBeGreaterThanOrEqual(2)
    expect(score.technique.steps.length).toBeGreaterThanOrEqual(2)
    expect(score.source.length).toBeGreaterThan(0)
    for (const source of score.source) expect(new URL(source.url).protocol).toBe('https:')
    assertPlayableSustain(score)
  }
})

test('欢乐颂保留完整十六小节主题、附点节奏与低音 D', () => {
  const score = gradedRepertoire.find(item => item.id === 'ode-to-joy')!
  // Carnegie Hall published score, transposed to G; the tied B at bars 12–13
  // is intentionally rearticulated in this project's section-practice edition.
  const expected: [number, number][][] = [
    [[59, 1], [59, 1], [60, 1], [62, 1]],
    [[62, 1], [60, 1], [59, 1], [57, 1]],
    [[55, 1], [55, 1], [57, 1], [59, 1]],
    [[59, 1.5], [57, 0.5], [57, 2]],
    [[59, 1], [59, 1], [60, 1], [62, 1]],
    [[62, 1], [60, 1], [59, 1], [57, 1]],
    [[55, 1], [55, 1], [57, 1], [59, 1]],
    [[57, 1.5], [55, 0.5], [55, 2]],
    [[57, 1], [57, 1], [59, 1], [55, 1]],
    [[57, 1], [59, 0.5], [60, 0.5], [59, 1], [55, 1]],
    [[57, 1], [59, 0.5], [60, 0.5], [59, 1], [57, 1]],
    [[55, 1], [57, 1], [50, 1], [59, 1]],
    [[59, 1], [59, 1], [60, 1], [62, 1]],
    [[62, 1], [60, 1], [59, 1], [57, 1]],
    [[55, 1], [55, 1], [57, 1], [59, 1]],
    [[57, 1.5], [55, 0.5], [55, 2]],
  ]
  expect(score.bars.map(bar => bar.events.map(event => [midi(event.notes[0]), event.beats]))).toEqual(expected)
})

test('指弹编配保留整首主旋律与进入时间，低音和填充音不是和弦扫弦的改名', () => {
  for (const score of gradedRepertoire.filter(item => item.route === 'fingerstyle')) {
    const base = gradedRepertoire.find(item => item.songId === score.songId && item.route === 'foundation')!
    expect(base, score.id).toBeTruthy()
    const melody = onsets(eventsOf(score)).flatMap(({ event, onset }) => event.notes.filter(note => note.role === 'melody').map(note => ({ midi: midi(note), onset, duration: note.sustainBeats ?? event.beats })))
    const expected = onsets(eventsOf(base)).flatMap(({ event, onset }) => event.notes.map(note => ({ midi: midi(note), onset, duration: event.beats })))
    expect(melody, score.id).toEqual(expected)
    expect(score.bars).toHaveLength(base.bars.length)
    const notes = eventsOf(score).flatMap(event => event.notes)
    expect(notes.some(note => note.role === 'bass' && note.string >= 4), score.id).toBe(true)
    expect(eventsOf(score).some(event => event.notes.some(note => note.role === 'melody') && event.notes.some(note => note.role === 'bass')), score.id).toBe(true)
    if (score.level === 5) {
      expect(notes.some(note => note.role === 'fill'), score.id).toBe(true)
      expect(eventsOf(score).some(event => event.beats === 0.5), score.id).toBe(true)
      expect(eventsOf(score).some(event => event.notes.some(note => (note.sustainBeats ?? 0) > event.beats)), score.id).toBe(true)
    }
  }
})

test('每份弹唱谱都有整首伴奏、逐音跟唱和完整歌句', () => {
  for (const score of gradedRepertoire.filter(item => item.route === 'singing')) {
    expect(score.vocalBars, score.id).toBeDefined()
    assertCompleteBars(score.vocalBars!, `${score.id} 人声旋律`)
    expect(score.vocalBars).toHaveLength(score.bars.length)
    expect(score.lyrics?.lines.length).toBeGreaterThanOrEqual(4)
    expect(score.lyrics?.note).toBeTruthy()
    for (const event of score.vocalBars!.flat()) {
      if (event.notes.length) {
        expect(event.notes, score.id).toHaveLength(1)
        expect(event.lyric, `${score.id} 跟唱音缺少音节`).toBeTruthy()
      }
    }
  }
})

// Observe real Web Audio scheduling, including each oscillator's planned stop.
type Voice = { frequency: number; start: number; stops: number[] }
type AudioAudit = { contexts: AudioContext[]; voices: Voice[] }
declare global { interface Window { gradedAudio: AudioAudit } }
async function auditAudio(page: Page) {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext
    const audit: AudioAudit = { contexts: [], voices: [] }
    window.gradedAudio = audit
    class ObservedAudioContext extends NativeAudioContext {
      constructor(options?: AudioContextOptions) { super(options); audit.contexts.push(this) }
      override createOscillator(): OscillatorNode {
        const node = super.createOscillator()
        const nativeStart = node.start.bind(node)
        const nativeStop = node.stop.bind(node)
        const voice: Voice = { frequency: 0, start: 0, stops: [] }
        node.start = (when = 0) => { voice.frequency = node.frequency.value; voice.start = when; audit.voices.push(voice); nativeStart(when) }
        node.stop = (when = 0) => { voice.stops.push(when); nativeStop(when) }
        return node
      }
    }
    window.AudioContext = ObservedAudioContext
  })
}
async function openLibrary(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /^分级曲库/ }).click()
  await expect(page.getByRole('heading', { name: '分级曲库', exact: true })).toBeVisible()
}

const scoreButtonName = (score: GradedScore) => score.legacyAccompaniment ? `练习${score.title}` : `练习${score.title}·${score.subtitle}`
async function openScore(page: Page, score: GradedScore) {
  await openLibrary(page)
  await page.getByRole('button', { name: scoreButtonName(score), exact: true }).click()
  await expect(page.getByRole('heading', { name: score.title, exact: true })).toBeVisible()
}

test('学习路线保留共同基础，阶段筛选与返回位置不丢失', async ({ page }) => {
  await openLibrary(page)
  const routes = page.getByRole('group', { name: '学习路线', exact: true })
  const levels = page.getByRole('combobox', { name: '学习阶段', exact: true })
  await expect(page.locator('.repertoire-list button')).toHaveCount(12)
  await expect(page.locator('.repertoire-filter-note')).toContainText('4 首旋律 · 12 份编配')
  await routes.getByRole('button', { name: '弹唱', exact: true }).click()
  await expect(page.locator('.repertoire-list button')).toHaveCount(8)
  await expect(levels.locator('option')).toHaveText(['全部阶段', 'L1 · 单音入门', 'L2 · 和弦配唱', 'L3 · 完整弹唱'])
  await levels.selectOption('3')
  await expect(page.locator('.repertoire-list button')).toHaveCount(2)
  const score = gradedRepertoire.find(item => item.level === 3)!
  await page.getByRole('button', { name: scoreButtonName(score), exact: true }).click()
  await page.getByRole('button', { name: '返回曲库', exact: true }).click()
  await expect(levels).toHaveValue('3')
  await expect(routes.getByRole('button', { name: '弹唱', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await routes.getByRole('button', { name: '指弹', exact: true }).click()
  await expect(levels).toHaveValue('all')
  await expect(page.locator('.repertoire-list button')).toHaveCount(8)
  await expect(levels.locator('option')).toHaveText(['全部阶段', 'L1 · 单音入门', 'L4 · 旋律加低音', 'L5 · 完整指弹'])
  await levels.selectOption('5')
  await expect(page.locator('.repertoire-list button')).toHaveCount(2)
})

test('底部开始按钮直接进入当前筛选的第一份谱', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await openLibrary(page)
  const actions = page.getByRole('region', { name: '当前页面操作', exact: true })
  const start = actions.getByRole('button', { name: '开始 L1', exact: true })
  await expect(start).toBeInViewport({ ratio: 1 })
  await start.click()
  await expect(page.getByRole('heading', { name: gradedRepertoire[0].title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回曲库', exact: true }).click()
  await page.getByRole('group', { name: '学习路线', exact: true }).getByRole('button', { name: '指弹', exact: true }).click()
  await page.getByRole('combobox', { name: '学习阶段', exact: true }).selectOption('5')
  await actions.getByRole('button', { name: '开始 L5', exact: true }).click()
  const score = gradedRepertoire.find(item => item.level === 5)!
  await expect(page.getByRole('heading', { name: score.title, exact: true })).toBeVisible()
  await expect(page.locator('.repertoire-song-heading')).toContainText(score.subtitle)
  await expect(page.locator('.tab-exercise-heading')).toContainText('指弹')
})

test('每份编配都能看到完整结尾并回到第一段，版本和技巧说明明确', async ({ page }) => {
  test.setTimeout(60000)
  await openLibrary(page)
  for (const score of gradedRepertoire) {
    await page.getByRole('button', { name: scoreButtonName(score), exact: true }).click()
    await expect(page.locator('.repertoire-song-heading')).toContainText(`L${score.level}`)
    await expect(page.locator('.repertoire-song-heading')).toContainText(score.subtitle)
    await page.locator('.repertoire-technique > summary').click()
    await expect(page.locator('.repertoire-technique li')).toHaveCount(score.technique.steps.length)
    await range(page).selectOption('all')
    await expect(page.locator('.tab-bar-label').last()).toContainText(`第 ${score.bars.length} 小节`)
    await page.locator('.tab-event').last().click()
    await expect(page.getByRole('button', { name: '后一音', exact: true })).toBeDisabled()
    await expect(page.locator('.tab-position-count')).toContainText(`第 ${eventsOf(score).length} / ${eventsOf(score).length}`)
    await page.getByRole('button', { name: '从头分段练', exact: true }).click()
    await expect(range(page)).toHaveValue('0')
    await page.getByRole('button', { name: '返回曲库', exact: true }).click()
  }
})

test('完整弹唱能切换跟唱旋律，字音对应、半拍读法和整曲歌句可查', async ({ page }) => {
  const score = gradedRepertoire.find(item => item.level === 3 && item.songId === 'two-tigers')!
  await openScore(page, score)
  await page.locator('.repertoire-lyrics > summary').click()
  for (const line of score.lyrics!.lines) await expect(page.locator('.repertoire-lyrics').getByText(line, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: '旋律跟唱 先找音 · 再配唱', exact: true }).click()
  await range(page).selectOption('all')
  await expect(page.locator('.tab-event-lyric')).toHaveCount(score.vocalBars!.flat().filter(event => event.lyric).length)
  const halfIndex = score.vocalBars!.flat().findIndex(event => event.beats === 0.5)
  expect(halfIndex).toBeGreaterThanOrEqual(0)
  await page.locator('.tab-event').nth(halfIndex).click()
  await expect(page.locator('.tab-position')).toContainText('半拍')
  await expect(page.locator('.tab-current-lyric')).toContainText(score.vocalBars!.flat()[halfIndex].lyric!)
  await page.getByRole('button', { name: '弹唱伴奏 弹伴奏 · 自己唱', exact: true }).click()
  await expect(page.locator('.tab-event')).toHaveCount(eventsOf(score).length)
  await expect(page.locator('.tab-event-lyric')).toHaveCount(0)
})

test('短屏看谱入口与跟唱切换直接露出六根弦、拍值和歌词', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const score = gradedRepertoire.find(item => item.id === 'frere-sing')!
  await openScore(page, score)
  await page.getByRole('button', { name: '看谱练习', exact: true }).click()
  await expect(page.locator('.tab-event').first()).toBeInViewport({ ratio: 1 })
  await page.getByRole('button', { name: '旋律跟唱 先找音 · 再配唱', exact: true }).click()
  const first = page.locator('.tab-event').first()
  await expect(first).toBeInViewport({ ratio: 1 })
  await expect(first.locator('.tab-event-lyric')).toHaveText('早')
  const note = (await first.boundingBox())!
  const footer = (await page.locator('.workbench-bottom').boundingBox())!
  expect(note.y + note.height).toBeLessThanOrEqual(footer.y)
  await page.screenshot({ path: testInfo.outputPath('vocal-entry-320.png'), animations: 'disabled' })
})

test('填充音的止音时间与下一次动作间隔分别说明', async ({ page }) => {
  const score = gradedRepertoire.find(item => item.id === 'twinkle-fingerstyle')!
  const index = score.bars.slice(0, 2).flatMap(bar => bar.events).findIndex(event => event.beats === 1 && event.notes.some(note => note.role === 'fill' && note.sustainBeats === .5))
  expect(index).toBeGreaterThanOrEqual(0)
  await openScore(page, score)
  await page.locator('.tab-event').nth(index).click()
  await expect(page.locator('.tab-position')).toContainText('响半拍后止音')
  await expect(page.locator('.tab-position')).toContainText('1拍后弹下一列')
})

test('完整指弹真实调度半拍和独立延音，切段与退出释放声音', async ({ page }) => {
  await auditAudio(page)
  const score = gradedRepertoire.find(item => item.level === 5 && item.songId === 'twinkle-star')!
  await openScore(page, score)
  expect(await page.evaluate(() => window.gradedAudio.contexts.length)).toBe(0)
  await expect(page.locator('.tab-event strong[data-role="melody"]').first()).toBeVisible()
  await expect(page.locator('.tab-event strong[data-role="bass"]').first()).toBeVisible()
  await expect(page.locator('.tab-event strong[data-role="fill"]').first()).toBeVisible()
  await page.getByRole('combobox', { name: '示范速度', exact: true }).selectOption('60')
  await play(page).click()
  await expect(stop(page)).toBeVisible()
  const voices = await page.evaluate(() => window.gradedAudio.voices)
  const events = score.bars.slice(0, 2).flatMap(bar => bar.events)
  const timeline = onsets(events)
  const expected = timeline.flatMap(({ event, onset }) => event.notes.map(note => ({ note, onset, duration: note.sustainBeats ?? event.beats })))
  expect(voices).toHaveLength(expected.length)
  for (const [index, voice] of voices.entries()) {
    expect(voice.frequency).toBeCloseTo(440 * 2 ** ((midi(expected[index].note) - 69) / 12), 3)
    expect(voice.start - voices[0].start).toBeCloseTo(expected[index].onset, 5)
    expect(voice.stops[0] - voice.start).toBeCloseTo(expected[index].duration * 0.94 + 0.01, 5)
  }
  const sustained = expected.findIndex(attack => attack.duration > 0.5 && attack.note.role === 'melody')
  expect(sustained).toBeGreaterThanOrEqual(0)
  expect(voices[sustained].stops[0] - voices[sustained].start).toBeGreaterThan(0.5)
  await range(page).selectOption('2')
  await expect.poll(() => page.evaluate(() => window.gradedAudio.contexts.map(context => context.state))).toEqual(['closed'])
  await play(page).click()
  await expect(stop(page)).toBeVisible()
  await page.getByRole('button', { name: '返回曲库', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.gradedAudio.contexts.map(context => context.state))).toEqual(['closed', 'closed'])
})

for (const width of [390, 320, 160]) {
  test(`分级曲库与完整指弹在 ${width}px 可查阅且不横向溢出`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 640 })
    await openLibrary(page)
    await page.getByRole('group', { name: '学习路线', exact: true }).getByRole('button', { name: '指弹', exact: true }).click()
    await page.getByRole('combobox', { name: '学习阶段', exact: true }).selectOption('5')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`graded-library-${width}.png`), animations: 'disabled' })
    const score = gradedRepertoire.find(item => item.level === 5)!
    await page.getByRole('button', { name: scoreButtonName(score), exact: true }).click()
    await range(page).selectOption('all')
    await page.locator('.tab-event').last().click()
    await expect(page.locator('.tab-event.selected')).toHaveAttribute('aria-pressed', 'true')
    expect(await page.locator('.tab-score').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`graded-score-${width}.png`), animations: 'disabled' })
  })
}
