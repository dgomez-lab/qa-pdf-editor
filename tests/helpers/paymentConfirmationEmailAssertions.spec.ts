import { expect, test } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import { assertPaymentConfirmationEmailLoose } from './paymentConfirmationEmailAssertions'

function detail(partial: Partial<MailpitMessageDetail>): MailpitMessageDetail {
  return {
    ID: 'payment-confirmation-loose',
    Subject: 'Payment confirmation',
    HTML: '',
    Text: '',
    ...partial
  }
}

test.describe('assertPaymentConfirmationEmailLoose', () => {
  test('accepts non-empty subject with https link in HTML', () => {
    expect(() =>
      assertPaymentConfirmationEmailLoose(
        detail({
          Subject: '  Payment confirmation  ',
          HTML: '<a href="https://links.info.pdfmerges.com/receipt">View receipt</a>'
        })
      )
    ).not.toThrow()
  })

  test('accepts https link found only in the text body', () => {
    expect(() =>
      assertPaymentConfirmationEmailLoose(
        detail({
          Subject: 'Confirmación de pago',
          Text: 'Open https://example.com/paid to continue'
        })
      )
    ).not.toThrow()
  })

  test('rejects blank subjects', () => {
    expect(() =>
      assertPaymentConfirmationEmailLoose(
        detail({
          Subject: '   ',
          HTML: '<a href="https://example.com">ok</a>'
        })
      )
    ).toThrow(/asunto/i)
  })

  test('rejects bodies without an https link', () => {
    expect(() =>
      assertPaymentConfirmationEmailLoose(
        detail({
          Subject: 'Payment confirmation',
          HTML: '<p>Thanks for your purchase</p>',
          Text: 'http://insecure.example/paid'
        })
      )
    ).toThrow(/https/i)
  })
})
