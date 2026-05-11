import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — /cookies', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/cookies carga', { tag: ['@PDFEDITOR_SMOKE_COOKIES'] }, async ({ page }) => {
    await page.goto('/cookies', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
