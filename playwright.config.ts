import { defineConfig } from '@playwright/test'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173'
const port = Number(new URL(baseURL).port) || 5173
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  use: { baseURL, channel: 'chrome', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: { command: `pnpm dev --port ${port} --strictPort`, url: baseURL, reuseExistingServer: !process.env.CI },
})
