import { expect, test } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import {
  assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement,
  paymentConfirmationSubjectFragmentForLocale
} from './paymentConfirmationEmailStrictAssertions'

const transactionId = `ch_${'c'.repeat(24)}`

function currentPaymentDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function paymentConfirmationDetail(body: string): MailpitMessageDetail {
  return {
    ID: 'payment-confirmation-locales',
    Subject: 'Payment confirmation',
    HTML: `<main>${body}</main>`,
    Text: ''
  }
}

test.describe('paymentConfirmationSubjectFragmentForLocale remaining locales', () => {
  test('returns fragments for pl, tr, ar, nl, and ko', () => {
    expect(paymentConfirmationSubjectFragmentForLocale('pl')).toBe('Potwierdzenie płatności')
    expect(paymentConfirmationSubjectFragmentForLocale('tr')).toBe('Ödeme onayı')
    expect(paymentConfirmationSubjectFragmentForLocale('ar')).toBe('تأكيد الدفع')
    expect(paymentConfirmationSubjectFragmentForLocale('nl')).toBe('Betalingsbevestiging')
    expect(paymentConfirmationSubjectFragmentForLocale('ko')).toBe('결제 확인')
  })
})

test.describe('strict payment confirmation remaining locale headlines', () => {
  test('accepts Polish plan via headline without literal plan string', () => {
    const body = [
      '<h1>Twoja subskrypcja Full Access jest już aktywna!</h1>',
      '<p>Konto e-mail: pl_user@catcher.1ecorp.net</p>',
      '<p>ID konta: 1234567890</p>',
      '<p>7,90 zł</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>ID transakcji: ${transactionId}</p>`,
      '<p>PDF PRE-PRODUCTION</p>',
      '<p>149,00 zł</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'pl_user@example.com',
          testIp: 'PL',
          locale: 'pl'
        }
      )
    ).not.toThrow()
  })

  test('accepts Turkish plan via headline without literal plan string', () => {
    const body = [
      '<h1>Full Access aboneliğiniz başladı!</h1>',
      '<p>E-posta: tr_user@catcher.1ecorp.net</p>',
      '<p>Hesap ID: 1234567890</p>',
      '<p>₺59,00 TRY</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>İşlem No: ${transactionId}</p>`,
      '<p>PDF QA ENVIRONMENT</p>',
      '<p>₺999,00 TRY</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'tr_user@example.com',
          testIp: 'TR',
          locale: 'tr'
        }
      )
    ).not.toThrow()
  })

  test('accepts Arabic plan via headline without literal plan string', () => {
    const body = [
      '<h1>Full Access الخاص بك قد بدأ.</h1>',
      '<p>البريد الإلكتروني: ar_user@catcher.1ecorp.net</p>',
      '<p>معرف الحساب: 1234567890</p>',
      '<p>€1.95 EUR</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>معرف المعاملة ${transactionId}</p>`,
      '<p>PDF PRE-PRODUCTION</p>',
      '<p>€49.95 EUR</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'ar_user@example.com',
          testIp: 'ES',
          locale: 'ar'
        }
      )
    ).not.toThrow()
  })

  test('accepts Dutch plan via headline without literal plan string', () => {
    const body = [
      '<h1>Je Full Access is begonnen!</h1>',
      '<p>E-mailadres: nl_user@catcher.1ecorp.net</p>',
      '<p>Account-ID: 1234567890</p>',
      '<p>€1.95 EUR</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>Transactie-ID: ${transactionId}</p>`,
      '<p>PDF QA ENVIRONMENT</p>',
      '<p>€49.95 EUR</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'nl_user@example.com',
          testIp: 'ES',
          locale: 'nl'
        }
      )
    ).not.toThrow()
  })

  test('accepts Korean plan via headline without literal plan string', () => {
    const body = [
      '<h1>Full Access 구독이 시작되었습니다!</h1>',
      '<p>이메일 계정: ko_user@catcher.1ecorp.net</p>',
      '<p>계정 ID: 1234567890</p>',
      '<p>$1.95 USD</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>거래 ID ${transactionId}</p>`,
      '<p>PDF PRE-PRODUCTION</p>',
      '<p>$49.95 USD</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'ko_user@example.com',
          testIp: 'US',
          locale: 'ko'
        }
      )
    ).not.toThrow()
  })

  test('accepts Korean compact plan alternative string', () => {
    const body = [
      '<h1>Full Access 구독이 시작되었습니다!</h1>',
      '<p>7일 Full Access</p>',
      '<p>이메일 계정: ko_user@catcher.1ecorp.net</p>',
      '<p>계정 ID: 1234567890</p>',
      '<p>$1.95 USD</p>',
      `<p>${currentPaymentDate()}</p>`,
      `<p>거래 ID ${transactionId}</p>`,
      '<p>PDF QA ENVIRONMENT</p>',
      '<p>$49.95 USD</p>'
    ].join('')

    expect(() =>
      assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
        paymentConfirmationDetail(body),
        {
          registrationEmail: 'ko_user@example.com',
          testIp: 'US',
          locale: 'ko'
        }
      )
    ).not.toThrow()
  })
})
