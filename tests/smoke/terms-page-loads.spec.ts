import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — términos', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/terms-and-conditions carga', { tag: ['@PDFEDITOR_SMOKE_TERMS'] }, async ({ page }) => {
    await page.goto('/terms-and-conditions', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
