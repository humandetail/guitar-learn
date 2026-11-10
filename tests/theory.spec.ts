import { test, expect } from '@playwright/test'

test('从调音课阅读乐理，错题与跳过不阻断课程，复习通过并刷新保存', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '3. 第一次调音', exact: true }).click()
  await page.getByRole('button', { name: '乐理 · 音名与标准调弦', exact: true }).click()
  await expect(page.getByRole('heading', { name: '音名与标准调弦', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '标记已阅读', exact: true }).click()
  await page.getByRole('button', { name: 'A · 第 6 弦空弦是 A', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('再想一想')
  await expect(page.getByRole('status')).toContainText('E2')
  await page.getByRole('button', { name: '跳过本题', exact: true }).click()
  await page.getByRole('button', { name: '返回原课程', exact: true }).click()
  await expect(page.getByRole('heading', { name: '先选对弦，再开始听音', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByRole('heading', { name: '小幅调整，拨一下再看一下', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '课程目录', exact: true }).click()
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await page.getByRole('button', { name: '音名与标准调弦 · 已阅读', exact: true }).click()
  await page.getByRole('button', { name: 'B · 第 6 弦空弦是 E', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('回答正确')
  await expect(page.getByText('状态：练习通过', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await expect(page.getByRole('button', { name: '音名与标准调弦 · 练习通过', exact: true })).toBeVisible()
})

test('点选实际指板位置，辨认时值并控制合成示范', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await page.getByRole('button', { name: '半音、全音与指板 · 未阅读', exact: true }).click()
  await expect(page.getByRole('group', { name: '指板点选' })).toBeVisible()
  await page.getByRole('button', { name: '1 弦 1 品 · F4', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('回答正确')
  await page.getByRole('button', { name: '乐理目录', exact: true }).click()
  await page.getByRole('button', { name: '节奏、时值与休止 · 未阅读', exact: true }).click()
  await page.getByRole('button', { name: '播放合成示范', exact: true }).click()
  await expect(page.getByRole('button', { name: '停止示范', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '停止示范', exact: true }).click()
  await page.getByRole('button', { name: '弹一拍、停一拍、再弹并延长两拍', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('回答正确')
})

test('五线谱点选与旋律移调提供可复核解释', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await page.getByRole('button', { name: '五线谱与吉他读谱 · 未阅读', exact: true }).click()
  await expect(page.getByText(/实际发声比记谱低一个八度/)).toBeVisible()
  await expect(page.getByRole('group', { name: '谱面点选' })).toBeVisible()
  await page.getByRole('button', { name: 'B · 第一线上的 E4（实际 E3）', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('回答正确')
  await page.getByRole('button', { name: '乐理目录', exact: true }).click()
  await page.getByRole('button', { name: '常用调、调号与移调 · 未阅读', exact: true }).click()
  await page.getByRole('button', { name: 'G A B', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('音级仍是 1 2 3')
})

test('编配案例可比较两种合理方案，自查不等同练习通过', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await page.getByRole('button', { name: '为旋律配和弦与伴奏 · 未阅读', exact: true }).click()
  await expect(page.getByText(/方案 A：C–C/)).toBeVisible()
  await expect(page.getByText(/方案 B：Am–C/)).toBeVisible()
  await page.getByRole('button', { name: '播放方案 A', exact: true }).click()
  await expect(page.getByRole('button', { name: '停止案例示范', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '停止案例示范', exact: true }).click()
  await page.getByRole('button', { name: '播放方案 B', exact: true }).click()
  await page.getByRole('button', { name: '停止案例示范', exact: true }).click()
  await page.getByLabel('我已自行检查（不代表系统验证演奏能力）', { exact: true }).check()
  await expect(page.getByText('状态：未阅读', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '两种都可以，色彩与低音走向不同', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('回答正确')
  await expect(page.getByRole('status')).toContainText('并非唯一答案')
})

test('乐理保存失败可重试，损坏数据不覆盖原课程进度', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await page.getByRole('button', { name: '音名与标准调弦 · 未阅读', exact: true }).click()
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Object.assign(window, { restoreTheoryStorage: () => { Storage.prototype.setItem = original } })
    Storage.prototype.setItem = function (key, value) { if (key === 'guitar-learn.theory.v1') throw new DOMException('Full', 'QuotaExceededError'); original.call(this, key, value) }
  })
  await page.getByRole('button', { name: 'B · 第 6 弦空弦是 E', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('未保存')
  await page.getByRole('button', { name: '返回课程目录', exact: true }).click()
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('未保存')
  await expect(page.getByRole('button', { name: '音名与标准调弦 · 练习通过', exact: true })).toBeVisible()
  await page.evaluate(() => (window as unknown as { restoreTheoryStorage: () => void }).restoreTheoryStorage())
  await page.getByRole('button', { name: '重试保存乐理进度', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await expect(page.getByRole('button', { name: '音名与标准调弦 · 练习通过', exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('guitar-learn.theory.v1', '{broken-theory'))
  await page.reload()
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('原始数据未覆盖')
  await page.getByRole('button', { name: '音名与标准调弦 · 未阅读', exact: true }).click()
  await page.getByRole('button', { name: 'B · 第 6 弦空弦是 E', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('guitar-learn.theory.v1'))).toBe('{broken-theory')
  await page.getByRole('button', { name: '返回课程目录', exact: true }).click()
  await page.getByRole('button', { name: '开始第一课', exact: true }).click()
  await expect(page.getByRole('heading', { name: '先分清琴头、琴颈和琴身', exact: true })).toBeVisible()
})

test('三阶段知识点均可完成小任务并复习，短屏没有横向溢出', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  const cases = [
    ['半音、全音与指板', ['1 弦 1 品 · F4', '半音']],
    ['节奏、时值与休止', ['弹一拍、停一拍、再弹并延长两拍', '一拍']],
    ['C 大调、音级与基础音程', ['E', '大三度、小三度', '2 弦 1 品 · C4']],
    ['根音与大小三和弦', ['E G B', 'A 与 C']],
    ['五线谱与吉他读谱', ['B · 第一线上的 E4（实际 E3）', '四拍，一小节', '第 1 弦空弦，实际 E4']],
    ['常用调、调号与移调', ['G A B', 'B♭', 'F♯、C♯']],
    ['顺阶和弦与常见进行', ['G–Em–C–D', 'Dm：D F A']],
    ['七和弦与和弦功能', ['属到主', '七音分别为 B 与 B♭']],
    ['转位与低音安排', ['根音 C，最低音 E', '6 弦 0 品 · E2']],
    ['属和弦扩展与借用和弦', ['G', '同主音 C 小调', 'A，根音上方的九音']],
    ['为旋律配和弦与伴奏', ['两种都可以，色彩与低音走向不同', '连接 E 与 C 的经过音']],
  ] as const
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: '乐理学习与复习', exact: true }).click()
  for (const [title, answers] of cases) {
    await page.getByRole('button', { name: `${title} · 未阅读`, exact: true }).click()
    for (const [index, answer] of answers.entries()) {
      if (index) await page.getByRole('button', { name: '下一题', exact: true }).click()
      await page.getByRole('button', { name: answer, exact: true }).click()
      await expect(page.getByRole('status')).toContainText('回答正确')
      if (title === '五线谱与吉他读谱' && index === 0) await page.screenshot({ path: testInfo.outputPath('staff-320.png') })
      if (title === '半音、全音与指板' && index === 0) await page.screenshot({ path: testInfo.outputPath('fretboard-320.png') })
    }
    await expect(page.getByText('状态：练习通过', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: '乐理目录', exact: true }).click()
    await expect(page.getByRole('button', { name: `${title} · 练习通过`, exact: true })).toBeVisible()
  }
  await page.screenshot({ path: testInfo.outputPath('theory-320.png') })
})
