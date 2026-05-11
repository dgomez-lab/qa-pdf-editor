import { defineConfig, devices } from '@playwright/test'
import { resolvePlaywrightBaseUrl } from './playwright/resolveBaseUrl'

const baseURL = resolvePlaywrightBaseUrl()
if (!process.env.BASE_URL?.trim()) {
  process.env.BASE_URL = baseURL
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 180_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      maxDiffPixels: 2500,
      animations: 'disabled',
      scale: 'css'
    }
  },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: process.env.PLAYWRIGHT_TRACE === '1' ? 'on' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 90_000,
    actionTimeout: 45_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
