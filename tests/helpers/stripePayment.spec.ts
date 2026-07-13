import { test, expect } from '@playwright/test'
import { stripeBillingForTestIp } from './stripePayment'

test.describe('stripeBillingForTestIp', () => {
  test('returns US billing details for US test IP', () => {
    expect(stripeBillingForTestIp('US')).toEqual({ country: 'US', postal: '90210' })
  })

  test('trims the configured test IP before resolving billing details', () => {
    expect(stripeBillingForTestIp(' US ')).toEqual({ country: 'US', postal: '90210' })
  })

  test('does not require Stripe billing details for non-US or missing test IPs', () => {
    for (const testIp of ['ES', '', '   ', undefined]) {
      expect(stripeBillingForTestIp(testIp)).toBeUndefined()
    }
  })
})
