import { test, expect, type Page } from '@playwright/test'
import { lessons } from '../src/lessons'
import { defaultSettings } from '../src/model'

const progressKey = 'guitar-learn.learning.v1'
const nav = (page: Page) => page.getByRole('navigation', { name: '练习模块' })
const play = (page: Page) => page.getByRole('button', { name: '播放合成示范', exact: true })
const stop = (page: Page) => page.getByRole('button', { name: '停止示范', exact: true })
const event = (page: Page, position: number) => page.getByRole('button', { name: new RegExp(`^第 ${position} 个位置：`) })

type Progress = { version: 1; view: 'lesson'; lessonId: string; step: number; completed: string[]; checks: Record<string, number[]> }
type AudioAudit = {
  contexts: AudioContext[]
  starts: { context: number; frequency: number; when: number }[]
  release: (() => void)[]
}
declare global { interface Window { expandedLearningAudio: AudioAudit } }

function lessonProgress(lessonId: string, step = 0): Progress {
  return { version: 1, view: 'lesson', lessonId, step, completed: [], checks: {} }
}
function exerciseProgress(exercise: string): Progress {
  const lesson = lessons.find(item => item.steps.some(step => step.exercise === exercise))!
  return lessonProgress(lesson.id, lesson.steps.findIndex(step => step.exercise === exercise))
}
async function seed(page: Page, progress: Progress) {
  await page.addInitScript(({ key, progress }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress))
  }, { key: progressKey, progress })
}
async function openExercise(page: Page, exercise: string) {
  await seed(page, exerciseProgress(exercise))
  await page.goto('/')
}
async function moveTo(page: Page, progress: Progress) {
  await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: progressKey, progress })
  await page.reload()
}

// Observe the browser's real audio nodes. A resume gate delays only the promise
// seen by the app, so cancellation races still create and close real contexts.
async function auditAudio(page: Page, holdResume = false) {
  await page.addInitScript(hold => {
    const NativeAudioContext = window.AudioContext
    const audit: AudioAudit = { contexts: [], starts: [], release: [] }
    window.expandedLearningAudio = audit
    class ObservedAudioContext extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options)
        audit.contexts.push(this)
      }
      override resume(): Promise<void> {
        const resumed = super.resume()
        if (!hold) return resumed
        return Promise.all([resumed, new Promise<void>(resolve => audit.release.push(resolve))]).then(() => undefined)
      }
      override createOscillator(): OscillatorNode {
        const node = super.createOscillator()
        const start = node.start.bind(node)
        const index = audit.contexts.indexOf(this)
        node.start = (when = 0) => {
          audit.starts.push({ context: index, frequency: node.frequency.value, when })
          start(when)
        }
        return node
      }
    }
    window.AudioContext = ObservedAudioContext
  }, holdResume)
}
async function audioStates(page: Page) {
  return page.evaluate(() => window.expandedLearningAudio.contexts.map(context => context.state))
}
async function assertClosed(page: Page) {
  await expect.poll(() => audioStates(page), { timeout: 1500 }).toEqual(['closed'])
}

test.describe.configure({ timeout: 25000 })

test('旧六课存档扩展后保留完成、复习位置与部分自查', async ({ page }) => {
  const oldLessons = ['guitar-basics', 'tuning', 'single-notes', 'first-chord', 'rhythm', 'chord-changes']
  const reviewing = lessons.find(lesson => lesson.id === 'first-chord')!
  const progress = { ...lessonProgress(reviewing.id, reviewing.steps.length), completed: oldLessons, checks: { 'first-chord': [0, 1], 'guitar-basics': [0, 1] } }
  await seed(page, progress)
  await page.goto('/')
  await expect(page.getByLabel(reviewing.checks[0], { exact: true })).toBeChecked()
  await expect(page.getByLabel(reviewing.checks[1], { exact: true })).toBeChecked()
  await expect(page.getByLabel(reviewing.checks[2], { exact: true })).not.toBeChecked()
  await page.reload()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual(progress)
  await expect(page.getByLabel(reviewing.checks[1], { exact: true })).toBeChecked()
  await page.getByRole('button', { name: '课程目录', exact: true }).click()
  await expect(page.getByRole('progressbar', { name: '入门课程进度' })).toHaveAttribute('aria-valuenow', '6')
  await expect(page.getByRole('progressbar', { name: '入门课程进度' })).toHaveAttribute('aria-valuemax', '14')
  await expect(page.getByRole('button', { name: /，已完成，可复习$/ })).toHaveCount(6)
  for (const lesson of lessons) await expect(page.getByRole('button', { name: new RegExp(`^\\d+\\. ${lesson.title}`) })).toHaveCount(1)
  await page.getByRole('button', { name: new RegExp(`^\\d+\\. ${reviewing.title}`) }).click()
  for (const [index] of reviewing.steps.entries()) await page.getByRole('button', { name: index === reviewing.steps.length - 1 ? '开始自查' : '下一步', exact: true }).click()
  await expect(page.getByLabel(reviewing.checks[0], { exact: true })).toBeChecked()
})

test('琴身图可点击和键盘切换部件，并解释位置与作用', async ({ page }, testInfo) => {
  await seed(page, lessonProgress('guitar-anatomy'))
  await page.goto('/')
  const figure = page.getByRole('figure', { name: '认识吉他各部位' })
  await figure.getByRole('button', { name: '认识琴钮', exact: true }).click()
  await expect(figure.locator('.anatomy-description')).toContainText('调音前沿弦确认对应琴钮')
  const nut = figure.getByRole('button', { name: '认识琴枕', exact: true })
  await nut.focus()
  await page.keyboard.press('Enter')
  await expect(nut).toHaveAttribute('aria-pressed', 'true')
  await expect(figure.locator('.anatomy-description')).toContainText('琴头与指板交界处')
  await expect(figure.getByRole('img')).toHaveAccessibleName(/当前突出显示琴枕/)
  const saddle = figure.getByRole('button', { name: '认识下弦枕', exact: true })
  await saddle.focus()
  await page.keyboard.press('Space')
  await expect(saddle).toHaveAttribute('aria-pressed', 'true')
  await expect(nut).toHaveAttribute('aria-pressed', 'false')
  await expect(figure.locator('.anatomy-description')).toContainText('琴桥上托住琴弦')
  for (const viewport of [{width:390,height:844}, {width:320,height:568}]) {
    await page.setViewportSize(viewport)
    for (const part of ['琴钮', '琴桥']) {
      await figure.getByRole('button', { name: `认识${part}`, exact: true }).click()
      await expect(figure.getByRole('img')).toBeInViewport({ ratio: 1 })
      await expect(figure.locator('.anatomy-description')).toBeInViewport({ ratio: 1 })
      const description = (await figure.locator('.anatomy-description').boundingBox())!
      const footer = (await page.locator('.workbench-bottom').boundingBox())!
      expect(description.y + description.height).toBeLessThanOrEqual(footer.y + 1)
      await page.screenshot({ path: testInfo.outputPath(`anatomy-${viewport.width}-${part}.png`), animations: 'disabled' })
    }
  }
})

test('初学者能区分 TAB、指法图与简谱中的数字 2', async ({ page }) => {
  const lesson = lessons.find(item => item.steps.some(step => step.diagram === 'notation'))!
  await seed(page, lessonProgress(lesson.id, lesson.steps.findIndex(step => step.diagram === 'notation')))
  await page.goto('/')
  const figure = page.getByRole('figure', { name: '三种数字 2 的含义' })
  await expect(figure).toContainText('六线谱上的 2')
  await expect(figure).toContainText('数字＝品位')
  await expect(figure).toContainText('按第 1 弦第 2 品')
  await expect(figure).toContainText('指法图圆点里的 2')
  await expect(figure).toContainText('数字＝手指')
  await expect(figure).toContainText('用中指按圆点所在的位置')
  await expect(figure).toContainText('简谱里的 2')
  await expect(figure).toContainText('数字＝音级')
  await expect(figure).toContainText('2 是 re（D 音）')
})

test('左手设置不会翻转 TAB 弦序，点击数字能读出实际弦和品位', async ({ page }) => {
  await page.addInitScript(settings => localStorage.setItem('guitar-learn.settings.v1', JSON.stringify(settings)), { ...defaultSettings, leftHanded: true })
  await openExercise(page, 'tab-reading')
  await expect(event(page, 1)).toHaveAttribute('aria-pressed', 'true')
  const labels = page.locator('.tab-string-labels').first().locator('span')
  await expect(labels).toHaveText(['1 弦', '2 弦', '3 弦', '4 弦', '5 弦', '6 弦'])
  const tops = await labels.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top))
  expect(tops.every((top, index) => index === 0 || top > tops[index - 1])).toBe(true)
  await event(page, 3).click()
  await expect(page.locator('.tab-position')).toContainText('第 1 弦第 3 品')
  await expect(event(page, 3).locator('.tab-event-string').first()).toContainText('3')
  await expect(event(page, 3).locator('.tab-event-string').last()).toHaveText('')
})

test('爬格子逐音显示手指，并明确从第 2 弦换到第 1 弦', async ({ page }) => {
  await openExercise(page, 'chromatic-one')
  await expect(page.getByRole('combobox', { name: '示范速度', exact: true })).toHaveValue('40')
  await expect(page.getByRole('button', { name: '前一音', exact: true })).toBeDisabled()
  await event(page, 4).click()
  await expect(page.locator('.tab-position')).toContainText('第 1 弦第 4 品（小指）')
  await expect(page.getByRole('button', { name: '后一音', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '前一音', exact: true }).click()
  await expect(page.locator('.tab-position')).toContainText('第 1 弦第 3 品（无名指）')
  await moveTo(page, exerciseProgress('chromatic-cross'))
  await event(page, 4).click()
  await expect(page.locator('.tab-position')).toContainText('第 2 弦第 4 品（小指）')
  await page.getByRole('button', { name: '后一音', exact: true }).click()
  await expect(page.locator('.tab-position')).toContainText('第 1 弦第 1 品（食指）')
  await expect(event(page, 5)).toHaveAttribute('aria-pressed', 'true')
})

test('休止不拨弦，两拍音只拨一次；真实音频保留两秒间隔', async ({ page }) => {
  await auditAudio(page)
  await openExercise(page, 'rhythm-rest')
  await event(page, 2).click()
  await expect(page.locator('.tab-position')).toContainText('休止 1 拍：轻触琴弦让声音停下来，继续数拍')
  await event(page, 3).click()
  await expect(page.locator('.tab-position')).toContainText('持续 2 拍，中途不重复拨弦')
  await page.getByRole('combobox', { name: '示范速度', exact: true }).selectOption('60')
  await play(page).click()
  await expect(stop(page)).toBeVisible()
  const starts = await page.evaluate(() => window.expandedLearningAudio.starts)
  expect(starts).toHaveLength(2)
  expect(starts[1].when - starts[0].when).toBeCloseTo(2, 6)
  await stop(page).click()
  await assertClosed(page)
})

test('独奏的竖列解释同时拨，低音 E2 和旋律 E4 实际同时开始', async ({ page }) => {
  await auditAudio(page)
  await openExercise(page, 'solo-duet')
  await expect(page.locator('.tab-position')).toContainText('同时拨响：第 6 弦空弦、第 1 弦空弦')
  await play(page).click()
  await expect(stop(page)).toBeVisible()
  const starts = await page.evaluate(() => window.expandedLearningAudio.starts)
  expect(starts[0].when).toBe(starts[1].when)
  expect(starts[0].frequency).toBeCloseTo(82.406889, 3)
  expect(starts[1].frequency).toBeCloseTo(329.627557, 3)
  await stop(page).click()
  await assertClosed(page)
})

test('合成示范只主动启动，按所选 80 BPM 推进高亮并自然结束', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await auditAudio(page)
  await openExercise(page, 'tab-reading')
  expect(await audioStates(page)).toEqual([])
  await page.getByRole('combobox', { name: '示范速度', exact: true }).selectOption('80')
  await play(page).click()
  await expect(stop(page)).toBeVisible()
  expect(await audioStates(page)).toEqual(['running'])
  const starts = await page.evaluate(() => window.expandedLearningAudio.starts)
  expect(starts).toHaveLength(4)
  expect(starts[1].when - starts[0].when).toBeCloseTo(0.75, 6)
  await expect(event(page, 2)).toHaveAttribute('aria-pressed', 'true', { timeout: 1800 })
  await expect(stop(page)).toBeInViewport({ ratio: 1 })
  await expect(event(page, 2)).toBeInViewport({ ratio: 1 })
  const controls = (await page.locator('.tab-playback-controls').boundingBox())!
  const selected = (await event(page, 2).boundingBox())!
  expect(selected.y).toBeGreaterThanOrEqual(controls.y + controls.height)
  await expect(play(page)).toBeVisible({ timeout: 4000 })
  await expect(event(page, 4)).toHaveAttribute('aria-pressed', 'true')
  await assertClosed(page)
})

test('两小节播放换行后，短屏仍能看到当前音和停止键', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await auditAudio(page)
  await openExercise(page, 'chromatic-cross')
  await page.getByRole('combobox', { name: '示范速度', exact: true }).selectOption('80')
  await play(page).click()
  await expect(event(page, 5)).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 })
  await expect(stop(page)).toBeInViewport({ ratio: 1 })
  await expect(event(page, 5)).toBeInViewport({ ratio: 1 })
  const controls = (await page.locator('.tab-playback-controls').boundingBox())!
  const selected = (await event(page, 5).boundingBox())!
  expect(selected.y).toBeGreaterThanOrEqual(controls.y + controls.height)
  await stop(page).click()
  await assertClosed(page)
})

for (const destination of ['step', 'module', 'background'] as const) {
  test(`示范在离开 ${destination} 时立即关闭真实音频`, async ({ page }) => {
    await auditAudio(page)
    await openExercise(page, 'chromatic-one')
    await play(page).click()
    await expect(stop(page)).toBeVisible()
    if (destination === 'step') await page.getByRole('button', { name: '下一步', exact: true }).click()
    if (destination === 'module') await nav(page).getByRole('button', { name: '和弦', exact: true }).click()
    if (destination === 'background') {
      // Headless pages stay visible; deliver the browser visibility boundary
      // while leaving the real AudioContext and its scheduling untouched.
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
        document.dispatchEvent(new Event('visibilitychange'))
      })
    }
    await assertClosed(page)
    if (destination === 'module') await nav(page).getByRole('button', { name: '学习', exact: true }).click()
    await expect(play(page)).toBeVisible()
  })
}

for (const cancellation of ['button', 'module'] as const) {
  test(`等待音频解锁时通过 ${cancellation} 取消，迟到的 resume 不会启动音符`, async ({ page }) => {
    await auditAudio(page, true)
    await openExercise(page, 'tab-reading')
    await play(page).click()
    await expect(page.getByRole('button', { name: '取消启动示范', exact: true })).toBeVisible()
    expect(await audioStates(page)).toHaveLength(1)
    if (cancellation === 'button') await page.getByRole('button', { name: '取消启动示范', exact: true }).click()
    else await nav(page).getByRole('button', { name: '和弦', exact: true }).click()
    await assertClosed(page)
    await page.evaluate(async () => {
      window.expandedLearningAudio.release.splice(0).forEach(release => release())
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    expect(await page.evaluate(() => window.expandedLearningAudio.starts)).toEqual([])
    if (cancellation === 'module') await nav(page).getByRole('button', { name: '学习', exact: true }).click()
    await expect(play(page)).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

for (const width of [320, 390, 160]) {
  test(`新图谱与 TAB 在 ${width}px 宽下无横溢，数字和播放控件仍可操作`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 568 })
    await seed(page, lessonProgress('guitar-anatomy'))
    await page.goto('/')
    const positions = [lessonProgress('guitar-anatomy'), lessonProgress('reading-tab'), exerciseProgress('chromatic-cross'), exerciseProgress('solo-duet')]
    for (const [index, position] of positions.entries()) {
      if (index > 0) await moveTo(page, position)
      await expect(page.getByRole('heading', { name: lessons.find(item => item.id === position.lessonId)!.steps[position.step].title, exact: true })).toBeVisible()
      const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.width)
      if (index < 2) continue
      const score = page.locator('.tab-score')
      await expect.poll(() => score.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      const last = page.locator('.tab-event').last()
      await last.click()
      await expect(last).toHaveAttribute('aria-pressed', 'true')
      const box = (await last.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      await play(page).scrollIntoViewIfNeeded()
      const control = (await play(page).boundingBox())!
      expect(control.x).toBeGreaterThanOrEqual(0)
      expect(control.x + control.width).toBeLessThanOrEqual(width)
      expect(control.y).toBeGreaterThanOrEqual(0)
      expect(control.y + control.height).toBeLessThanOrEqual(568)
    }
    await page.screenshot({ path: testInfo.outputPath(`solo-${width}.png`) })
  })
}
