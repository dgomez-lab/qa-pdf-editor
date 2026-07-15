import { test, expect } from '@playwright/test'
import { stripeBillingForTestIp } from './stripePayment'

test.describe('stripeBillingForTestIp', () => {
  test('returns the required US billing details', () => {
    expect(stripeBillingForTestIp('US')).toEqual({
      country: 'US',
      postal: '90210'
    })
  })

  test('normalizes whitespace around the test IP', () => {
    expect(stripeBillingForTestIp('  US  ')).toEqual({
      country: 'US',
      postal: '90210'
    })
  })

  for (const testIp of [undefined, '', ' ', 'ES', 'Default', 'us']) {
    test(`does not provide billing details for ${JSON.stringify(testIp)}`, () => {
      expect(stripeBillingForTestIp(testIp)).toBeUndefined()
    })
  }
})
