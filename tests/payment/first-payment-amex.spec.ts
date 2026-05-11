import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Paridad con `FirstPayment.feature` — `@PDFEDITOR_PAYMENT_FIRST_AMEX` (número de prueba Stripe `378282246310005`).
 */
test.describe('First payment — Amex', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_AMEX'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flujo editor: registro + pago Amex hasta descarga', async ({ page }) => {
    test.setTimeout(300_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+amex+${unique}@example.com`
    const number = process.env.STRIPE_TEST_AMEX_NUMBER?.trim() || '378282246310005'
    const exp = process.env.STRIPE_TEST_AMEX_EXP?.trim() || '1234'
    const cvc = process.env.STRIPE_TEST_AMEX_CVC?.trim() || '1234'

    await runEditorUploadRegisterAndVisaPayment(page, { email, stripe: { number, exp, cvc } })
  })
})
