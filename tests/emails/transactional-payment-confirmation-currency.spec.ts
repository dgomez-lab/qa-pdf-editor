import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import { toCatcherEmail, waitForMessageDetailSubjectMatchesOne } from '../helpers/mailpitClient'

function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}
function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

const cases = [
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_USD', ip: 'US' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_EUR', ip: 'ES' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_CAD', ip: 'CA' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_AUD', ip: 'AU' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_GBP', ip: 'GB' }
]

const subjectCandidates = [
  'receipt', 'thank you', 'payment', 'purchase', 'order', 'pdf', 'invoice',
  'confirmación', 'confirmacion', 'recibo', 'pago', 'bestellung', 'bestätigung', 'facture', 'acquisto'
]

/**
 * `TransactionalEmails.feature` — Scenario Outline "Payment confirmation email for <currency> with IP <ip>".
 */
test.describe('Transactional — payment confirmation por currency', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  for (const c of cases) {
    test(`IP ${c.ip}`, { tag: [c.tag] }, async ({ page }) => {
      test.setTimeout(420_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+payconf${c.ip}+${unique}@example.com`
      const afterMs = Date.now()

      await runEditorUploadRegisterAndVisaPayment(page, { email, homeQuery: { ip: c.ip } })

      const detail = await waitForMessageDetailSubjectMatchesOne({
        search: toCatcherEmail(email),
        subjectSubstrings: subjectCandidates,
        timeoutMs: 240_000,
        afterMs
      })
      expect(detail.Subject?.trim()).toBeTruthy()
    })
  }
})
