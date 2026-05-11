import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — LP pdf to word', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/lp/pdf-to-word carga', { tag: ['@PDFEDITOR_SMOKE_LP_PDF_TO_WORD'] }, async ({ page }) => {
    await page.goto('/lp/pdf-to-word', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
