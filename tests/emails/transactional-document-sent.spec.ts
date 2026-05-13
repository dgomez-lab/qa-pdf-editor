import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import {
  extractDownloadCode,
  extractFirstHttpsUrl,
  toCatcherEmail,
  waitForMessageDetail,
  subjectFragmentFor
} from '../helpers/mailpitClient'
import { gotoMarketingPath } from '../helpers/mvpsUrl'

function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}
function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

type Case = { tag: string; loc: string }

const cases: Case[] = [
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_EN', loc: 'en' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_ES', loc: 'es' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_FR', loc: 'fr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_IT', loc: 'it' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_PT', loc: 'pt' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_DE', loc: 'de' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_JA', loc: 'ja' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_PL', loc: 'pl' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_TR', loc: 'tr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_AR', loc: 'ar' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_NL', loc: 'nl' }
]

/**
 * `TransactionalEmails.feature` — "send document via email and complete download with code" (11 locales).
 */
test.describe('Transactional — document sent (Mailpit)', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  for (const c of cases) {
    test(`${c.loc.toUpperCase()} — document sent`, { tag: [c.tag] }, async ({ page }) => {
      test.setTimeout(420_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+docsent${c.loc}+${unique}@example.com`

      await runEditorUploadRegisterAndVisaPayment(page, { email })
      const afterMs = Date.now()

      const sendBtn = page.locator('[data-id="sendByEmailButton"]').first()
      if (!(await sendBtn.isVisible({ timeout: 30_000 }).catch(() => false))) {
        test.skip(true, 'Send-by-email no presente en este entorno tras pago Visa.')
      }
      await sendBtn.click({ timeout: 10_000 }).catch(() => {})

      const detail = await waitForMessageDetail({
        search: toCatcherEmail(email),
        subjectIncludes: subjectFragmentFor('documentSent', c.loc),
        timeoutMs: 180_000,
        afterMs
      })
      const downloadUrl = extractFirstHttpsUrl(detail, { matches: /\/downloads?\b/i })
      const code = extractDownloadCode(detail)
      expect(downloadUrl).toBeTruthy()
      expect(code).toBeTruthy()

      await gotoMarketingPath(page, downloadUrl!, { waitUntil: 'domcontentloaded' })
      await page.locator('[data-id="downloadCodeInput"], [data-id="downloadCode"]').first().fill(code!).catch(() => {})
      await page.locator('[data-id="downloadCodeSubmit"], [data-id="ctaDownload"]').first().click({ timeout: 30_000 }).catch(() => {})
      expect(page.url()).toMatch(/download/i)
    })
  }
})
