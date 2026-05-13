import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — LP pdf to word', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/lp/pdf-to-word carga', { tag: ['@PDFEDITOR_SMOKE_LP_PDF_TO_WORD'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/lp/pdf-to-word', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
