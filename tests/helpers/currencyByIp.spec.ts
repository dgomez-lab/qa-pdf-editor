import { test, expect } from '@playwright/test'
import { EUR_DEFAULT_IP, formatAmountPaid, formatMonthlyAmount, getCurrencyExpectationForIp } from './currencyByIp'

test.describe('currencyByIp', () => {
  test('formats USD amounts using fixed decimal displays', () => {
    expect(getCurrencyExpectationForIp('US')).toMatchObject({
      symbol: '$',
      initialAmount: 1.95,
      monthlyAmount: 49.95,
      currencyCode: 'USD'
    })
    expect(formatAmountPaid('US')).toBe('$1.95 USD')
    expect(formatMonthlyAmount('US')).toBe('$49.95 USD')
  })

  test('uses explicit email display strings for non-decimal and localized currencies', () => {
    expect(formatAmountPaid('JP')).toBe('¥300 JPY')
    expect(formatMonthlyAmount('JP')).toBe('¥7500.00 JPY')
    expect(formatAmountPaid('PL')).toBe('7,90 zł')
    expect(formatMonthlyAmount('PL')).toBe('149,00 zł')
  })

  test('falls back to the default EUR expectation for unknown IP values', () => {
    expect(EUR_DEFAULT_IP).toBe('Default')
    expect(getCurrencyExpectationForIp('UNKNOWN')).toEqual(getCurrencyExpectationForIp(EUR_DEFAULT_IP))
    expect(formatAmountPaid('UNKNOWN')).toBe('€1.95 EUR')
    expect(formatMonthlyAmount('UNKNOWN')).toBe('€49.95 EUR')
  })
})
