import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Smoke Visa en **pdfhint** (BASE_URL staging) o cualquier `BASE_URL` explícita.
 * Para **MVPS mergedpdf**: `APP=mergedpdf` + `npm run test:payment-mergedpdf`; ante fallos de Stripe usar `PLAYWRIGHT_TRACE=1`.
 */
test.describe('PDF Hint — smoke de pago (opcional)', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PDFHINT_SMOKE_VISA', '@PDFEDITOR_MVPS_PAYMENT_VISA', '@PDFEDITOR_PAYMENT_FIRST_VISA'] }, () => {
  test.beforeEach(() => {
    test.skip(
      !paymentSmokeEnabled(),
      'Define PLAYWRIGHT_PAYMENT_SMOKE=1 para ejecutar (misma red/acceso que Cucumber Bitbucket).'
    )
  })

  /**
   * Paridad con @PDFEDITOR_PDFHINT_SMOKE_VISA / flujo tipo @PDFEDITOR_PAYMENT_FIRST_VISA hasta descarga tras pago.
   * CRM / transacciones: no cubierto (requiere PdfApi/Mailpit como en Cucumber).
   */
  test('registro desde editor, pago Visa, aparece descarga', async ({ page }) => {
    test.setTimeout(300_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
  })
})
