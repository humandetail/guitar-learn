import { test, expect } from '@playwright/test'

test('首次进入不申请麦克风，用户主动启动后拒绝权限可重试', async ({ page }) => {
  await page.addInitScript(() => {
    let requests = 0
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      requests++
      document.documentElement.dataset.microphoneRequests = String(requests)
      throw new DOMException('Permission denied', 'NotAllowedError')
    } })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '调音', exact: true })).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-microphone-requests')
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('麦克风权限')
  await page.getByRole('button', { name: '重试麦克风', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-microphone-requests', '2')
})

// Replace only the browser microphone boundary. Audio analysis still uses the real
// Web Audio graph and the published pitch detector; this is NOT real-device evidence.
async function installSyntheticMic(page: import('@playwright/test').Page, delay = 0) {
  await page.addInitScript(({ delay }) => {
    const state = { stream: null as MediaStream | null, context: null as AudioContext | null, gain: null as GainNode | null }
    Object.assign(window, { syntheticMic: state })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay))
      const context = new AudioContext()
      await context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const destination = context.createMediaStreamDestination()
      oscillator.frequency.value = 82.4069
      gain.gain.value = .2
      oscillator.connect(gain).connect(destination)
      oscillator.start()
      state.context = context
      state.gain = gain
      state.stream = destination.stream
      return destination.stream
    } })
  }, { delay })
}

declare global {
  interface Window {
    syntheticMic: { stream: MediaStream | null; context: AudioContext | null; gain: GainNode | null }
  }
}

test('合成E2经真实检测库显示稳定结果，静音后清除旧读数，停止释放输入', async ({ page }) => {
  await installSyntheticMic(page)
  await page.goto('/')
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('heading', { name: '已调准', exact: true })).toBeVisible()
  await expect(page.getByLabel('实际音高', { exact: true })).toHaveText('E2')
  await page.evaluate(() => { window.syntheticMic.gain!.gain.value = 0 })
  await expect(page.getByRole('heading', { name: '等待弹奏', exact: true })).toBeVisible()
  await expect(page.getByLabel('实际音高', { exact: true })).toHaveText('—')
  await page.getByRole('button', { name: '停止调音', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.syntheticMic.stream!.getTracks()[0].readyState)).toBe('ended')
  await expect(page.getByRole('button', { name: '开始调音', exact: true })).toBeVisible()
})

test('取消授权等待后，迟到的麦克风输入立即释放且不重启', async ({ page }) => {
  await installSyntheticMic(page, 800)
  await page.goto('/')
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await page.getByRole('button', { name: '取消启动', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.syntheticMic.stream?.getTracks()[0].readyState)).toBe('ended')
  await expect(page.getByRole('button', { name: '开始调音', exact: true })).toBeVisible()
  await expect(page.getByLabel('实际音高', { exact: true })).toHaveText('—')
})

test('麦克风断开后显示原因、释放输入并提供重试', async ({ page }) => {
  await installSyntheticMic(page)
  await page.goto('/')
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('button', { name: '停止调音', exact: true })).toBeVisible()
  await page.evaluate(() => window.syntheticMic.stream!.getAudioTracks()[0].dispatchEvent(new Event('ended')))
  await expect(page.getByRole('alert')).toContainText('连接已中断')
  await expect(page.getByRole('button', { name: '重试麦克风', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.syntheticMic.stream!.getTracks()[0].readyState)).toBe('ended')
})

test('后台通知停止收音并释放，返回不自动恢复', async ({ page }) => {
  await installSyntheticMic(page)
  await page.goto('/')
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('button', { name: '停止调音', exact: true })).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('status')).toContainText('麦克风已释放')
  expect(await page.evaluate(() => window.syntheticMic.stream!.getTracks()[0].readyState)).toBe('ended')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('button', { name: '开始调音', exact: true })).toBeVisible()
})
