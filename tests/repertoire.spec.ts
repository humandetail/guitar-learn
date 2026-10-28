import { test, expect, type Page } from '@playwright/test'
import { repertoire } from '../src/repertoire'
import { lessons } from '../src/lessons'
import { openMidi } from '../src/model'

const progressKey = 'guitar-learn.learning.v1'
const range = (page: Page) => page.getByRole('combobox', { name: '练习范围', exact: true })
const play = (page: Page) => page.getByRole('button', { name: '播放合成示范', exact: true })
const stop = (page: Page) => page.getByRole('button', { name: '停止示范', exact: true })
const accompaniment = (page: Page) => page.getByRole('button', { name: '伴奏谱 后练 · 和弦', exact: true })
const nav = (page: Page) => page.getByRole('navigation', { name: '练习模块' })

type AudioAudit = { contexts: AudioContext[]; starts: { frequency: number; when: number }[] }
declare global { interface Window { repertoireAudio: AudioAudit } }

async function auditAudio(page: Page) {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext
    const audit: AudioAudit = { contexts: [], starts: [] }
    window.repertoireAudio = audit
    class ObservedAudioContext extends NativeAudioContext {
      constructor(options?: AudioContextOptions) { super(options); audit.contexts.push(this) }
      override createOscillator(): OscillatorNode {
        const node = super.createOscillator()
        const start = node.start.bind(node)
        node.start = (when = 0) => { audit.starts.push({ frequency: node.frequency.value, when }); start(when) }
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
async function openSong(page: Page, index = 0) {
  await openLibrary(page)
  await page.getByRole('button', { name: `练习${repertoire[index].title}`, exact: true }).click()
  await expect(page.getByRole('heading', { name: repertoire[index].title, exact: true })).toBeVisible()
}
async function assertClosed(page: Page) {
  await expect.poll(() => page.evaluate(() => window.repertoireAudio.contexts.map(context => context.state))).toEqual(['closed'])
}

test.describe.configure({ timeout: 25000 })

test('三首熟悉旋律保留完整小节，G调第一把位且有可追溯来源', () => {
  expect(repertoire.map(song => song.title)).toEqual(['玛丽有只小羊羔', '小星星', '两只老虎'])
  expect(repertoire.map(song => song.bars.length)).toEqual([8, 12, 16])
  const starts = [[59, 57, 55, 57], [55, 55, 62, 62], [55, 57, 59, 55]]
  for (const [index, song] of repertoire.entries()) {
    const melody = song.bars.flatMap(bar => bar.events)
    const pitches = melody.map(event => openMidi[6 - event.notes[0].string] + event.notes[0].fret)
    expect(pitches.slice(0, 4)).toEqual(starts[index])
    expect(pitches.at(-1)).toBe(55)
    for (const bar of song.bars) {
      expect(bar.events.reduce((beats, event) => beats + event.beats, 0)).toBe(4)
      expect(['G', 'C', 'D']).toContain(bar.chord)
      for (const event of bar.events) {
        expect(event.notes).toHaveLength(1)
        expect([1, 2, 4]).toContain(event.beats)
        const note = event.notes[0]
        expect(note.string).toBeGreaterThanOrEqual(1)
        expect(note.string).toBeLessThanOrEqual(6)
        expect(note.fret).toBeGreaterThanOrEqual(0)
        expect(note.fret).toBeLessThanOrEqual(3)
      }
    }
    expect(song.source.length).toBeGreaterThan(0)
    for (const source of song.source) expect(new URL(source.url).protocol).toBe('https:')
    for (const prerequisite of song.prerequisites) expect(lessons.some(lesson => lesson.id === prerequisite.lessonId)).toBe(true)
  }
  // The familiar Mary tune includes the high fifth; do not silently replace it with a three-note version.
  const maryPitches = repertoire[0].bars.flatMap(bar => bar.events).map(event => openMidi[6 - event.notes[0].string] + event.notes[0].fret)
  expect(new Set(maryPitches)).toEqual(new Set([55, 57, 59, 62]))
})

test('从学习入口可查三首曲谱，分段标签保留原小节编号', async ({ page }) => {
  await openLibrary(page)
  for (const song of repertoire) await expect(page.getByRole('button', { name: `练习${song.title}`, exact: true })).toBeVisible()
  await page.getByRole('button', { name: `练习${repertoire[0].title}`, exact: true }).click()
  await expect(range(page)).toHaveValue('0')
  await expect(page.locator('.tab-bar-label')).toHaveText(['第 1 小节', '第 2 小节'])
  await page.getByRole('combobox', { name: '示范速度', exact: true }).selectOption('40')
  await page.getByRole('button', { name: '下一段', exact: true }).click()
  await expect(range(page)).toHaveValue('2')
  await expect(page.locator('.tab-bar-label')).toHaveText(['第 3 小节', '第 4 小节'])
  await expect(page.getByRole('combobox', { name: '示范速度', exact: true })).toHaveValue('40')
  await accompaniment(page).click()
  await expect(page.getByRole('combobox', { name: '示范速度', exact: true })).toHaveValue('40')
  await page.getByRole('button', { name: '上一段', exact: true }).click()
  await expect(range(page)).toHaveValue('0')
  await expect(page.getByRole('combobox', { name: '示范速度', exact: true })).toHaveValue('40')
  await expect(page.getByRole('button', { name: '上一段', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '返回曲库', exact: true }).click()
  await page.getByRole('button', { name: `练习${repertoire[1].title}`, exact: true }).click()
  await expect(page.getByRole('combobox', { name: '示范速度', exact: true })).toHaveValue(String(repertoire[1].bpm))
})

test('整曲可查所有小节，最后音的手上动作就在当前小节旁', async ({ page }) => {
  await openSong(page, 2)
  await range(page).selectOption('all')
  await expect(page.locator('.tab-bar-label')).toHaveCount(16)
  await expect(page.locator('.tab-bar-label').last()).toHaveText('第 16 小节')
  const last = page.locator('.tab-event').last()
  await last.click()
  await expect(last).toHaveAttribute('aria-pressed', 'true')
  const lastBar = page.locator('.tab-bar').last()
  await expect(lastBar.locator('.tab-position')).toContainText('第 3 弦空弦')
  await expect(lastBar.locator('.tab-step-controls')).toBeVisible()
  await expect(page.getByRole('button', { name: '后一音', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '从头分段练', exact: true }).click()
  await expect(range(page)).toHaveValue('0')
  await expect(page.locator('.tab-bar-label')).toHaveCount(2)
})

test('跨小节逐音回退后，当前音和动作说明都能看见', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await openSong(page)
  await page.locator('.tab-event').nth(4).click()
  await page.getByRole('button', { name: '前一音', exact: true }).click()
  const selected = page.locator('.tab-event.selected')
  await expect(selected).toContainText('2')
  await expect(selected).toBeInViewport({ ratio: 1 })
  await expect(page.locator('.tab-position')).toBeInViewport({ ratio: 1 })
  await expect(page.locator('.tab-step-controls')).toBeInViewport({ ratio: 1 })
  const controls = (await page.locator('.tab-playback-controls').boundingBox())!
  const current = (await selected.boundingBox())!
  const position = (await page.locator('.tab-position').boundingBox())!
  const footer = (await page.locator('.workbench-bottom').boundingBox())!
  expect(current.y).toBeGreaterThanOrEqual(controls.y + controls.height)
  expect(position.y + position.height).toBeLessThanOrEqual(footer.y + 1)
  await page.screenshot({ path: testInfo.outputPath('previous-bar-320.png'), animations: 'disabled' })
})

test('短屏整曲播放跨小节后，音符和动作说明一起避开底栏', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await openSong(page)
  await range(page).selectOption('all')
  await page.getByRole('combobox', { name: '示范速度', exact: true }).selectOption('80')
  await play(page).click()
  await expect(page.locator('.tab-bar:has(.tab-position) .tab-bar-label')).toHaveText('第 2 小节', { timeout: 10000 })
  await expect(page.locator('.tab-event.selected')).toBeInViewport({ ratio: 1 })
  await expect(page.locator('.tab-position')).toBeInViewport({ ratio: 1 })
  const position = (await page.locator('.tab-position').boundingBox())!
  const footer = (await page.locator('.workbench-bottom').boundingBox())!
  expect(position.y + position.height).toBeLessThanOrEqual(footer.y + 1)
  await page.screenshot({ path: testInfo.outputPath('playback-bar-two-320.png'), animations: 'disabled' })
  await stop(page).click()
})

test('伴奏展示实际 G/C/D 指法，C与D谱面和合成音均跳过不弹弦', async ({ page }) => {
  await auditAudio(page)
  await openSong(page, 1)
  await accompaniment(page).click()
  await expect(accompaniment(page)).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.repertoire-chords > summary').click()
  for (const chord of ['G', 'C', 'D']) await expect(page.getByRole('img', { name: `${chord} 指法图`, exact: true })).toBeVisible()
  const cDiagram = page.getByRole('img', { name: 'C 指法图', exact: true })
  await expect(cDiagram.locator('[data-string="6"]')).toHaveAttribute('data-fret', 'x')
  const dDiagram = page.getByRole('img', { name: 'D 指法图', exact: true })
  await expect(dDiagram.locator('[data-string="6"]')).toHaveAttribute('data-fret', 'x')
  await expect(dDiagram.locator('[data-string="5"]')).toHaveAttribute('data-fret', 'x')
  await range(page).selectOption('all')
  const fretsByChord: Record<string, (number | null)[]> = { G: [3, 2, 0, 0, 0, 3], C: [null, 3, 2, 0, 1, 0], D: [null, null, 0, 2, 3, 2] }
  for (const [index, bar] of repertoire[1].bars.entries()) {
    const strings = page.locator('.tab-event').nth(index).locator('.tab-event-string')
    for (let string = 1; string <= 6; string++) {
      const fret = fretsByChord[bar.chord][6 - string]
      await expect(strings.nth(string - 1)).toHaveText(fret === null ? '' : String(fret))
    }
  }
  await page.getByRole('combobox', { name: '示范速度', exact: true }).selectOption('60')
  await play(page).click()
  await expect(stop(page)).toBeVisible()
  const starts = await page.evaluate(() => window.repertoireAudio.starts)
  const expected = repertoire[1].bars.flatMap((bar, index) => fretsByChord[bar.chord].flatMap((fret, stringIndex) => fret === null ? [] : [{ midi: openMidi[stringIndex] + fret, bar: index }]))
  expect(starts).toHaveLength(expected.length)
  starts.forEach((start, index) => {
    expect(start.frequency).toBeCloseTo(440 * 2 ** ((expected[index].midi - 69) / 12), 3)
    expect(start.when - starts[0].when).toBeCloseTo(expected[index].bar * 4, 6)
  })
  await stop(page).click()
  await assertClosed(page)
})

for (const destination of ['mode', 'range', 'library', 'lesson', 'module'] as const) {
  test(`曲谱试听主动开始，切换 ${destination} 立即停止真实音频`, async ({ page }) => {
    await auditAudio(page)
    await openSong(page)
    expect(await page.evaluate(() => window.repertoireAudio.contexts.length)).toBe(0)
    await play(page).click()
    await expect(stop(page)).toBeVisible()
    if (destination === 'mode') await accompaniment(page).click()
    if (destination === 'range') await range(page).selectOption('2')
    if (destination === 'library') {
      await page.getByRole('button', { name: '返回曲库', exact: true }).click()
      await page.getByRole('region', { name: '当前页面操作' }).getByRole('button', { name: '返回课程', exact: true }).click()
      await expect(page.getByRole('heading', { name: '从零开始学', exact: true })).toBeVisible()
    }
    if (destination === 'lesson') {
      const prerequisite = repertoire[0].prerequisites[0]
      await page.locator('.repertoire-prerequisites').getByRole('button', { name: prerequisite.label, exact: true }).click()
      await expect(page.getByRole('heading', { name: lessons.find(lesson => lesson.id === prerequisite.lessonId)!.title, exact: true })).toBeVisible()
      expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).lessonId, progressKey)).toBe(prerequisite.lessonId)
    }
    if (destination === 'module') await nav(page).getByRole('button', { name: '和弦', exact: true }).click()
    await assertClosed(page)
  })
}

test('查谱与返回不改变原课程完成、自查或继续位置，刷新仍可继续', async ({ page }) => {
  const progress = { version: 1, view: 'overview', lessonId: 'first-chord', step: 2, completed: ['guitar-basics', 'tuning'], checks: { 'guitar-basics': [0, 1], 'first-chord': [0] } }
  await page.addInitScript(({ key, progress }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress)) }, { key: progressKey, progress })
  await openSong(page)
  await range(page).selectOption('all')
  await page.getByRole('region', { name: '当前页面操作' }).getByRole('button', { name: '返回曲库', exact: true }).click()
  await page.getByRole('region', { name: '当前页面操作' }).getByRole('button', { name: '返回课程', exact: true }).click()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual(progress)
  await page.reload()
  await page.getByRole('button', { name: '继续学习', exact: true }).click()
  await expect(page.getByRole('heading', { name: '第一个和弦：Em', exact: true })).toBeVisible()
  await expect(page.getByText('步骤 3 / 3', { exact: true })).toBeVisible()
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)
  expect(restored.completed).toEqual(progress.completed)
  expect(restored.checks).toEqual(progress.checks)
})

for (const width of [390, 320, 160]) {
  test(`曲库在 ${width}px 可查谱、选段和切伴奏，无横向溢出`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 640 })
    await openLibrary(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: `练习${repertoire[1].title}`, exact: true }).click()
    await range(page).selectOption('all')
    const last = page.locator('.tab-event').last()
    await last.click()
    await expect(last).toHaveAttribute('aria-pressed', 'true')
    const score = page.locator('.tab-score')
    await expect.poll(() => score.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await accompaniment(page).click()
    await range(page).selectOption('2')
    await play(page).scrollIntoViewIfNeeded()
    const box = (await play(page).boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`repertoire-${width}.png`), animations: 'disabled' })
  })
}
