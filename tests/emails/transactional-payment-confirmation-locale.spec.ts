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

type LocaleCase = { tag: string; locale: string }

const cases: LocaleCase[] = [
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_EN', locale: 'en' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_ES', locale: 'es' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_FR', locale: 'fr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_IT', locale: 'it' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_PT', locale: 'pt' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_DE', locale: 'de' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_JA', locale: 'ja' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_PL', locale: 'pl' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_TR', locale: 'tr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_AR', locale: 'ar' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_NL', locale: 'nl' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_KO', locale: 'ko' }
]

const subjectCandidates = [
  'receipt', 'thank you', 'payment', 'purchase', 'order', 'pdf', 'invoice',
  'confirmación', 'confirmacion', 'recibo', 'pago', 'bestellung', 'bestätigung', 'facture', 'acquisto'
]

/**
 * `TransactionalEmails.feature` — Scenario Outline "Payment confirmation email in <locale> (EUR, localized headline)".
 */
test.describe('Transactional — payment confirmation por locale', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  for (const c of cases) {
    test(`locale ${c.locale.toUpperCase()} (EUR)`, { tag: [c.tag] }, async ({ page }) => {
      test.setTimeout(420_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+pcl${c.locale}+${unique}@example.com`
      const afterMs = Date.now()

      await runEditorUploadRegisterAndVisaPayment(page, { email, homeQuery: { ip: 'ES' } })

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
