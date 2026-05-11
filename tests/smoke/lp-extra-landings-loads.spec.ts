import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'

test.describe('Smoke — LP conversión extra', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/lp/pdf-to-jpg carga', { tag: ['@PDFEDITOR_SMOKE_LP_PDF_TO_JPG'] }, async ({ page }) => {
    await page.goto('/lp/pdf-to-jpg', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })

  test('/lp/excel-to-pdf carga', { tag: ['@PDFEDITOR_SMOKE_LP_EXCEL_TO_PDF'] }, async ({ page }) => {
    await page.goto('/lp/excel-to-pdf', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 })
  })
})
