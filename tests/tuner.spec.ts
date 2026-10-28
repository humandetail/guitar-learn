import { test, expect } from '@playwright/test'
import { describePitch } from '../src/audio'

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
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
  await expect(page.getByRole('heading', { name: '调音', exact: true })).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-microphone-requests')
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('麦克风权限')
  await page.getByRole('button', { name: '重试麦克风', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-microphone-requests', '2')
})

// Replace only the browser microphone boundary. Audio analysis still uses the real
// Web Audio graph and the published pitch detector; this is NOT real-device evidence.
async function installSyntheticMic(page: import('@playwright/test').Page, delay = 0, frequency = 82.4069) {
  await page.addInitScript(({ delay, frequency }) => {
    const state = { stream: null as MediaStream | null, context: null as AudioContext | null, gain: null as GainNode | null }
    Object.assign(window, { syntheticMic: state })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay))
      const context = new AudioContext()
      await context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const destination = context.createMediaStreamDestination()
      oscillator.frequency.value = frequency
      gain.gain.value = .2
      oscillator.connect(gain).connect(destination)
      oscillator.start()
      state.context = context
      state.gain = gain
      state.stream = destination.stream
      return destination.stream
    } })
  }, { delay, frequency })
}

declare global {
  interface Window {
    syntheticMic: { stream: MediaStream | null; context: AudioContext | null; gain: GainNode | null }
  }
}

test('合成E2经真实检测库显示稳定结果，静音后清除旧读数，停止释放输入', async ({ page }) => {
  await installSyntheticMic(page)
  await page.goto('/')
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
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
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await page.getByRole('button', { name: '取消启动', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.syntheticMic.stream?.getTracks()[0].readyState)).toBe('ended')
  await expect(page.getByRole('button', { name: '开始调音', exact: true })).toBeVisible()
  await expect(page.getByLabel('实际音高', { exact: true })).toHaveText('—')
})

test('麦克风断开后显示原因、释放输入并提供重试', async ({ page }) => {
  await installSyntheticMic(page)
  await page.goto('/')
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
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
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
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


test('大偏差数值与刻度范围一致，不将超出范围读数截在50音分', async ({ page }) => {
  await installSyntheticMic(page, 0, 90)
  await page.goto('/')
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('heading', { name: '偏离目标较大', exact: true })).toBeVisible()
  await expect(page.getByLabel('音分参考刻度', { exact: true })).toContainText('+200')
})

test('前台采样间断不能冒充连续300毫秒稳定窗口', async ({ page }) => {
  // This checks the stability window, not the detector's ±5-cent tuning accuracy.
  // The published detector can return a stable E2 at +6 cents.
  await installSyntheticMic(page)
  await page.goto('/')
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByLabel('实际音高', { exact: true })).toHaveText('E2')
  await page.evaluate(() => {
    const begin = performance.now()
    while (performance.now() - begin < 450) { /* simulate an unrelated foreground long task */ }
  })
  await expect(page.getByRole('heading', { name: '等待弹奏', exact: true })).toBeVisible({ timeout: 1000 })
  await expect(page.getByLabel('实际音高', { exact: true })).toHaveText('E2')
})

test('六根目标弦可选择，换弦停止收音并清除旧结果', async ({ page }) => {
  await installSyntheticMic(page)
  await page.goto('/')
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
  await expect(page.getByRole('button', { name: '第 6 弦 E2', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('heading', { name: '已调准', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '第 1 弦 E4', exact: true }).click()
  await expect(page.getByRole('button', { name: '第 1 弦 E4', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('实际音高', { exact: true })).toHaveText('—')
  await expect(page.getByRole('button', { name: '开始调音', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.syntheticMic.stream!.getTracks()[0].readyState)).toBe('ended')
})

for (const [string, note, frequency] of [[6, 'E2', 82.4069], [5, 'A2', 110], [4, 'D3', 146.8324], [3, 'G3', 195.9977], [2, 'B3', 246.9417], [1, 'E4', 329.6276]] as const) {
  test(`合成标准第 ${string} 弦 ${note} 经指定库显示对应音名及小偏差`, async ({ page }) => {
    await installSyntheticMic(page, 0, frequency)
    await page.goto('/')
    await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
    await page.getByRole('button', { name: `第 ${string} 弦 ${note}`, exact: true }).click()
    await page.getByRole('button', { name: '开始调音', exact: true }).click()
    await expect(page.getByLabel('实际音高', { exact: true })).toHaveText(note)
    await expect.poll(async () => Math.abs(Number(await page.getByLabel('音分偏差', { exact: true }).textContent()))).toBeLessThanOrEqual(10)
  })
}

// The detector can alternate E2/F2 at A4=430 for a 440-based E2 oscillator:
// observed median 82.5–82.9 Hz crosses the nearest-note boundary and resets stability.
// This is a known library capability gap, not evidence that the calibration math fails.
for (const [reference, cents] of [[430, 39.8002], [450, -38.9058]] as const) {
  test(`基准 ${reference} Hz 下相同 E2 的公开换算结果方向正确`, () => {
    const reading = describePitch(82.4068892282175, reference, 40)
    expect(reading.note).toBe('E2')
    expect(reading.cents).toBeCloseTo(cents, 3)
  })
}


test('音分相对目标八度和所选基准计算，保留边界与大偏差', () => {
  expect(describePitch(107.5, 430, 45)).toEqual({ note: 'A2', cents: 0, frequency: 107.5 })
  expect(describePitch(450, 450, 69)).toEqual({ note: 'A4', cents: 0, frequency: 450 })
  expect(describePitch(220, 440, 45).cents).toBeCloseTo(1200, 8)
  expect(describePitch(110.3181512, 440, 45).cents).toBeCloseTo(5, 4)
  expect(describePitch(103.8261744, 440, 45).cents).toBeCloseTo(-100, 4)
})
