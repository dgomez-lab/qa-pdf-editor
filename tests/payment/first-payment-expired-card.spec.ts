import { test } from '@playwright/test'
import { runEditorUploadRegisterStripePaymentExpectDecline } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Paridad con `FirstPayment.feature` — tarjeta caducada (Stripe `4000000000000069`).
 */
test.describe('First payment — tarjeta caducada', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_EXPIRED_CARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flujo editor: tarjeta expirada muestra error', async ({ page }) => {
    test.setTimeout(300_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+exp+${unique}@example.com`
    const number = process.env.STRIPE_TEST_EXPIRED_NUMBER?.trim() || '4000000000000069'
    const exp = process.env.STRIPE_TEST_EXPIRED_EXP?.trim() || '1234'
    const cvc = process.env.STRIPE_TEST_EXPIRED_CVC?.trim() || '123'

    await runEditorUploadRegisterStripePaymentExpectDecline(page, { email, stripe: { number, exp, cvc } })
  })
})
