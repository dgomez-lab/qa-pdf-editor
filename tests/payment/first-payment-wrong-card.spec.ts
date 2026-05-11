import { test } from '@playwright/test'
import { runEditorUploadRegisterStripePaymentExpectDecline } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Paridad con `FirstPayment.feature` — escenario tarjeta incorrecta / declinada genérica Stripe (`4000000000000002`).
 */
test.describe('First payment — tarjeta declinada', {
  tag: [
    '@PDFEDITOR_PAYMENT',
    '@PDFEDITOR_PAYMENT_FIRST_WRONG_CARD',
    '@PDFEDITOR_PAYMENT_FIRST_WRONG_CARD_NUMBER_NOT_RECOGNIZED',
    '@PDFEDITOR_PAYMENT_FIRST_WRONG_CARD_NUMBER_HIGH_RISK',
    '@PDFEDITOR_PAYMENT_FIRST_WRONG_CARD_NUMBER_MULTIPLE_DISPUTES'
  ]
}, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flujo editor: registro + pago declinado muestra error', async ({ page }) => {
    test.setTimeout(300_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+decline+${unique}@example.com`

    await runEditorUploadRegisterStripePaymentExpectDecline(page, { email })
  })
})
