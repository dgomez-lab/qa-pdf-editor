import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { marketingMainOrHero } from '../helpers/marketingPage'

test.describe('Smoke — /pricing', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/pricing carga si existe', { tag: ['@PDFEDITOR_SMOKE_PRICING'] }, async ({ page }) => {
    const res = await gotoMarketingPath(page, '/pricing', { waitUntil: 'domcontentloaded' }).catch(() => null)
    if (!res || res.status() >= 400) {
      test.skip(true, '/pricing no disponible en esta baseURL')
      return
    }
    await dismissCookiesIfPresent(page)
    await expect(marketingMainOrHero(page)).toBeVisible({ timeout: 60_000 })
  })
})
