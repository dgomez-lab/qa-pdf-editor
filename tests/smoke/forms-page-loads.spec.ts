import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { isPdfhintSite } from '../helpers/seoExpectations'

test.describe('Smoke — /forms', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('/forms responde y muestra el grid de formularios', { tag: ['@PDFEDITOR_SMOKE_FORMS'] }, async ({ page }) => {
    await gotoMarketingPath(page, '/forms')
    await dismissCookiesIfPresent(page)
    if (isPdfhintSite()) {
      await expect(page.locator('main a[href*="/lp/1040-2021-form"]').first()).toBeVisible({ timeout: 60_000 })
    } else {
      await expect(page.locator('a[data-id="Form 1040 2021"]').first()).toBeVisible()
    }
  })
})
