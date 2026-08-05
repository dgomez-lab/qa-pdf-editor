import { expect, test } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import {
  assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement,
  paymentConfirmationSubjectFragmentForLocale
} from './paymentConfirmationEmailStrictAssertions'

const transactionId = `ch_${'b'.repeat(24)}`

function currentPaymentDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function paymentConfirmationDetail(body: string, text = ''): MailpitMessageDetail {
  return {
    ID: 'payment-confirmation-edges',
    Subject: 'Payment confirmation',
    HTML: body ? `<main>${body}</main>` : '',
    Text: text
  }
}

test.describe('paymentConfirmationSubjectFragmentForLocale', () => {
  test('returns locale fragments and English fallback for unknown locales', () => {
    expect(paymentConfirmationSubjectFragmentForLocale('es')).toBe('Confirmación')
    expect(paymentConfirmationSubjectFragmentForLocale(' FR ')).toBe('Confirmation')
    expect(paymentConfirmationSubjectFragmentForLocale('zz')).toBe('Payment confirmation')
  })
})

test.describe('strict payment confirmation edge and locale branches', () => {
  test('accepts Spanish plan via headline and Full Access without literal plan string', () => {
    const body = [
      '<h1>¡Tu Full Access ha comenzado!</h1>',
      '<p>Cuenta de correo electrónico: qa_user@catcher.1ecorp.net</p>',
      '<p>ID de la cuenta: 1234567890</p>',
      '<p>Importe: €1.95 EUR</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>ID de transacción ${transactionId}</p>`,
      '<p>PDF PRE-PRODUCTION</p>',
      '<p>Renovación: €49.95 EUR</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'qa_user@example.com',
          testIp: 'ES',
          locale: 'es'
        }
      )
    ).not.toThrow()
  })

  test('normalizes Japanese fullwidth digits for amount matching', () => {
    const body = [
      '<h1>Full Accessが開始されました！</h1>',
      '<p>7日間 Full Access</p>',
      '<p>メールアカウント: jp_user@catcher.1ecorp.net</p>',
      '<p>アカウントID: 1234567890</p>',
      '<p>¥３００ JPY</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>取引ID ${transactionId}</p>`,
      '<p>PDF QA ENVIRONMENT</p>',
      '<p>¥７５００.００ JPY</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'jp_user@example.com',
          testIp: 'JP',
          locale: 'ja'
        }
      )
    ).not.toThrow()
  })

  test('matches catcher email in body when locale email label is missing', () => {
    const body = [
      '<h1>Your Full Access has begun!</h1>',
      '<p>7 days Full Access</p>',
      '<p>Contact: edge_user@catcher.1ecorp.net</p>',
      '<p>Account ID 1234567890</p>',
      '<p>$1.95 USD</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>Transaction ID ${transactionId}</p>`,
      '<p>PDF QA ENVIRONMENT</p>',
      '<p>$49.95 USD</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'edge_user@example.com',
          testIp: 'US',
          locale: 'en'
        }
      )
    ).not.toThrow()
  })

  test('useLocaleEurOutline forces EUR amounts and requires locale headline', () => {
    const body = [
      '<h1>¡Tu Full Access ha comenzado!</h1>',
      '<p>7 días Full Access</p>',
      '<p>Cuenta de correo electrónico: eur_user@catcher.1ecorp.net</p>',
      '<p>ID de la cuenta: 1234567890</p>',
      '<p>€1.95 EUR</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>ID de transacción ${transactionId}</p>`,
      '<p>PDF QA ENVIRONMENT</p>',
      '<p>€49.95 EUR</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'eur_user@example.com',
          testIp: 'US',
          locale: 'es',
          useLocaleEurOutline: true
        }
      )
    ).not.toThrow()
  })

  test('accepts bare ten-digit account id and currency-hint amount fallback', () => {
    const body = [
      '<h1>Your Full Access has begun!</h1>',
      '<p>7 days Full Access</p>',
      '<p>Email account: hint_user@catcher.1ecorp.net</p>',
      '<p>Customer reference 9876543210</p>',
      '<p>Paid 1.95 USD today</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>${transactionId}</p>`,
      '<p>PDF PRE-PRODUCTION</p>',
      '<p>Renews at 49.95 USD</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'hint_user@example.com',
          testIp: 'US',
          locale: 'en'
        }
      )
    ).not.toThrow()
  })

  test('rejects empty payment confirmation content', () => {
    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail('', ''),
        {
          registrationEmail: 'empty@example.com',
          testIp: 'US',
          locale: 'en'
        }
      )
    ).toThrow(/No payment confirmation email content/)
  })
})
