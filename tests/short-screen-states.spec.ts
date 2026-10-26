import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const screenshots = '.oil-ui/short-screen-implementation/screenshots'
mkdirSync(screenshots, { recursive: true })
async function dock(page: Page) {
  const actions = page.getByRole('region', { name: '当前页面操作', exact: true })
  const box = (await actions.boundingBox())!
  const nav = (await page.getByRole('navigation', { name: '练习模块' }).boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y)
  for (const button of await actions.getByRole('button').all()) {
    const bounds = (await button.boundingBox())!
    expect(bounds.y).toBeGreaterThanOrEqual(box.y)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(box.y + box.height)
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    expect(bounds.height).toBeGreaterThanOrEqual(44)
  }
  return box.y
}

test('短屏授权等待可取消，权限失败后同位重试且错误原因可见', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.addInitScript(() => {
    let first = true
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => {
      if (first) { first = false; return new Promise(() => {}) }
      return Promise.reject(new DOMException('Denied', 'NotAllowedError'))
    } })
  })
  await page.goto('/')
  const y = await dock(page)
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('button', { name: '取消启动', exact: true })).toBeVisible()
  expect(await dock(page)).toBe(y)
  await page.screenshot({ path: `${screenshots}/tuner-requesting-320x568.png` })
  await page.getByRole('button', { name: '取消启动', exact: true }).click()
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('麦克风权限')
  await expect(page.getByRole('button', { name: '重试麦克风', exact: true })).toBeVisible()
  expect(await dock(page)).toBe(y)
  const error = (await page.getByRole('alert').boundingBox())!
  expect(error.y + error.height).toBeLessThanOrEqual(y)
  await page.screenshot({ path: `${screenshots}/tuner-error-320x568.png` })
})

declare global { interface Window { shortScreenMic: { gain: GainNode; oscillator: OscillatorNode } } }
async function syntheticMic(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const context = new AudioContext(); await context.resume()
      const oscillator = context.createOscillator(); oscillator.frequency.value = 110
      const gain = context.createGain(); gain.gain.value = 0
      const destination = context.createMediaStreamDestination()
      oscillator.connect(gain).connect(destination); oscillator.start()
      window.shortScreenMic = { gain, oscillator }
      return destination.stream
    } })
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'guitar-learn.records.v1') throw new DOMException('Full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
}

test('短屏逐弦等待、错音、有效结果和未保存结果均保持同位可操作', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await syntheticMic(page)
  await page.goto('/')
  await page.getByRole('button', { name: '检测', exact: true }).click()
  const y = await dock(page)
  await page.getByRole('button', { name: '开始逐弦检测', exact: true }).click()
  await expect(page.getByRole('heading', { name: '等待弹奏／请单独重弹', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '下一弦', exact: true })).toBeDisabled()
  expect(await dock(page)).toBe(y)
  await page.screenshot({ path: `${screenshots}/practice-waiting-320x568.png` })
  await page.evaluate(() => { window.shortScreenMic.oscillator.frequency.value = 116.5409; window.shortScreenMic.gain.gain.value = .2 })
  await expect(page.getByRole('heading', { name: '音高不符', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '下一弦', exact: true })).toBeEnabled()
  expect(await dock(page)).toBe(y)
  await page.screenshot({ path: `${screenshots}/practice-wrong-320x568.png` })
  await page.getByRole('button', { name: '重测本弦', exact: true }).click()
  for (const [i, frequency] of [110, 164.813778, 220, 261.625565, 329.627557].entries()) {
    await page.evaluate(value => { window.shortScreenMic.oscillator.frequency.value = value }, frequency)
    await expect(page.getByRole('heading', { name: '音高符合目标', exact: true })).toBeVisible()
    expect(await dock(page)).toBe(y)
    if (i === 0) await page.screenshot({ path: `${screenshots}/practice-correct-320x568.png` })
    if (i < 4) await page.getByRole('button', { name: '下一弦', exact: true }).click()
  }
  await page.getByRole('button', { name: '完成并保存', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('本轮未保存')
  expect(await dock(page)).toBe(y)
  const failure = (await page.getByRole('alert').boundingBox())!
  expect(failure.y + failure.height).toBeLessThanOrEqual(y)
  await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出本次结果', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('guitar-learn-result.json')
  await page.screenshot({ path: `${screenshots}/practice-unsaved-320x568.png` })
})
