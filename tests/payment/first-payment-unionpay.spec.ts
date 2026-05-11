import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Paridad con `FirstPayment.feature` — UnionPay (Stripe test `6200000000000005`).
 */
test.describe('First payment — UnionPay', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_UNIONPAY'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flujo editor: registro + pago UnionPay hasta descarga', async ({ page }) => {
    test.setTimeout(300_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+unionpay+${unique}@example.com`
    const number = process.env.STRIPE_TEST_UNIONPAY_NUMBER?.trim() || '6200000000000005'
    const exp = process.env.STRIPE_TEST_UNIONPAY_EXP?.trim() || '1234'
    const cvc = process.env.STRIPE_TEST_UNIONPAY_CVC?.trim() || '123'

    await runEditorUploadRegisterAndVisaPayment(page, { email, stripe: { number, exp, cvc } })
  })
})
