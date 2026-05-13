import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — /privacy', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/privacy carga', { tag: ['@PDFEDITOR_SMOKE_PRIVACY'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/privacy', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
