import { test } from '@playwright/test'
import { isCrmConfigured } from "../helpers/crmStaging"
import { runFirstPaymentRefund } from '../helpers/firstPaymentRefundFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}
function crmReady(): boolean {
  return isCrmConfigured()
}

/**
 * Tag adicional `@PDFEDITOR_PAYMENT_FIRST_REFUND_FAILED` (escenario comentado en legacy):
 * el flujo Visa cubre cómo se reporta un refund correcto; un refund fallido implicaría
 * estado distinto en `transactionStatus` (Failed). Mantenemos el tag en este spec
 * para no perder paridad nominal con `qai-pa-pdf-editor`.
 */
test.describe('First payment refund — Visa', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_REFUND_VISA', '@PDFEDITOR_PAYMENT_FIRST_REFUND_FAILED'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
  })

  test('pago Visa + refund en CRM marca fila Refund', async ({ page, context }) => {
    test.setTimeout(420_000)
    await runFirstPaymentRefund(page, context, {
      number: process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242',
      exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
      cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123',
      label: 'visa'
    })
  })
})
