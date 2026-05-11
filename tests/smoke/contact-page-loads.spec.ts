import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — /contact', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/contact carga (sin enviar formulario)', { tag: ['@PDFEDITOR_SMOKE_CONTACT'] }, async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
