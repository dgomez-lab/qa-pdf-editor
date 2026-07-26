import { expect, test } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import {
  ACCOUNT_CREATED_SUBJECT_FRAGMENT,
  assertAccountCreatedEmail,
  subjectFragmentForLocale
} from './accountCreatedEmailAssertions'

function detail(partial: Partial<MailpitMessageDetail> & Pick<MailpitMessageDetail, 'Subject'>): MailpitMessageDetail {
  return {
    ID: 'msg-account-created',
    HTML: '',
    Text: '',
    ...partial
  }
}

test.describe('accountCreatedEmailAssertions', () => {
  test('subjectFragmentForLocale returns locale fragments and English fallback', () => {
    expect(subjectFragmentForLocale('es')).toBe(ACCOUNT_CREATED_SUBJECT_FRAGMENT.es)
    expect(subjectFragmentForLocale('ko')).toBe(ACCOUNT_CREATED_SUBJECT_FRAGMENT.ko)
    expect(subjectFragmentForLocale('zz')).toBe(ACCOUNT_CREATED_SUBJECT_FRAGMENT.en)
  })

  test('accepts English account-created mail with catcher email and CTA', () => {
    const registrationEmail = 'qa_user_demo@example.com'
    const message = detail({
      Subject: 'Your account created successfully',
      HTML: `
        <p>Welcome!</p>
        <p>Signed up as qauserdemo@catcher.1ecorp.net</p>
        <a href="https://links.info.pdfmerges.com/start?x=1&amp;y=2">Get started!</a>
      `
    })

    expect(() => assertAccountCreatedEmail(message, 'en', registrationEmail)).not.toThrow()
  })

  test('accepts Spanish mail with HTML stripped and preserves catcher addresses', () => {
    const registrationEmail = 'already@catcher.1ecorp.net'
    const message = detail({
      Subject: 'Creación de una cuenta - pdfhint',
      HTML:
        '<h1>¡Te damos la bienvenida!</h1><div>User: already@catcher.1ecorp.net</div><a href="https://links.info.pdfmerges.com/cta">Empezar</a>'
    })

    expect(() => assertAccountCreatedEmail(message, ' ES ', registrationEmail)).not.toThrow()
  })

  test('falls back to English welcome and subject for unknown locales', () => {
    const message = detail({
      Subject: 'account created',
      HTML: '<p>Welcome!</p><p>user@catcher.1ecorp.net</p><a href="https://example.com/go">Continue</a>'
    })

    expect(() => assertAccountCreatedEmail(message, 'xx', 'user@example.com')).not.toThrow()
  })

  test('rejects missing welcome line or marketing CTA', () => {
    const registrationEmail = 'user@example.com'

    expect(() =>
      assertAccountCreatedEmail(
        detail({
          Subject: 'account created',
          HTML: '<p>user@catcher.1ecorp.net</p><a href="https://example.com/go">Continue</a>'
        }),
        'en',
        registrationEmail
      )
    ).toThrow(/welcome/i)

    expect(() =>
      assertAccountCreatedEmail(
        detail({
          Subject: 'account created',
          HTML: '<p>Welcome!</p><p>user@catcher.1ecorp.net</p>'
        }),
        'en',
        registrationEmail
      )
    ).toThrow(/Get started|marketing/i)
  })
})
