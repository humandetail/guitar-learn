import { test, expect } from '@playwright/test'

test('节拍器默认停止、校验速度、静音运行并保存偏好', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始节拍', exact: true })).toBeVisible()
  await expect(page.getByLabel('BPM', { exact: true })).toHaveValue('80')
  await expect(page.getByLabel('播放 click 声音')).toBeChecked()
  await page.getByLabel('BPM', { exact: true }).fill('241')
  await page.getByLabel('BPM', { exact: true }).blur()
  await expect(page.getByRole('alert')).toContainText('30–240')
  await page.getByLabel('BPM', { exact: true }).fill('240')
  await page.getByLabel('BPM', { exact: true }).blur()
  await page.getByLabel('播放 click 声音').uncheck()
  await page.getByRole('button', { name: '开始节拍', exact: true }).click()
  await expect(page.getByLabel('当前节拍')).toContainText('第 1 拍')
  await expect(page.getByLabel('当前节拍')).toContainText('第 2 拍')
  await page.getByRole('button', { name: '停止节拍', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await expect(page.getByLabel('BPM', { exact: true })).toHaveValue('240')
  await expect(page.getByLabel('播放 click 声音')).not.toBeChecked()
  await expect(page.getByRole('button', { name: '开始节拍', exact: true })).toBeVisible()
})

test('运行中多参数统一等下一小节应用，十六分静音视觉与拍轨跟随拍数', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await page.getByLabel('BPM', { exact: true }).fill('60')
  await page.getByLabel('播放 click 声音').uncheck()
  await page.getByRole('button', { name: '开始节拍', exact: true }).click()
  await expect(page.getByLabel('当前节拍')).toContainText('第 1 拍')
  await page.getByLabel('BPM', { exact: true }).fill('240')
  await page.getByRole('button', { name: '2 拍', exact: true }).click()
  await page.getByRole('button', { name: '十六分', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('下一小节应用：240 BPM · 2 拍 · 十六分')
  await expect(page.getByLabel('当前节拍')).toContainText('4/4 · 60 BPM')
  await expect(page.getByLabel('节拍轨道').locator('.beat-track')).toHaveCount(4)
  await expect(page.getByLabel('当前节拍')).toContainText('2/4 · 240 BPM', { timeout: 6000 })
  await expect(page.getByLabel('节拍轨道').locator('.beat-track')).toHaveCount(2)
  await expect(page.getByLabel('当前节拍')).toContainText('细分')
  await expect(page.getByText('下一小节应用', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: '停止节拍', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await expect(page.getByRole('button', { name: '2 拍', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '十六分', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '开始节拍', exact: true })).toBeVisible()
})

test('后台立即停止，返回需手动从第一拍继续；离开页面关闭音频时钟', async ({ page }) => {
  await page.addInitScript(() => {
    const Base = window.AudioContext
    const contexts: AudioContext[] = []
    Object.assign(window, { metronomeContexts: contexts })
    window.AudioContext = class extends Base { constructor(options?: AudioContextOptions) { super(options); contexts.push(this) } }
  })
  await page.goto('/')
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await page.getByRole('button', { name: '开始节拍', exact: true }).click()
  await expect(page.getByLabel('当前节拍')).toContainText('第 2 拍')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('status')).toContainText('节拍已暂停')
  await expect.poll(() => page.evaluate(() => window.metronomeContexts.map(context => context.state))).toEqual(['closed'])
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('button', { name: '继续节拍', exact: true })).toBeVisible()
  await expect(page.getByLabel('当前节拍')).toContainText('准备开始')
  await page.getByRole('button', { name: '继续节拍', exact: true }).click()
  await expect(page.getByLabel('当前节拍')).toContainText('第 1 拍')
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect.poll(() => page.evaluate(() => window.metronomeContexts.map(context => context.state))).toEqual(['closed', 'closed'])
})

declare global { interface Window { metronomeContexts: AudioContext[] } }

test('停止时拍数和细分立即生效，速度加减与滑块共享有效范围', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await page.getByRole('button', { name: '提高 BPM', exact: true }).click()
  await expect(page.getByLabel('BPM', { exact: true })).toHaveValue('81')
  await page.getByRole('button', { name: '降低 BPM', exact: true }).click()
  await expect(page.getByLabel('速度滑块')).toHaveValue('80')
  await page.getByLabel('速度滑块').fill('30')
  await expect(page.getByLabel('BPM', { exact: true })).toHaveValue('30')
  await expect(page.getByRole('button', { name: '降低 BPM', exact: true })).toBeDisabled()
  for (const beats of [2, 3, 4]) {
    await page.getByRole('button', { name: `${beats} 拍`, exact: true }).click()
    await expect(page.getByLabel('节拍轨道').locator('.beat-track')).toHaveCount(beats)
    for (const [label, count] of [['四分', 1], ['八分', 2], ['十六分', 4]] as const) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await expect(page.getByLabel('节拍轨道').locator('.pulse')).toHaveCount(beats * count)
    }
  }
})

test('前台长任务错过预排窗口时暂停，不补播节拍', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await page.getByLabel('BPM', { exact: true }).fill('240')
  await page.getByRole('button', { name: '十六分', exact: true }).click()
  await page.getByRole('button', { name: '开始节拍', exact: true }).click()
  await expect(page.getByLabel('当前节拍')).toContainText('细分')
  await page.evaluate(() => { const begin = performance.now(); while (performance.now() - begin < 250) { /* foreground stall */ } })
  await expect(page.getByRole('status')).toContainText('音频时钟已中断')
  await expect(page.getByRole('button', { name: '继续节拍', exact: true })).toBeVisible()
  await expect(page.getByLabel('当前节拍')).toContainText('准备开始')
})
