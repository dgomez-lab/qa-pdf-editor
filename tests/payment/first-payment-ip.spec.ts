import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import { expectLastTransactionMatches, isCrmConfigured, openCrmCustomerForEmail } from '../helpers/crmStaging'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}
function crmReady(): boolean {
  return isCrmConfigured()
}

type IpCase = {
  tag: string
  ip: string
  amount: string
  currency: string
}

const cases: IpCase[] = [
  { tag: '@PDFEDITOR_PAYMENT_IP_US', ip: 'US', amount: '1.95', currency: 'USD' },
  { tag: '@PDFEDITOR_PAYMENT_IP_AU', ip: 'AU', amount: '2.95', currency: 'AUD' },
  { tag: '@PDFEDITOR_PAYMENT_IP_CA', ip: 'CA', amount: '2.95', currency: 'CAD' },
  { tag: '@PDFEDITOR_PAYMENT_IP_ES', ip: 'ES', amount: '1.95', currency: 'EUR' },
  { tag: '@PDFEDITOR_PAYMENT_IP_GB', ip: 'GB', amount: '1.95', currency: 'GBP' }
]

/**
 * `FirstPayment.feature` — Scenario Outline "Initial payment with different IPs".
 * Backend acepta `?ip=US|AU|CA|ES|GB` y devuelve precio + currency localizados.
 */
test.describe('First payment — IP simulada', { tag: ['@PDFEDITOR_PAYMENT'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
  })

  for (const c of cases) {
    test(`IP ${c.ip} → ${c.amount} ${c.currency}`, { tag: [c.tag] }, async ({ page, context }) => {
      test.setTimeout(420_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+ip${c.ip}+${unique}@example.com`

      await runEditorUploadRegisterAndVisaPayment(page, {
        email,
        homeQuery: { ip: c.ip }
      })
      const crmPage = await openCrmCustomerForEmail(context, email)
      await expectLastTransactionMatches(crmPage, {
        transactionType: 'Payment',
        transactionStatus: 'Success',
        paymentSolution: 'Stripe',
        cardType: 'credit',
        amount: c.amount,
        currency: c.currency,
        subscriptionName: 'Full Access'
      })
      await crmPage.close()
    })
  }
})
