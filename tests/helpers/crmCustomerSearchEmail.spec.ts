import { test, expect } from '@playwright/test'
import { resolveCrmCustomerSearchEmail } from './crmStaging'

test.describe('resolveCrmCustomerSearchEmail', () => {
  test('strips underscores from catcher.1ecorp.net local parts only', () => {
    expect(resolveCrmCustomerSearchEmail('playwright_refund_visa@catcher.1ecorp.net')).toBe(
      'playwrightrefundvisa@catcher.1ecorp.net'
    )
    expect(resolveCrmCustomerSearchEmail('a_b_c@catcher.1ecorp.net')).toBe('abc@catcher.1ecorp.net')
  })

  test('leaves non-catcher emails unchanged including underscores', () => {
    expect(resolveCrmCustomerSearchEmail('playwright+refund_visa@example.com')).toBe(
      'playwright+refund_visa@example.com'
    )
    expect(resolveCrmCustomerSearchEmail('user_name@pdfhint.com')).toBe('user_name@pdfhint.com')
  })

  test('passes through malformed emails without throwing', () => {
    expect(resolveCrmCustomerSearchEmail('not-an-email')).toBe('not-an-email')
    expect(resolveCrmCustomerSearchEmail('missing-domain@')).toBe('missing-domain@')
  })
})
