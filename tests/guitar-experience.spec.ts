import { expect, test, type Page } from '@playwright/test'

declare global {
  interface Window {
    experienceNotes: { frequency: number; time: number }[]
    experienceAudioAudit: { frequencies: number[]; manualStops: number }
    experienceUnlockAudit: { releases: (() => void)[]; starts: number }
  }
}

async function openExperience(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '吉他体验馆', exact: true }).click()
}

test('从学习首页拨标准空弦并返回课程目录', async ({ page }) => {
  await openExperience(page)
  await expect(page.getByRole('heading', { name: '吉他体验馆' })).toBeVisible()
  const strings = page.getByRole('group', { name: '拨弦' })
  await expect(strings.getByRole('button')).toHaveCount(6)
  await strings.getByRole('button', { name: '拨第 6 弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 6 弦 · 空弦 · E2')
  await strings.getByRole('button', { name: '拨第 1 弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 空弦 · E4')
  await page.getByRole('button', { name: '返回学习' }).click()
  await expect(page.getByRole('heading', { name: '从零开始学' })).toBeVisible()
})

test('从课内试弹前两品，返回原步骤后可继续学', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /拿稳琴，认清弦与品位/ }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '试着拨空弦' }).click()
  await expect(page.getByRole('heading', { name: '空弦' })).toBeVisible()
  await page.getByRole('button', { name: '拨第 1 弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 空弦 · E4')
  await page.getByRole('button', { name: '返回课程' }).click()
  await expect(page.getByRole('heading', { name: '从最粗的第 6 弦开始认' })).toBeVisible()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '试着按品位' }).click()
  await page.getByRole('button', { name: '第 1 弦第 1 品' }).click()
  await page.getByRole('button', { name: '拨第 1 弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 第 1 品 · F4')
  await page.getByRole('button', { name: '第 1 弦第 2 品' }).click()
  await page.getByRole('button', { name: '拨第 1 弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 第 2 品 · F♯4')
  await page.getByRole('button', { name: '真琴提示' }).click()
  await page.getByRole('button', { name: '练习弹清单音' }).click()
  await page.getByRole('button', { name: '返回吉他体验馆' }).click()
  await page.getByRole('button', { name: '返回课程' }).click()
  await expect(page.getByRole('heading', { name: '找到第一品和第二品' })).toBeVisible()
})

test('和弦指法决定扫弦和键盘发声，恢复空弦后可继续拨弦', async ({ page }) => {
  await openExperience(page)
  await page.getByRole('button', { name: '选择 C 和弦' }).click()
  await expect(page.getByRole('img', { name: 'C 指法图' })).toBeVisible()
  await page.getByRole('button', { name: '向上扫弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toContainText('1 → 2 → 3 → 4 → 5 弦')
  await page.keyboard.press('6')
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 6 弦 · 不弹')
  await page.getByRole('button', { name: '恢复空弦' }).click()
  await page.keyboard.press('6')
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 6 弦 · 空弦 · E2')
})

test('触屏快速划过六根弦，按跨弦顺序调度每个空弦音', async ({ page }) => {
  await page.addInitScript(() => {
    const notes: { frequency: number; time: number }[] = []
    Object.assign(window, { experienceNotes: notes })
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (time) {
      notes.push({ frequency: this.frequency.value, time: time ?? 0 })
      start.call(this, time)
    }
  })
  await page.setViewportSize({ width: 320, height: 568 })
  await openExperience(page)
  const pad = page.getByRole('img', { name: '扫弦区，横划琴弦' })
  await pad.scrollIntoViewIfNeeded()
  const box = (await pad.boundingBox())!
  const client = await page.context().newCDPSession(page)
  const y = box.y + box.height / 2
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 1, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width / 2, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width - 1, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toContainText('3 → 2 → 1 弦')
  const actual = await page.evaluate(() => window.experienceNotes)
  expect(actual.map(note => Math.round(note.frequency))).toEqual([82, 110, 147, 196, 247, 330])
  for (let index = 1; index < actual.length; index++) expect(actual[index].time).toBeGreaterThan(actual[index - 1].time)
})

test('试听可停止，从认琴进入真琴提示后可打开调音器再返回', async ({ page }) => {
  await openExperience(page)
  await page.getByRole('button', { name: '听一听' }).click()
  await page.getByRole('button', { name: '播放扫弦示范' }).click()
  await expect(page.getByRole('status', { name: '试听状态' })).toHaveText('正在播放扫弦示范')
  await page.getByRole('button', { name: '停止扫弦示范' }).click()
  await expect(page.getByRole('status', { name: '试听状态' })).toHaveText('试听已停止')
  await page.getByRole('button', { name: '认识它' }).click()
  await page.getByRole('button', { name: '认识音孔' }).click()
  await expect(page.getByText('原声吉他面板上的开口，常在琴弦下方。')).toBeVisible()
  await page.getByRole('button', { name: '真琴提示' }).click()
  await page.getByRole('button', { name: '打开调音器' }).click()
  await expect(page.getByRole('region', { name: '调音器' })).toBeVisible()
  await page.getByRole('button', { name: '返回吉他体验馆' }).click()
  await expect(page.getByRole('heading', { name: '拿真琴时怎么练' })).toBeVisible()
})

test('第一关可修正错弦和错品，刷新后保留通过结果', async ({ page }) => {
  await openExperience(page)
  await page.getByRole('button', { name: '闯关学' }).click()
  await page.getByRole('button', { name: '第一关 · 空弦与品位' }).click()
  await page.getByRole('button', { name: '拨第 5 弦' }).click()
  await expect(page.getByRole('status', { name: '关卡反馈' })).toContainText('请拨第 6 弦')
  for (const string of [6, 5, 4, 3, 2, 1]) await page.getByRole('button', { name: `拨第 ${string} 弦` }).click()
  await page.getByRole('button', { name: '拨第 1 弦' }).click()
  await expect(page.getByRole('status', { name: '关卡反馈' })).toContainText('第 1 品')
  for (const fret of [1, 2]) {
    await page.getByRole('button', { name: `第 1 弦第 ${fret} 品` }).click()
    await page.getByRole('button', { name: '拨第 1 弦' }).click()
  }
  await expect(page.getByRole('status', { name: '关卡反馈' })).toContainText('本关通过')
  await openExperience(page)
  await page.getByRole('button', { name: '闯关学' }).click()
  await expect(page.getByRole('button', { name: '第一关 · 空弦与品位' })).toContainText('已通过')
})

test('3D 加载不可用时仍可按品和拨弦', async ({ page }) => {
  await page.route('**/src/GuitarScene.tsx*', route => route.abort())
  await openExperience(page)
  await page.getByRole('button', { name: '第 1 弦第 2 品' }).click()
  await page.getByRole('button', { name: '3D 展台' }).click()
  await expect(page.getByText('3D 展台暂时无法加载，可以继续用 2D 弹奏。')).toBeVisible()
  await page.getByRole('button', { name: '拨第 1 弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 第 2 品 · F♯4')
})

test('从预备拍进入 4/4 跟拍，两小节扫弦和换和弦后通过', async ({ page }) => {
  await openExperience(page)
  await page.getByRole('button', { name: '闯关学' }).click()
  await page.getByRole('button', { name: '第二关 · 跟拍扫弦' }).click()
  await page.getByRole('combobox', { name: '跟拍速度' }).selectOption('50')
  await page.getByRole('button', { name: '跟拍选 G 和弦' }).click()
  await page.getByRole('button', { name: '开始跟拍' }).click()
  const beat = page.getByRole('status', { name: '当前节拍' })
  const downstroke = page.getByRole('button', { name: '扫一下' })
  const waitForBeat = (text: string) => expect.poll(() => beat.textContent(), { intervals: [20], timeout: 6500 }).toBe(text)
  await downstroke.scrollIntoViewIfNeeded()
  await expect(beat).toContainText('预备')
  for (const [bar, chord] of [[1, 'G'], [2, 'C']] as const) {
    if (bar === 2) {
      await waitForBeat('第 1 小节 · 第 4 拍 · G · 等')
      await page.getByRole('button', { name: '跟拍选 C 和弦' }).click()
      await downstroke.scrollIntoViewIfNeeded()
    }
    for (const step of [1, 3]) {
      await waitForBeat(`第 ${bar} 小节 · 第 ${step} 拍 · ${chord} · 扫`)
      await downstroke.click()
    }
  }
  await expect(page.getByRole('status', { name: '关卡反馈' })).toContainText('本关通过')
  await expect(page.getByRole('button', { name: '第二关 · 跟拍扫弦' })).toContainText('已通过')
})

test('从《小星星》两小节练到整首并保存通过', async ({ page }) => {
  test.setTimeout(55000)
  await openExperience(page)
  await page.getByRole('button', { name: '闯关学' }).click()
  await page.getByRole('button', { name: '第三关 · 小星星' }).click()
  await page.getByText('查看六线谱与试听', { exact: true }).click()
  await expect(page.getByRole('heading', { name: '《小星星》第 1–2 小节' })).toBeVisible()
  await page.getByText('查看六线谱与试听', { exact: true }).click()

  const notes = { g: [3, 0], d: [2, 3], e: [1, 0], c: [2, 1], b: [2, 0], a: [3, 2] }
  const opening = 'ggddeed'
  const ending = 'ccbbaag'
  const middle = 'ddccbba'
  async function play(phrase: string) {
    for (const pitch of phrase) {
      const [string, fret] = notes[pitch as keyof typeof notes]
      const position = page.getByRole('button', { name: fret ? `第 ${string} 弦第 ${fret} 品` : `第 ${string} 弦空弦`, exact: true })
      if (await position.getAttribute('aria-pressed') !== 'true') await position.click()
      await page.getByRole('button', { name: `拨第 ${string} 弦` }).click()
    }
  }
  await play(opening)
  await expect(page.getByRole('status', { name: '关卡反馈' })).toContainText('两小节练完了')
  await page.getByRole('button', { name: '挑战整首' }).click()
  await play(opening + ending + middle + middle + opening + ending)
  await expect(page.getByRole('status', { name: '关卡反馈' })).toContainText('本关通过')
  await expect(page.getByRole('button', { name: '第三关 · 小星星' })).toContainText('已通过')
})

test('3D 认琴与练习可以切回 2D，保留品位和关卡进度', async ({ page }, testInfo) => {
  await openExperience(page)
  await page.getByRole('button', { name: '认识它' }).click()
  await page.getByRole('button', { name: '3D 展台' }).click()
  const canvas = page.getByRole('img', { name: '木吉他 3D 琴面' })
  await expect(canvas).toBeVisible()
  await page.getByRole('button', { name: '右转' }).click()
  await page.getByRole('button', { name: '放大' }).click()
  await page.getByRole('button', { name: '复位' }).click()
  await canvas.screenshot({ path: testInfo.outputPath('guitar-3d-anatomy.png') })
  await page.getByRole('button', { name: '认识音孔' }).click()
  await expect(page.getByText('原声吉他面板上的开口，常在琴弦下方。')).toBeVisible()
  await page.getByRole('button', { name: '弹一弹' }).click()
  await canvas.click({ position: { x: 180, y: 80 } })
  await expect(page.getByRole('button', { name: '第 1 弦第 1 品' })).toHaveAttribute('aria-pressed', 'true')
  await canvas.click({ position: { x: 196, y: 250 } })
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 第 1 品 · F4')
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 157, box.y + 250)
  await page.mouse.down()
  await page.mouse.move(box.x + 203, box.y + 250)
  await page.mouse.up()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('扫弦 · 6 → 5 → 4 → 3 → 2 → 1 弦')
  await page.getByRole('button', { name: '闯关学' }).click()
  await page.getByRole('button', { name: '第一关 · 空弦与品位' }).click()
  await page.getByRole('button', { name: '拨第 6 弦' }).click()
  await page.getByRole('button', { name: '第 1 弦第 2 品' }).click()
  await page.getByRole('button', { name: '2D 琴面' }).click()
  await expect(page.getByRole('status', { name: '当前目标' })).toHaveText('2 / 8 · 第 5 弦空弦')
  await expect(page.getByRole('button', { name: '第 1 弦第 2 品' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '3D 展台' }).click()
  await expect(canvas).toBeVisible()
  await expect(page.getByRole('status', { name: '当前目标' })).toHaveText('2 / 8 · 第 5 弦空弦')
})

test('左手镜像与基准音影响琴面和发声，后台时停止声音', async ({ page }) => {
  await page.addInitScript(() => {
    const audio = { frequencies: [] as number[], manualStops: 0 }
    Object.assign(window, { experienceAudioAudit: audio })
    const start = OscillatorNode.prototype.start
    const stop = OscillatorNode.prototype.stop
    OscillatorNode.prototype.start = function (time) { audio.frequencies.push(this.frequency.value); start.call(this, time) }
    OscillatorNode.prototype.stop = function (time) { if (time === undefined) audio.manualStops++; stop.call(this, time) }
  })
  await page.goto('/')
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('spinbutton', { name: '基准音 A4' }).fill('448')
  await page.getByRole('checkbox', { name: '左手镜像' }).check()
  await page.getByRole('button', { name: '返回练习' }).click()
  await page.getByRole('button', { name: '吉他体验馆', exact: true }).click()
  const strings = page.getByRole('group', { name: '拨弦' }).getByRole('button')
  await expect(strings.first()).toHaveAccessibleName('拨第 1 弦')
  await page.getByRole('button', { name: '第 1 弦第 1 品' }).click()
  await strings.first().click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 第 1 品 · F4')
  const audit = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    return window.experienceAudioAudit
  })
  expect(audit.frequencies[0]).toBeCloseTo(355.58, 1)
  expect(audit.manualStops).toBe(1)
})

test('等待音频解锁时切走，旧请求不会出声，返回后可再次拨弦', async ({ page }) => {
  await page.addInitScript(() => {
    const audit = { releases: [] as (() => void)[], starts: 0 }
    Object.assign(window, { experienceUnlockAudit: audit })
    const start = OscillatorNode.prototype.start
    const Base = window.AudioContext
    window.AudioContext = class extends Base {
      private unlocked = false
      override get state(): AudioContextState { return this.unlocked ? super.state : 'suspended' }
      override resume() {
        if (!audit.releases.length) return new Promise<void>(resolve => audit.releases.push(resolve))
        this.unlocked = true
        return super.resume()
      }
    }
    OscillatorNode.prototype.start = function (time) { audit.starts++; start.call(this, time) }
  })
  await openExperience(page)
  await page.getByRole('button', { name: '拨第 6 弦' }).click()
  const navigation = page.getByRole('navigation', { name: '练习模块' })
  await navigation.getByRole('button', { name: '和弦' }).click()
  expect(await page.evaluate(() => window.experienceUnlockAudit.starts)).toBe(0)
  await navigation.getByRole('button', { name: '学习' }).click()
  await page.getByRole('button', { name: '拨第 1 弦' }).click()
  await expect(page.getByRole('status', { name: '弹奏反馈' })).toHaveText('第 1 弦 · 空弦 · E4')
  const starts = await page.evaluate(async () => {
    const audit = window.experienceUnlockAudit
    audit.releases[0]()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    return audit.starts
  })
  expect(starts).toBe(1)
})
