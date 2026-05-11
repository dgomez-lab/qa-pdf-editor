import { test, expect } from '@playwright/test'
import { collectFormsPageAbsoluteHrefErrors } from '../helpers/seoAbsoluteHrefs'
import { collectPdfhintFormsPathLinkErrors } from '../helpers/pdfhintFormsSeo'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { hrefPolicyForSite, isPdfhintSite } from '../helpers/seoExpectations'

test.describe('SEO — /forms (paridad con SEO.feature)', { tag: ['@PDFEDITOR_SEO'] }, () => {
  test(
    'PDFEDITOR_SEO_FORMS_MOST_USED_ABSOLUTE_HREFS — grid de formularios',
    { tag: ['@PDFEDITOR_SEO_FORMS_MOST_USED_ABSOLUTE_HREFS'] },
    async ({ page }) => {
      await page.goto('/forms')
      await dismissCookiesIfPresent(page)
      if (isPdfhintSite()) {
        await expect(page.locator('main a[href*="/lp/1040-2021-form"]').first()).toBeVisible({ timeout: 60_000 })
        const errors = await collectPdfhintFormsPathLinkErrors(page)
        expect(errors, errors.join('\n')).toEqual([])
      } else {
        await expect(page.locator('a[data-id="Form 1040 2021"]').first()).toBeVisible()
        const errors = await collectFormsPageAbsoluteHrefErrors(page, {
          hrefPolicy: hrefPolicyForSite()
        })
        expect(errors, errors.join('\n')).toEqual([])
      }
    }
  )
})
