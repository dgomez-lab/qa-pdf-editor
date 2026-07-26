import { expect, test } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import { assertSubscriptionCancellationEmailLocalized } from './subscriptionCancellationEmailAssertions'

process.env.TZ = 'UTC'

function detail(partial: Partial<MailpitMessageDetail> & Pick<MailpitMessageDetail, 'Subject'>): MailpitMessageDetail {
  return {
    ID: 'msg-unsubscribe',
    HTML: '',
    Text: '',
    ...partial
  }
}

test.describe('subscriptionCancellationEmailAssertions', () => {
  test('accepts English cancellation mail with access-until date and catcher email', () => {
    const purchaseMs = Date.UTC(2024, 0, 1, 15, 30, 0)
    const message = detail({
      Subject: 'Your subscription cancellation confirmation',
      HTML: `
        <p>So sad to see you go</p>
        <p>Plan: Full Access</p>
        <p>Access until 8 January 2024</p>
        <p>Account: qauser@catcher.1ecorp.net</p>
      `
    })

    expect(() =>
      assertSubscriptionCancellationEmailLocalized(message, {
        locale: 'en',
        registrationEmail: 'qa_user@example.com',
        subscriptionPurchaseDateMs: purchaseMs
      })
    ).not.toThrow()
  })

  test('accepts Spanish mail with HTML entities and localized access-until date', () => {
    const purchaseMs = Date.UTC(2024, 5, 10, 12, 0, 0)
    const message = detail({
      Subject: 'Confirmación de cancelación de suscripción',
      HTML: `
        <p>¡Qué pena que te vayas!</p>
        <p>Full Access</p>
        <p>Acceso hasta el 17 de junio de 2024</p>
        <p>ya@catcher.1ecorp.net</p>
      `
    })

    expect(() =>
      assertSubscriptionCancellationEmailLocalized(message, {
        locale: ' ES ',
        registrationEmail: 'ya@catcher.1ecorp.net',
        subscriptionPurchaseDateMs: purchaseMs
      })
    ).not.toThrow()
  })

  test('falls back to English subject and opening for unknown locales', () => {
    const purchaseMs = Date.UTC(2024, 0, 1, 0, 0, 0)
    const message = detail({
      Subject: 'subscription cancellation notice',
      Text: 'So sad to see you go. Full Access until 8 January 2024 for user@catcher.1ecorp.net'
    })

    expect(() =>
      assertSubscriptionCancellationEmailLocalized(message, {
        locale: 'zz',
        registrationEmail: 'user@example.com',
        subscriptionPurchaseDateMs: purchaseMs
      })
    ).not.toThrow()
  })

  test('rejects missing access-until date candidates', () => {
    const purchaseMs = Date.UTC(2024, 0, 1, 0, 0, 0)
    const message = detail({
      Subject: 'subscription cancellation',
      HTML: '<p>So sad to see you go</p><p>Full Access</p><p>user@catcher.1ecorp.net</p>'
    })

    expect(() =>
      assertSubscriptionCancellationEmailLocalized(message, {
        locale: 'en',
        registrationEmail: 'user@example.com',
        subscriptionPurchaseDateMs: purchaseMs
      })
    ).toThrow(/access-until date/i)
  })
})
