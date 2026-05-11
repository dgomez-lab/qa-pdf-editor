import { expect, type BrowserContext, type Page } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from './pdfhintEditorPaymentFlow'
import {
  expectLastTransactionMatches,
  openCrmCustomerForEmail,
  refundLastPaymentLikeLegacy
} from './crmStaging'

export type RefundCardSpec = {
  /** Tarjeta de prueba Stripe a usar para el pago inicial. */
  number: string
  exp: string
  cvc: string
  /** Identificador legible para el email. */
  label: string
}

/**
 * Tronco común para `@PDFEDITOR_PAYMENT_FIRST_REFUND_*`:
 * pago inicial (Stripe) → CRM → refund → verificar fila Refund con la matriz Cucumber.
 */
export async function runFirstPaymentRefund(page: Page, context: BrowserContext, card: RefundCardSpec): Promise<void> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+refund${card.label}+${unique}@example.com`

  await runEditorUploadRegisterAndVisaPayment(page, {
    email,
    stripe: { number: card.number, exp: card.exp, cvc: card.cvc }
  })
  await page.waitForTimeout(5000)
  const crmPage = await openCrmCustomerForEmail(context, email)
  await refundLastPaymentLikeLegacy(crmPage)
  await crmPage.reload({ waitUntil: 'domcontentloaded' })
  await expectLastTransactionMatches(crmPage, {
    transactionType: 'Refund',
    transactionStatus: 'Success',
    paymentSolution: 'Stripe',
    amount: '1.95',
    currency: 'EUR',
    subscriptionName: 'Full Access'
  })
  expect(true).toBe(true)
  await crmPage.close()
}
