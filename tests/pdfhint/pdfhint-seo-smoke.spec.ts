import { test, expect } from '@playwright/test'
import { collectPdfhintHeaderSeoErrors } from '../helpers/pdfhintHeaderSeo'
import { openHome } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'

/**
 * Paridad con features/PDFhint.feature — @PDFEDITOR_PDFHINT_SMOKE_SEO
 */
test.describe('PDF Hint — staging smoke (SEO)', { tag: ['@PDFEDITOR_PDFHINT'] }, () => {
  test.beforeEach(() => {
    test.skip(!isPdfhintSite(), 'Cabecera tipo pdfhint: solo con BASE_URL pdfhint')
  })

  test('cabecera: Login y Forms', { tag: ['@PDFEDITOR_PDFHINT_SMOKE_SEO'] }, async ({ page }) => {
    await openHome(page)
    const errors = await collectPdfhintHeaderSeoErrors(page)
    expect(errors, errors.join('\n')).toEqual([])
  })
})
