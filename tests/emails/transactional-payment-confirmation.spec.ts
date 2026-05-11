import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import { toCatcherEmail, waitForMessageDetailSubjectMatchesOne } from '../helpers/mailpitClient'
import { assertPaymentConfirmationEmailLoose } from '../helpers/paymentConfirmationEmailAssertions'

function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

function paymentConfirmationEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_TRANSACTIONAL_PAYMENT_CONFIRMATION?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

function subjectCandidates(): string[] {
  const raw = process.env.PLAYWRIGHT_PAYMENT_CONFIRMATION_SUBJECT_CANDIDATES?.trim()
  if (raw) return raw.split(',').map((s) => s.trim()).filter(Boolean)
  return [
    'receipt',
    'thank you',
    'payment',
    'purchase',
    'order',
    'pdf',
    'invoice',
    'confirmación',
    'confirmacion',
    'recibo',
    'pago',
    'bestellung',
    'bestätigung',
    'facture',
    'acquisto'
  ]
}

/**
 * Paridad con `TransactionalEmails.feature` — correo tras pago (copy del producto variable).
 * Requiere Mailpit + `PLAYWRIGHT_PAYMENT_SMOKE=1` + **`PLAYWRIGHT_TRANSACTIONAL_PAYMENT_CONFIRMATION=1`** (evita ~5 min en `npm test` por defecto).
 * Ajusta asunto vía `PLAYWRIGHT_PAYMENT_CONFIRMATION_SUBJECT_CANDIDATES` (coma-separado) si el entorno usa otro copy.
 */
test.describe('Transactional — confirmación de pago (Mailpit)', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!paymentConfirmationEnabled(), 'PLAYWRIGHT_TRANSACTIONAL_PAYMENT_CONFIRMATION=1 (opt-in)')
  })

  test(
    'tras pago Visa aparece correo de confirmación en Mailpit',
    { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION'] },
    async ({ page }) => {
      test.setTimeout(420_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+payconfirm+${unique}@example.com`
      const search = toCatcherEmail(email)
      const afterMs = Date.now()

      await runEditorUploadRegisterAndVisaPayment(page, { email })

      const detail = await waitForMessageDetailSubjectMatchesOne({
        search,
        subjectSubstrings: subjectCandidates(),
        timeoutMs: 180_000,
        afterMs
      })
      assertPaymentConfirmationEmailLoose(detail)
    }
  )
})
