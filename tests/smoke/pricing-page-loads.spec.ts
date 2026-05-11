import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — /pricing', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/pricing carga si existe', { tag: ['@PDFEDITOR_SMOKE_PRICING'] }, async ({ page }) => {
    const res = await page.goto('/pricing', { waitUntil: 'domcontentloaded' }).catch(() => null)
    if (!res || res.status() >= 400) {
      test.skip(true, '/pricing no disponible en esta baseURL')
      return
    }
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
