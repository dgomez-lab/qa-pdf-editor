import { test, expect } from '@playwright/test'
import {
  collectFooterAbsoluteHrefErrors,
  collectHeaderAbsoluteHrefErrors,
  collectLandingAbsoluteHrefErrors
} from '../helpers/seoAbsoluteHrefs'
import { collectPdfhintHeaderSeoErrors } from '../helpers/pdfhintHeaderSeo'
import {
  footerPathnamesForSite,
  footerRootSelectorForSite,
  headerLinkChecksForBaseUrl,
  hrefPolicyForSite,
  isPdfhintSite,
  landingPathnamesForSite
} from '../helpers/seoExpectations'
import { isMvpsMergedStage } from '../helpers/siteContext'
import { openHome } from '../helpers/navigation'

test.describe('SEO — Home (paridad con SEO.feature)', { tag: ['@PDFEDITOR_SEO'] }, () => {
  const policy = hrefPolicyForSite()

  test.beforeEach(async ({ page }) => {
    await openHome(page)
  })

  test(
    'PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS — cabecera y navegación',
    { tag: ['@PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS'] },
    async ({ page }) => {
      test.skip(isMvpsMergedStage(), 'Cabecera con data-id pdfhint no aplica en *.mvps.website (mergedpdf)')
      const errors = isPdfhintSite()
        ? await collectPdfhintHeaderSeoErrors(page)
        : await collectHeaderAbsoluteHrefErrors(page, headerLinkChecksForBaseUrl(), { hrefPolicy: policy })
      expect(errors, errors.join('\n')).toEqual([])
    }
  )

  test(
    'PDFEDITOR_SEO_HOME_LANDING_ABSOLUTE_HREFS — enlaces de herramientas',
    { tag: ['@PDFEDITOR_SEO_HOME_LANDING_ABSOLUTE_HREFS'] },
    async ({ page }) => {
      const errors = await collectLandingAbsoluteHrefErrors(page, landingPathnamesForSite(), {
        hrefPolicy: policy,
        contentRoot: 'auto'
      })
      expect(errors, errors.join('\n')).toEqual([])
    }
  )

  test(
    'PDFEDITOR_SEO_HOME_FOOTER_ABSOLUTE_HREFS — footer y columnas',
    { tag: ['@PDFEDITOR_SEO_HOME_FOOTER_ABSOLUTE_HREFS'] },
    async ({ page }) => {
      const errors = await collectFooterAbsoluteHrefErrors(page, footerPathnamesForSite(), {
        hrefPolicy: policy,
        footerSelector: footerRootSelectorForSite()
      })
      expect(errors, errors.join('\n')).toEqual([])
    }
  )
})
