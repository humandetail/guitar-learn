import { test, expect, type Page } from '@playwright/test'
import { validateRecord, type StringResult } from '../src/model'

declare global { interface Window { practiceMic: { oscillator: OscillatorNode; stream: MediaStream } } }
async function installMic(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const context = new AudioContext(); await context.resume()
      const oscillator = context.createOscillator(); oscillator.frequency.value = 110
      const gain = context.createGain(); gain.gain.value = .2
      const destination = context.createMediaStreamDestination()
      oscillator.connect(gain).connect(destination); oscillator.start()
      window.practiceMic = { oscillator, stream: destination.stream }
      return destination.stream
    } })
  })
}
async function completeAm(page: Page) {
  await page.getByRole('button', { name: '检测', exact: true }).click()
  await page.getByRole('button', { name: '开始逐弦检测', exact: true }).click()
  for (const [i, frequency] of [110, 164.813778, 220, 261.625565, 329.627557].entries()) {
    if (i > 0) await page.evaluate(frequency => { window.practiceMic.oscillator.frequency.value = frequency }, frequency)
    await expect(page.getByRole('heading', { name: '音高符合目标', exact: true })).toBeVisible({ timeout: 8000 })
    if (i < 4) await page.getByRole('button', { name: '下一弦', exact: true }).click()
  }
  await page.getByRole('button', { name: '完成并保存', exact: true }).click()
}

test('完成Am手动逐弦推进后保存一次，可查看详情并删除', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true }) })
  await installMic(page)
  await page.goto('/')
  await completeAm(page)
  await expect(page.getByText('本轮已保存', { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => window.practiceMic.stream.getTracks()[0].readyState)).toBe('ended')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '练习记录', exact: true }).click()
  await page.getByRole('button', { name: /Am.*5\/5/ }).click()
  await expect(page.getByRole('heading', { name: '练习详情', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: '练习记录管理' }).getByText('A2 · 音高符合目标 ✓', { exact: false })).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '删除单条记录', exact: true }).click()
  await expect(page.getByText('还没有练习记录。', { exact: false })).toBeVisible()
})

test('检测中锁定基准，切换调音放弃本轮，无效声音不允许推进', async ({ page }) => {
  await installMic(page)
  await page.goto('/')
  await page.getByRole('button', { name: '检测', exact: true }).click()
  await page.getByRole('button', { name: '开始逐弦检测', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: '基准音 A4', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '调音', exact: true }).click()
  expect(await page.evaluate(() => window.practiceMic.stream.getTracks()[0].readyState)).toBe('ended')
  await page.getByRole('button', { name: '检测', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('本轮未保存')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '练习记录', exact: true }).click()
  await expect(page.getByText('还没有练习记录。', { exact: false })).toBeVisible()
})

test('保存失败保留结果，可导出本次结果并在清理后重试', async ({ page }) => {
  await installMic(page)
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'guitar-learn.records.v1' && document.documentElement.dataset.failSaving !== 'off') throw new DOMException('Quota', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.goto('/')
  await completeAm(page)
  await expect(page.getByRole('alert')).toContainText('本轮未保存')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出本次结果', exact: true }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('guitar-learn-result.json')
  await page.getByRole('button', { name: '查看并清理旧记录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '练习记录', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.getByText('本轮未保存，当前结果仍保留', { exact: true })).toBeVisible()
  await page.evaluate(() => { document.documentElement.dataset.failSaving = 'off' })
  await page.getByRole('button', { name: '重试保存', exact: true }).click()
  await expect(page.getByText('本轮已保存', { exact: true }).first()).toBeVisible()
})

const recordFixture = {
  id: 'fixture-am', practicedAt: '2026-10-25T10:00:00.000Z', reference: 440,
  chord: { id: 'builtin-Am', name: 'Am', frets: [null, 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null], builtin: true },
  results: [
    { string: 6, targetMidi: null, note: null, frequency: null, cents: null, correct: null },
    ...([['A2', 45, 110], ['E3', 52, 164.813778456435], ['A3', 57, 220], ['C4', 60, 261.625565300599], ['E4', 64, 329.62755691287]] as const).map(([note, targetMidi, frequency], i) => ({ string: 5 - i, targetMidi, note, frequency, cents: 0, correct: true })),
  ],
}

test('独立记录文件恢复去重，冲突整份拒绝且不新增和弦', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '数据管理', exact: true }).click()
  const upload = async (records: unknown[]) => {
    await page.getByLabel('恢复记录文件', { exact: true }).setInputFiles({ name: 'records.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ type: 'guitar-learn-records', version: 1, records })) })
  }
  await upload([recordFixture])
  await expect(page.getByRole('status')).toContainText('新增 1 条记录')
  await upload([recordFixture])
  await expect(page.getByRole('status')).toContainText('新增 0 条记录')
  await upload([{ ...recordFixture, practicedAt: '2026-10-25T10:01:00.000Z' }])
  await expect(page.getByRole('alert')).toContainText('内容冲突')
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await page.getByRole('button', { name: '练习记录', exact: true }).click()
  await expect(page.getByRole('button', { name: /Am.*5\/5/ })).toHaveCount(1)
  await page.getByRole('button', { name: '和弦', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Am', exact: true })).toHaveCount(1)
})


test('设置进入管理后，仍可返回原练习；损坏存档不会被新恢复覆盖', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('guitar-learn.records.v1', '{broken-original'))
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('禁止覆盖')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '数据管理', exact: true }).click()
  await page.getByLabel('恢复记录文件', { exact: true }).setInputFiles({ name: 'records.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ type: 'guitar-learn-records', version: 1, records: [recordFixture] })) })
  await expect(page.getByText('整份未保存：', { exact: false })).toContainText('保护原始内容')
  expect(await page.evaluate(() => localStorage.getItem('guitar-learn.records.v1'))).toBe('{broken-original')
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await page.getByRole('button', { name: '返回练习', exact: true }).click()
  await expect(page.getByRole('button', { name: '学习', exact: true })).toHaveAttribute('aria-current', 'page')
})


test('麦克风暂停click，结束后只允许显式恢复，关闭声音不能被恢复按钮绕过', async ({ page }) => {
  await installMic(page)
  await page.goto('/')
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await page.getByRole('button', { name: '开始节拍', exact: true }).click()
  await page.getByRole('button', { name: '调音', exact: true }).click()
  await page.getByRole('button', { name: '开始调音', exact: true }).click()
  await expect(page.getByRole('button', { name: '停止调音', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '节拍', exact: true }).click()
  await expect(page.getByText('麦克风检测已结束，请手动恢复节拍器声音。', { exact: true })).toBeVisible()
  await page.getByLabel('播放 click 声音').uncheck()
  await expect(page.getByRole('button', { name: '恢复节拍器声音', exact: true })).toBeDisabled()
  await page.getByLabel('播放 click 声音').check()
  await page.getByRole('button', { name: '恢复节拍器声音', exact: true }).click()
  await expect(page.getByRole('button', { name: '恢复节拍器声音', exact: true })).toHaveCount(0)
})

test('从和弦库开始C练习时不再显示上一轮Am完成面板', async ({ page }) => {
  await installMic(page)
  await page.goto('/')
  await completeAm(page)
  await page.getByRole('button', { name: '和弦', exact: true }).click()
  await page.getByRole('button', { name: 'C', exact: true }).click()
  await page.getByRole('button', { name: '练习这个和弦', exact: true }).click()
  await expect(page.getByLabel('目标和弦', { exact: true })).toHaveValue('builtin-C')
  await expect(page.getByRole('button', { name: '开始逐弦检测', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '本轮结果 · Am', exact: true })).toHaveCount(0)
})

test('恢复文件读取期间禁用并行写入，离开管理页不提交迟到文件', async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.text
    File.prototype.text = async function () {
      await new Promise(resolve => setTimeout(resolve, 400))
      return original.call(this)
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '数据管理', exact: true }).click()
  const input = page.getByLabel('恢复记录文件', { exact: true })
  const file = (record: unknown) => ({ name: 'delayed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ type: 'guitar-learn-records', version: 1, records: [record] })) })
  await input.setInputFiles(file(recordFixture))
  await expect(input).toBeDisabled()
  await expect(page.getByLabel('导入和弦文件', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '清空练习记录', exact: true })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('新增 1 条记录')
  await input.setInputFiles(file({ ...recordFixture, id: 'late-new-record' }))
  await expect(input).toBeDisabled()
  await page.getByRole('button', { name: '调音', exact: true }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '练习记录', exact: true }).click()
  await expect(page.getByRole('button', { name: /Am.*5\/5/ })).toHaveCount(1)
})


test('正负20音分的记录判定包含边界，不受浮点换算微差影响', () => {
  for (const cents of [-20, 20]) {
    const results: StringResult[] = structuredClone(recordFixture.results)
    results[1] = { string: 5, targetMidi: 45, note: 'A2', frequency: 110 * 2 ** (cents / 1200), cents, correct: true }
    expect(() => validateRecord({ ...recordFixture, results })).not.toThrow()
  }
})
