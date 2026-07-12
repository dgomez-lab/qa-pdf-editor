import { test, expect } from '@playwright/test'
import { stripeBillingForTestIp } from './stripePayment'

test.describe('stripePayment billing by test IP', () => {
  test('uses US billing details when checkout is driven by the US test IP', () => {
    expect(stripeBillingForTestIp('US')).toEqual({ country: 'US', postal: '90210' })
    expect(stripeBillingForTestIp('  US  ')).toEqual({ country: 'US', postal: '90210' })
  })

  test('leaves billing untouched for non-US or missing test IP values', () => {
    expect(stripeBillingForTestIp('ES')).toBeUndefined()
    expect(stripeBillingForTestIp('Default')).toBeUndefined()
    expect(stripeBillingForTestIp('')).toBeUndefined()
    expect(stripeBillingForTestIp()).toBeUndefined()
  })
})
