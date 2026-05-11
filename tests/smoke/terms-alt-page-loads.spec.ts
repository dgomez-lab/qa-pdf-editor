import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

/** Ruta corta `/terms` (además de `/terms-and-conditions` en [terms-page-loads.spec.ts](./terms-page-loads.spec.ts)). */
test.describe('Smoke — /terms', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/terms carga', { tag: ['@PDFEDITOR_SMOKE_TERMS_ALT'] }, async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
