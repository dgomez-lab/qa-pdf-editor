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

test.describe('First payment refund — Amex', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_REFUND_AMEX'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
  })

  test('pago Amex + refund', async ({ page, context }) => {
    test.setTimeout(420_000)
    await runFirstPaymentRefund(page, context, {
      number: process.env.STRIPE_TEST_AMEX_NUMBER ?? '378282246310005',
      exp: process.env.STRIPE_TEST_AMEX_EXP ?? '1234',
      cvc: process.env.STRIPE_TEST_AMEX_CVC ?? '1234',
      label: 'amex'
    })
  })
})
