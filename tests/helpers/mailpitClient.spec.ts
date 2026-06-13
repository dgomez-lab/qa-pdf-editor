import { test, expect } from '@playwright/test'
import {
  extractAccountCreatedGetStartedHref,
  extractDownloadCode,
  extractFirstHttpsUrl,
  extractMagicLinkFromMessage,
  subjectFragmentFor,
  toCatcherEmail,
  type MailpitMessageDetail
} from './mailpitClient'

function message(overrides: Partial<MailpitMessageDetail>): MailpitMessageDetail {
  return {
    ID: 'msg-1',
    Subject: 'Test message',
    ...overrides
  }
}

test.describe('mailpitClient parsing helpers', () => {
  test('maps app addresses to the legacy catcher mailbox domain', () => {
    expect(toCatcherEmail('buyer@example.com')).toBe('buyer@catcher.1ecorp.net')
  })

  test('extracts download verification codes from localized message text', () => {
    expect(extractDownloadCode(message({ Text: 'Your verification code: 1234' }))).toBe('1234')
    expect(extractDownloadCode(message({ Text: 'Código de verificación: 5678' }))).toBe('5678')
    expect(extractDownloadCode(message({ Text: 'Best&auml;tigungscode: 9012' }))).toBe('9012')
  })

  test('skips year-like fallback tokens when extracting download codes', () => {
    expect(extractDownloadCode(message({ Text: 'Copyright 2024. Use 4321 to start your download.' }))).toBe('4321')
  })

  test('prefers the sign-in CTA over image and tracking URLs for magic links', () => {
    const href = 'https://app.example.test/login?token=abc'
    const detail = message({
      HTML: `
        <img src="https://cdn.example.test/logo.png">
        <a href="https://tracking.example.test/open">Open</a>
        <a href="${href}">Sign in</a>
      `
    })

    expect(extractMagicLinkFromMessage(detail)).toBe(href)
  })

  test('falls back to the first non-image HTTPS URL across HTML and text bodies', () => {
    const detail = message({
      HTML: '<img src="https://cdn.example.test/logo.svg">',
      Text: 'Open https://app.example.test/document/123 to continue'
    })

    expect(extractFirstHttpsUrl(detail)).toBe('https://app.example.test/document/123')
  })

  test('decodes escaped marketing hrefs for account-created CTAs', () => {
    const detail = message({
      HTML: '<a href="https://links.info.pdfmerges.com/start?email=a%40b.com&amp;utm=welcome">Get started!</a>'
    })

    expect(extractAccountCreatedGetStartedHref(detail)).toBe(
      'https://links.info.pdfmerges.com/start?email=a%40b.com&utm=welcome'
    )
  })

  test('returns locale-specific subject fragments with English fallback', () => {
    expect(subjectFragmentFor('paymentConfirmation', 'pl')).toBe('potwierdzenie')
    expect(subjectFragmentFor('magicLink', 'unknown')).toBe('sign in')
  })
})
