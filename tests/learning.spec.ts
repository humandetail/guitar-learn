import { test, expect, type Page } from '@playwright/test'
import { lessons } from '../src/lessons'

const progressKey = 'guitar-learn.learning.v1'
const lessonIndex = (id: string) => lessons.findIndex(lesson => lesson.id === id)
const nav = (page: Page) => page.getByRole('navigation', { name: '练习模块' })

async function seedLesson(page: Page, index: number, step = 0) {
  await page.addInitScript(({ key, lessonId, step }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, view: 'lesson', lessonId, step, completed: [], checks: {} }))
  }, { key: progressKey, lessonId: lessons[index].id, step })
}

async function selfCheck(page: Page) {
  for (const checkbox of await page.locator('.page-screen:not([hidden])').getByRole('checkbox').all()) await checkbox.check()
}

test('首次进入学习，不请求麦克风；完成自查后刷新保留课程和完成状态', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      document.documentElement.dataset.microphoneRequests = 'requested'
      throw new DOMException('Denied', 'NotAllowedError')
    } })
  })
  await page.goto('/')
  await expect(nav(page).getByRole('button', { name: '学习', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('html')).not.toHaveAttribute('data-microphone-requests')
  await page.getByRole('button', { name: '开始第一课', exact: true }).click()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: lessons[0].steps[1].title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await page.getByRole('button', { name: '开始自查', exact: true }).click()
  await expect(page.getByRole('button', { name: '完成本课', exact: true })).toBeDisabled()
  await page.getByLabel(lessons[0].checks[0], { exact: true }).check()
  await page.reload()
  await expect(page.getByLabel(lessons[0].checks[0], { exact: true })).toBeChecked()
  await selfCheck(page)
  await page.getByRole('button', { name: '完成本课', exact: true }).click()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey)).toContain(lessons[0].id)
  await page.reload()
  await page.getByRole('button', { name: '开始下一课', exact: true }).click()
  await expect(page.getByRole('heading', { name: lessons[1].steps[0].title, exact: true })).toBeVisible()
})

test('从调音课打开工具不会自动收音，返回后保留原步骤', async ({ page }) => {
  const step = lessons[lessonIndex('tuning')].steps.findIndex(item => item.tool?.target === 'tuner')
  await seedLesson(page, lessonIndex('tuning'), step)
  await page.goto('/')
  await page.getByRole('button', { name: lessons[lessonIndex('tuning')].steps[step].tool!.label, exact: true }).click()
  await expect(page.getByRole('button', { name: '开始调音', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回课程 · 继续刚才的一步', exact: true }).click()
  await expect(page.getByRole('heading', { name: lessons[lessonIndex('tuning')].steps[step].title, exact: true })).toBeVisible()
})

test('短屏练习入口固定可见，课程滚动不覆盖图示', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const step = lessons[lessonIndex('tuning')].steps.findIndex(item => item.tool?.target === 'tuner')
  await seedLesson(page, lessonIndex('tuning'), step)
  await page.goto('/')
  const tool = page.getByRole('region', { name: '当前页面操作' }).getByRole('button', { name: lessons[lessonIndex('tuning')].steps[step].tool!.label, exact: true })
  const box = (await tool.boundingBox())!
  expect(box.y).toBeGreaterThan(0)
  expect(box.y + box.height).toBeLessThanOrEqual(568)
  await expect(tool).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('practice-dock-320.png') })
  await page.locator('.page-content').evaluate(element => { element.scrollTop = element.scrollHeight })
  await expect(page.getByRole('button', { name: '开始自查', exact: true })).toBeVisible()
  const header = await page.getByRole('button', { name: '设置', exact: true }).boundingBox()
  expect(header!.y + header!.height).toBeLessThanOrEqual(0)
})

test('课程预选 Em 和弦，检测继承目标，返回仍在原课', async ({ page }) => {
  const step = lessons[lessonIndex('first-chord')].steps.findIndex(item => item.tool?.target === 'chords')
  await seedLesson(page, lessonIndex('first-chord'), step)
  await page.goto('/')
  await page.getByRole('button', { name: lessons[lessonIndex('first-chord')].steps[step].tool!.label, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Em', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '练习这个和弦', exact: true }).click()
  await expect(page.getByLabel('目标和弦', { exact: true })).toHaveValue('builtin-Em')
  await expect(page.getByRole('button', { name: '开始逐弦检测', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回课程 · 继续刚才的一步', exact: true }).click()
  await expect(page.getByRole('heading', { name: lessons[lessonIndex('first-chord')].steps[step].title, exact: true })).toBeVisible()
})

test('节拍课预置慢速四拍，主动启动并返回课程后停止', async ({ page }) => {
  const step = lessons[lessonIndex('rhythm')].steps.findIndex(item => item.tool?.target === 'metronome')
  await seedLesson(page, lessonIndex('rhythm'), step)
  await page.goto('/')
  await page.getByRole('button', { name: lessons[lessonIndex('rhythm')].steps[step].tool!.label, exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'BPM', exact: true })).toHaveValue('60')
  await expect(page.getByRole('button', { name: /节奏设置/ })).toContainText('4 拍 · 四分')
  await page.getByRole('button', { name: '开始节拍', exact: true }).click()
  await expect(page.getByRole('button', { name: '停止节拍', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回课程 · 继续刚才的一步', exact: true }).click()
  await nav(page).getByRole('button', { name: '节拍', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始节拍', exact: true })).toBeVisible()
})

test('写入失败不假称完成，恢复存储后可重试保存', async ({ page }) => {
  await seedLesson(page, 0, lessons[0].steps.length)
  await page.goto('/')
  await selfCheck(page)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Object.assign(window, { restoreLearningStorage: () => { Storage.prototype.setItem = original } })
    Storage.prototype.setItem = function (key, value) {
      if (key === 'guitar-learn.learning.v1') throw new DOMException('Full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '完成本课', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('保存')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey)).toEqual([])
  await expect(page.getByRole('button', { name: '开始下一课', exact: true })).toHaveCount(0)
  await page.evaluate(() => (window as unknown as { restoreLearningStorage: () => void }).restoreLearningStorage())
  await page.getByRole('button', { name: /重试/ }).click()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey)).toContain(lessons[0].id)
})

test('损坏学习进度可继续阅读但不会覆盖原资料', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken-learning'), progressKey)
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('学习')
  await page.getByRole('button', { name: '开始第一课', exact: true }).click()
  await expect(page.getByRole('heading', { name: lessons[0].steps[0].title, exact: true })).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBe('{broken-learning')
})

test('从目录继续尚未完成的课，完成后继续下一课', async ({ page }) => {
  await seedLesson(page, 2)
  await page.goto('/')
  await page.getByRole('button', { name: '课程目录', exact: true }).click()
  await page.getByRole('button', { name: '继续学习', exact: true }).click()
  await expect(page.getByRole('heading', { name: lessons[2].steps[0].title, exact: true })).toBeVisible()
  await page.evaluate(({ key, id }) => localStorage.setItem(key, JSON.stringify({ version: 1, view: 'overview', lessonId: id, step: 3, completed: [id], checks: { [id]: [0, 1] } })), { key: progressKey, id: lessons[0].id })
  await page.reload()
  await page.getByRole('button', { name: '继续学习', exact: true }).click()
  await expect(page.getByRole('heading', { name: lessons[1].steps[0].title, exact: true })).toBeVisible()
})

test('全部课程可依次完成，最终保留全部进度并能回到课程复习', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一课', exact: true }).click()
  for (const [index, lesson] of lessons.entries()) {
    for (const [stepIndex, step] of lesson.steps.entries()) {
      await expect(page.getByRole('heading', { name: step.title, exact: true })).toBeVisible()
      await page.getByRole('button', { name: stepIndex === lesson.steps.length - 1 ? '开始自查' : '下一步', exact: true }).click()
    }
    await selfCheck(page)
    await page.getByRole('button', { name: '完成本课', exact: true }).click()
    if (index < lessons.length - 1) await page.getByRole('button', { name: '开始下一课', exact: true }).click()
  }
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed.length, progressKey)).toBe(lessons.length)
  await page.reload()
  await expect(page.getByRole('button', { name: '开始下一课', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '返回课程', exact: true }).click()
  await expect(page.getByRole('button', { name: new RegExp(lessons[0].title) })).toBeVisible()
})

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 160, height: 284 }]) {
  test(`课程 ${viewport.width}x${viewport.height} 无横溢且主操作可达`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', { name: '开始第一课', exact: true }).click()
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    expect(widths[0]).toBeLessThanOrEqual(widths[1])
    const action = page.getByRole('button', { name: '下一步', exact: true })
    await action.scrollIntoViewIfNeeded()
    const box = (await action.boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    await page.screenshot({ path: testInfo.outputPath('learning.png') })
  })
}
