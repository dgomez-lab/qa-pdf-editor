import { test, expect } from '@playwright/test'
import { formatAmountPaid, formatMonthlyAmount, getCurrencyExpectationForIp } from './currencyByIp'

test.describe('currencyByIp first payment refund parity', () => {
  test('ES matches the EUR refund example and email display', () => {
    expect(getCurrencyExpectationForIp('ES')).toMatchObject({
      currencyCode: 'EUR',
      symbol: '€',
      initialAmount: 1.95,
      monthlyAmount: 49.95
    })
    expect(formatAmountPaid('ES')).toBe('€1.95 EUR')
    expect(formatMonthlyAmount('ES')).toBe('€49.95 EUR')
  })

  test('US keeps refund expectations in USD instead of falling back to EUR', () => {
    expect(getCurrencyExpectationForIp('US')).toMatchObject({
      currencyCode: 'USD',
      symbol: '$',
      initialAmount: 1.95,
      monthlyAmount: 49.95
    })
    expect(formatAmountPaid('US')).toBe('$1.95 USD')
    expect(formatMonthlyAmount('US')).toBe('$49.95 USD')
  })

  test('JP uses integer yen pricing with the strict email display format', () => {
    expect(getCurrencyExpectationForIp('JP')).toMatchObject({
      currencyCode: 'JPY',
      symbol: '¥',
      initialAmount: 300,
      monthlyAmount: 7500
    })
    expect(formatAmountPaid('JP')).toBe('¥300 JPY')
    expect(formatMonthlyAmount('JP')).toBe('¥7500.00 JPY')
  })

  test('BR and TR keep locale-specific comma decimal email displays', () => {
    expect(getCurrencyExpectationForIp('BR')).toMatchObject({
      currencyCode: 'BRL',
      symbol: 'R$',
      initialAmount: 9.9,
      monthlyAmount: 229
    })
    expect(formatAmountPaid('BR')).toBe('R$9,90 BRL')
    expect(formatMonthlyAmount('BR')).toBe('R$229,00 BRL')
    expect(getCurrencyExpectationForIp('TR')).toMatchObject({
      currencyCode: 'TRY',
      symbol: '₺',
      initialAmount: 59,
      monthlyAmount: 999
    })
    expect(formatAmountPaid('TR')).toBe('₺59,00 TRY')
    expect(formatMonthlyAmount('TR')).toBe('₺999,00 TRY')
  })

  test('PL keeps the zloty suffix display used by payment emails', () => {
    expect(getCurrencyExpectationForIp('PL')).toMatchObject({
      currencyCode: 'PLN',
      symbol: 'zł',
      initialAmount: 7.9,
      monthlyAmount: 149
    })
    expect(formatAmountPaid('PL')).toBe('7,90 zł')
    expect(formatMonthlyAmount('PL')).toBe('149,00 zł')
  })

  test('unknown IP and Default both fall back to EUR expectations', () => {
    expect(getCurrencyExpectationForIp('XX')).toMatchObject({
      currencyCode: 'EUR',
      symbol: '€',
      initialAmount: 1.95,
      monthlyAmount: 49.95
    })
    expect(getCurrencyExpectationForIp('Default')).toMatchObject({
      currencyCode: 'EUR',
      symbol: '€',
      initialAmount: 1.95,
      monthlyAmount: 49.95
    })
    expect(formatAmountPaid('XX')).toBe('€1.95 EUR')
    expect(formatMonthlyAmount('XX')).toBe('€49.95 EUR')
  })
})
