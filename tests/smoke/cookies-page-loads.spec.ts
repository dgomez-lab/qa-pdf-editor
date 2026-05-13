import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — /cookies', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/cookies carga', { tag: ['@PDFEDITOR_SMOKE_COOKIES'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/cookies', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
