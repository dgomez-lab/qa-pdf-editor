import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { gotoAccount } from '../helpers/dashboardActions'
import { gotoMembership, cancelSubscriptionFromAccount } from '../helpers/accountActions'
import { toCatcherEmail, waitForMessageDetail, subjectFragmentFor } from '../helpers/mailpitClient'

function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}
function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

type Case = { tag: string; loc: string }

const cases: Case[] = [
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_EN', loc: 'en' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_ES', loc: 'es' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_FR', loc: 'fr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_IT', loc: 'it' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_PT', loc: 'pt' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_DE', loc: 'de' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_JA', loc: 'ja' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_PL', loc: 'pl' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_TR', loc: 'tr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_AR', loc: 'ar' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_NL', loc: 'nl' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_KO', loc: 'ko' }
]

/**
 * `TransactionalEmails.feature` — "Subscription cancellation email after user unsubscribes" (12 locales).
 */
test.describe('Transactional — subscription cancellation (Mailpit)', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  for (const c of cases) {
    test(`${c.loc.toUpperCase()} — cancellation email`, { tag: [c.tag] }, async ({ page }) => {
      test.setTimeout(480_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+canc${c.loc}+${unique}@example.com`

      await runEditorUploadRegisterAndVisaPayment(page, { email })
      await openDashboardViaPaymentSuccessModal(page)
      await gotoAccount(page)
      await gotoMembership(page)
      const afterMs = Date.now()
      await cancelSubscriptionFromAccount(page)

      const detail = await waitForMessageDetail({
        search: toCatcherEmail(email),
        subjectIncludes: subjectFragmentFor('subscriptionCancellation', c.loc),
        timeoutMs: 180_000,
        afterMs
      })
      expect(detail.Subject?.trim()).toBeTruthy()
      const body = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`
      expect(body).toMatch(/https?:\/\//)
    })
  }
})
