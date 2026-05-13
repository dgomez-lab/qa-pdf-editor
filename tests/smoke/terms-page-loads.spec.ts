import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — términos', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/terms-and-conditions carga', { tag: ['@PDFEDITOR_SMOKE_TERMS'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/terms-and-conditions', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
