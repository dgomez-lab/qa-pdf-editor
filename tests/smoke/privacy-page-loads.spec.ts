import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — /privacy', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/privacy carga', { tag: ['@PDFEDITOR_SMOKE_PRIVACY'] }, async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
