import { expect, test } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import { assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement } from './paymentConfirmationEmailStrictAssertions'

const transactionId = `ch_${'a'.repeat(24)}`

function currentPaymentDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function paymentConfirmationDetail(body: string): MailpitMessageDetail {
  return {
    ID: 'payment-confirmation',
    Subject: 'Payment confirmation',
    HTML: `<main>${body}</main>`
  }
}

function validEnglishBody(): string {
  return [
    '<h1>Your Full Access has begun!</h1>',
    '<p>7 days Full Access</p>',
    '<p>Email account: test_user@catcher.1ecorp.net</p>',
    '<p>Account ID 1234567890</p>',
    '<p>Amount paid: $1.95 USD</p>',
    `<p>${currentPaymentDate()}</p>`,
    `<p>Transaction ID ${transactionId}</p>`,
    '<p>PDF QA ENVIRONMENT</p>',
    '<p>Monthly renewal: $49.95 USD</p>'
  ].join('')
}

const context = {
  registrationEmail: 'test_user@example.com',
  testIp: 'US',
  locale: 'en'
}

test.describe('strict payment confirmation email assertions', () => {
  test('accepts a complete payment confirmation with normalized catcher email', () => {
    const detail = paymentConfirmationDetail(validEnglishBody())

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(detail, context)
    ).not.toThrow()
  })

  test('rejects a payment confirmation without a Stripe transaction ID', () => {
    const body = validEnglishBody().replace(transactionId, 'payment_reference_unavailable')
    const detail = paymentConfirmationDetail(body)

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(detail, context)
    ).toThrow(/Transaction ID/)
  })

  test('rejects a payment confirmation without a ten-digit account ID', () => {
    const body = validEnglishBody().replace('Account ID 1234567890', 'Account reference unavailable')
    const detail = paymentConfirmationDetail(body)

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(detail, context)
    ).toThrow(/Account ID not found/)
  })
})
