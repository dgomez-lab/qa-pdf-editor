import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — /about', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/about carga', { tag: ['@PDFEDITOR_SMOKE_ABOUT'] }, async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
