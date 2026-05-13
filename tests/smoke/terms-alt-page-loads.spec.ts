import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

/** Ruta corta `/terms` (además de `/terms-and-conditions` en [terms-page-loads.spec.ts](./terms-page-loads.spec.ts)). */
test.describe('Smoke — /terms', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/terms carga', { tag: ['@PDFEDITOR_SMOKE_TERMS_ALT'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/terms', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
