import { test, expect } from '@playwright/test'
import { parseCustomerSubscriptionId } from './crmStaging'

test.describe('parseCustomerSubscriptionId', () => {
  test('strips the legacy Subscription ID label case-insensitively', () => {
    expect(parseCustomerSubscriptionId('Subscription ID: 123456')).toBe('123456')
    expect(parseCustomerSubscriptionId('subscription id: 987')).toBe('987')
  })

  test('trims surrounding whitespace and keeps bare numeric ids', () => {
    expect(parseCustomerSubscriptionId('  55555  ')).toBe('55555')
    expect(parseCustomerSubscriptionId('Subscription ID:   42\n')).toBe('42')
  })

  test('does not strip non-label prefixes', () => {
    expect(parseCustomerSubscriptionId('Account Subscription ID: 9')).toBe('Account Subscription ID: 9')
  })
})
