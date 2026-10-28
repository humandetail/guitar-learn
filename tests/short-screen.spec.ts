import { test, expect, type Locator, type Page } from '@playwright/test'

const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 640, height: 360 }]

async function visibleBox(locator: Locator, page: Page) {
  await expect(locator).toBeVisible()
  await locator.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)))
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
  return box!
}

async function actionsAboveNavigation(page: Page, reading: Locator) {
  const widths = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, available: document.documentElement.clientWidth }))
  expect(widths.actual, JSON.stringify(widths)).toBeLessThanOrEqual(widths.available)
  const actions = page.getByRole('region', { name: '当前页面操作', exact: true })
  const actionsBox = await visibleBox(actions, page)
  const navBox = await visibleBox(page.getByRole('navigation', { name: '练习模块' }), page)
  expect(actionsBox.y + actionsBox.height).toBeLessThanOrEqual(navBox.y)
  expect(await actions.getByRole('button').count()).toBeGreaterThan(0)
  const readingBox = await visibleBox(reading, page)
  expect(readingBox.y + readingBox.height).toBeLessThanOrEqual(actionsBox.y)
}

for (const viewport of viewports) {
  test(`${viewport.width}x${viewport.height} 六弦与各模块主操作保持首屏可用`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '调音', exact: true }).click()
    const strings = page.getByRole('region', { name: '选择目标弦' })
    const widths = await strings.evaluate(element => ({ documentWidth: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth, stringsWidth: element.scrollWidth, stringsClient: element.clientWidth }))
    expect.soft(widths.documentWidth, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport)
    expect.soft(widths.stringsWidth, JSON.stringify(widths)).toBeLessThanOrEqual(widths.stringsClient)
    const buttons = strings.getByRole('button')
    await expect(buttons).toHaveCount(6)
    for (const button of await buttons.all()) {
      const box = await visibleBox(button, page)
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    await actionsAboveNavigation(page, page.getByLabel('实际音高', { exact: true }))
    await actionsAboveNavigation(page, page.locator('.tuner-screen .feedback'))
    await page.screenshot({ path: testInfo.outputPath(`tuner-${viewport.width}x${viewport.height}.png`) })
    await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '节拍', exact: true }).click()
    await actionsAboveNavigation(page, page.getByRole('spinbutton', { name: 'BPM', exact: true }))
    await actionsAboveNavigation(page, page.getByRole('checkbox', { name: '播放 click 声音' }).locator('..'))
    await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '和弦', exact: true }).click()
    await actionsAboveNavigation(page, page.getByRole('group', { name: /指法图$/ }).first())
    await actionsAboveNavigation(page, page.locator('summary').filter({ hasText: '合成参考音' }))
    await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '检测', exact: true }).click()
    await actionsAboveNavigation(page, page.getByRole('region', { name: '逐弦检测进度' }))
  })
}

test('短屏节奏设置展开关闭后保留配置与启停入口', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/')
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '节拍', exact: true }).click()
  const trigger = page.getByRole('button', { name: /节奏设置/ })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '节奏设置', exact: true })
  await visibleBox(dialog, page)
  await dialog.getByRole('button', { name: '3 拍', exact: true }).click()
  await dialog.getByRole('button', { name: '八分', exact: true }).click()
  await dialog.getByRole('button', { name: '关闭节奏设置' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toContainText('3 拍')
  await expect(trigger).toContainText('八分')
  await expect(trigger).toBeFocused()
  await actionsAboveNavigation(page, page.getByRole('spinbutton', { name: 'BPM', exact: true }))
})

// Browser boundary proxy only: this does not open a native mobile keyboard.
test('visualViewport缩高代理让位导航并恢复BPM与主操作', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), { width: 320, height: 568, scale: 1, offsetTop: 0, offsetLeft: 0 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  })
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: '练习模块' })
  await navigation.getByRole('button', { name: '节拍', exact: true }).click()
  const bpm = page.getByRole('spinbutton', { name: 'BPM', exact: true })
  await bpm.focus()
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 300 })
    window.visualViewport!.dispatchEvent(new Event('resize'))
  })
  await expect(navigation).not.toBeVisible()
  const actions = page.getByRole('region', { name: '当前页面操作', exact: true })
  await expect.poll(async () => { const box = await actions.boundingBox(); return box!.y + box!.height }).toBeLessThanOrEqual(300)
  const bpmBox = await visibleBox(bpm, page)
  expect(bpmBox.y + bpmBox.height).toBeLessThanOrEqual(300)
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 568 })
    ;(document.activeElement as HTMLElement).blur()
    window.visualViewport!.dispatchEvent(new Event('resize'))
  })
  await expect(navigation).toBeVisible()
  await actionsAboveNavigation(page, bpm)
})

// Halved CSS viewport is a 200% logical reflow proxy, not OS text scaling.
test('200%逻辑reflow代理不横溢且核心按钮滚动可达', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 160, height: 284 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  try {
    await page.goto('/')
    for (const module of ['调音', '节拍', '和弦', '检测']) {
      const tab = page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: module, exact: true })
      await tab.scrollIntoViewIfNeeded()
      await tab.click()
      const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
      expect(widths[0], `${module}: ${widths}`).toBeLessThanOrEqual(widths[1])
      for (const button of await page.getByRole('button').all()) {
        await button.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
        await visibleBox(button, page)
      }
    }
  } finally { await context.close() }
})

test('短屏和弦管理返回保留当前练习目标', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/')
  await page.getByRole('navigation', { name: '练习模块' }).getByRole('button', { name: '和弦', exact: true }).click()
  await page.getByRole('button', { name: 'G', exact: true }).click()
  await page.getByRole('button', { name: '管理', exact: true }).click()
  await page.getByRole('button', { name: '返回练习', exact: true }).click()
  await expect(page.getByRole('button', { name: 'G', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await actionsAboveNavigation(page, page.getByRole('group', { name: 'G 指法图', exact: true }))
})
