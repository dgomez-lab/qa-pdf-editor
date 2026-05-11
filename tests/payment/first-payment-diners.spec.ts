import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Paridad con `FirstPayment.feature` — Diners Club (Stripe test `30569309025904`).
 */
test.describe('First payment — Diners Club', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_DINERS', '@PDFEDITOR_PAYMENT_FIRST_DINNERS'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flujo editor: registro + pago Diners hasta descarga', async ({ page }) => {
    test.setTimeout(300_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+diners+${unique}@example.com`
    const number = process.env.STRIPE_TEST_DINERS_NUMBER?.trim() || '30569309025904'
    const exp = process.env.STRIPE_TEST_DINERS_EXP?.trim() || '1234'
    const cvc = process.env.STRIPE_TEST_DINERS_CVC?.trim() || '123'

    await runEditorUploadRegisterAndVisaPayment(page, { email, stripe: { number, exp, cvc } })
  })
})
