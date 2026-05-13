import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — /faqs', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/faqs carga y muestra main', { tag: ['@PDFEDITOR_SMOKE_FAQS'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/faqs', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
