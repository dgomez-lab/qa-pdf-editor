import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — /faqs', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/faqs carga y muestra main', { tag: ['@PDFEDITOR_SMOKE_FAQS'] }, async ({ page }) => {
    await page.goto('/faqs', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
