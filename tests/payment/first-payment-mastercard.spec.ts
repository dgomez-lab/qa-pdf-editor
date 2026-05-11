import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Paridad con `FirstPayment.feature` — `@PDFEDITOR_PAYMENT_FIRST_MASTERCARD` (número legacy `5555555555554444`).
 */
test.describe('First payment — MasterCard', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_MASTERCARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flujo editor: registro + pago MasterCard hasta descarga', async ({ page }) => {
    test.setTimeout(300_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+mc+${unique}@example.com`
    const number = process.env.STRIPE_TEST_MC_NUMBER?.trim() || '5555555555554444'
    const exp = process.env.STRIPE_TEST_MC_EXP?.trim() || '1230'
    const cvc = process.env.STRIPE_TEST_MC_CVC?.trim() || '123'

    await runEditorUploadRegisterAndVisaPayment(page, { email, stripe: { number, exp, cvc } })
  })
})
