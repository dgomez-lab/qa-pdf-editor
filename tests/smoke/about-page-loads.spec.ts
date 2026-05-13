import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingAboutPath } from '../helpers/siteContext'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — /about', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/about carga', { tag: ['@PDFEDITOR_SMOKE_ABOUT'] }, async ({ page }) => {
    await gotoMarketingPath(page, marketingAboutPath(), { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
