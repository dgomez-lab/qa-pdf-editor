import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { editor } from '../pages/editorSelectors'
import { fixturePathOrSkip, uploadFromLanding } from '../helpers/multiFormatUpload'
import { createNewUserFromEditor } from '../helpers/editorActions'
import { fillStripePaymentLikeLegacy } from '../helpers/stripePayment'
import { openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

const variants = [
  { tag: '@PDFEDITOR_USER_UPLOADS_WORD_FILE', landing: 'wordToPDF', format: 'DOCX' as const },
  { tag: '@PDFEDITOR_USER_UPLOADS_EXCEL_FILE', landing: 'excelToPDF', format: 'XLSX' as const },
  { tag: '@PDFEDITOR_USER_UPLOADS_POWER_POINT_FILE', landing: 'pwpToPDF', format: 'PPTX' as const },
  { tag: '@PDFEDITOR_USER_UPLOADS_JPG_FILE', landing: 'jpgToPDF', format: 'JPG' as const },
  { tag: '@PDFEDITOR_USER_UPLOADS_JPEG_FILE', landing: 'jpgToPDF', format: 'JPEG' as const },
  { tag: '@PDFEDITOR_USER_UPLOADS_PNG_FILE', landing: 'pngToPDF', format: 'PNG' as const }
]

/**
 * `Users.feature` — Scenario Outline "User uploads different format files".
 * Cada test sube desde su LP, completa pago Visa y comprueba que en el dashboard la fila
 * de archivos no muestra fallo de preview.
 */
test.describe('Users — uploads multi-formato', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  for (const v of variants) {
    test(`upload ${v.format} desde ${v.landing}`, { tag: [v.tag] }, async ({ page }) => {
      test.setTimeout(420_000)
      const filePath = fixturePathOrSkip(test, v.format)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+up${v.format.toLowerCase()}+${unique}@example.com`

      await uploadFromLanding(page, v.landing, filePath)
      await dismissCookiesIfPresent(page)
      const download = page.locator(editor.downloadButton).first()
      await expect(download).toBeVisible({ timeout: 180_000 })
      await download.click({ force: true })
      await createNewUserFromEditor(page, email)
      await fillStripePaymentLikeLegacy(page, {
        number: process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242',
        exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
        cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123'
      })
      await page.locator(editor.continuePayment).click()
      await openDashboardViaPaymentSuccessModal(page)
    })
  }
})
