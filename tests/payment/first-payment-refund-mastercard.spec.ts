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

test.describe('First payment refund — MasterCard', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PAYMENT_FIRST_REFUND_MASTERCARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
  })

  test('pago MasterCard + refund', async ({ page, context }) => {
    test.setTimeout(420_000)
    await runFirstPaymentRefund(page, context, {
      number: process.env.STRIPE_TEST_MC_NUMBER ?? '5555555555554444',
      exp: process.env.STRIPE_TEST_MC_EXP ?? '1230',
      cvc: process.env.STRIPE_TEST_MC_CVC ?? '123',
      label: 'mc'
    })
  })
})
