import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — /contact', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/contact carga (sin enviar formulario)', { tag: ['@PDFEDITOR_SMOKE_CONTACT'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/contact', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
