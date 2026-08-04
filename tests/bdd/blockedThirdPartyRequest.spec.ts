import { test, expect } from '@playwright/test'
import { BLOCKED_THIRD_PARTY_REQUEST } from './fixtures'

test.describe('BLOCKED_THIRD_PARTY_REQUEST', () => {
  test('matches analytics, ads, and error-tracking hosts', () => {
    const blocked = [
      'https://www.google-analytics.com/g/collect',
      'https://www.googletagmanager.com/gtm.js',
      'https://g.doubleclick.net/pagead/view',
      'https://connect.facebook.net/en_US/fbevents.js',
      'https://static.hotjar.com/c/hotjar.js',
      'https://cdn.segment.io/analytics.js',
      'https://o123.ingest.sentry.io/api/456/envelope/'
    ]
    for (const url of blocked) {
      expect(BLOCKED_THIRD_PARTY_REQUEST.test(url), url).toBe(true)
    }
  })

  test('does not match first-party app and CRM URLs', () => {
    const allowed = [
      'https://staging.pdfhint.com/en/login',
      'https://crm.mvps.website/?x-token-qa=token',
      'https://mailpit.1ecorp.net/api/v1/messages',
      'https://js.stripe.com/v3/'
    ]
    for (const url of allowed) {
      expect(BLOCKED_THIRD_PARTY_REQUEST.test(url), url).toBe(false)
    }
  })
})
