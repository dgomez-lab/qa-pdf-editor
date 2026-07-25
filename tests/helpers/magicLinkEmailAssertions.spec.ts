import { test, expect } from '@playwright/test'
import { assertMagicLinkEmailInExpectedLanguage } from './magicLinkEmailAssertions'

test.describe('assertMagicLinkEmailInExpectedLanguage', () => {
  test('accepts English magic-link copy after HTML entity decoding', () => {
    expect(() =>
      assertMagicLinkEmailInExpectedLanguage(
        {
          HTML: '<p>Your&nbsp;sign&#x20;in link</p>'
        },
        'en'
      )
    ).not.toThrow()
  })

  test('accepts Spanish headline from text body', () => {
    expect(() =>
      assertMagicLinkEmailInExpectedLanguage(
        {
          Text: 'Tu enlace para iniciar sesión está listo'
        },
        ' es '
      )
    ).not.toThrow()
  })

  test('falls back to English headline for unknown locales', () => {
    expect(() =>
      assertMagicLinkEmailInExpectedLanguage(
        {
          Text: 'Your sign in link'
        },
        'xx'
      )
    ).not.toThrow()
  })

  test('rejects email content that omits the expected locale headline', () => {
    expect(() =>
      assertMagicLinkEmailInExpectedLanguage(
        {
          HTML: '<p>Unrelated transactional content</p>'
        },
        'en'
      )
    ).toThrow(/Your sign in link/)
  })
})
