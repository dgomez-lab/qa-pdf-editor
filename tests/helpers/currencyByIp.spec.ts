import { test, expect } from '@playwright/test'
import { formatAmountPaid, formatMonthlyAmount, getCurrencyExpectationForIp } from './currencyByIp'

const currencyCases = [
  {
    ip: 'US',
    currencyCode: 'USD',
    symbol: '$',
    initialAmount: 1.95,
    monthlyAmount: 49.95,
    paidDisplay: '$1.95 USD',
    monthlyDisplay: '$49.95 USD'
  },
  {
    ip: 'ES',
    currencyCode: 'EUR',
    symbol: '€',
    initialAmount: 1.95,
    monthlyAmount: 49.95,
    paidDisplay: '€1.95 EUR',
    monthlyDisplay: '€49.95 EUR'
  },
  {
    ip: 'CA',
    currencyCode: 'CAD',
    symbol: '$',
    initialAmount: 2.95,
    monthlyAmount: 49.95,
    paidDisplay: '$2.95 CAD',
    monthlyDisplay: '$49.95 CAD'
  },
  {
    ip: 'AU',
    currencyCode: 'AUD',
    symbol: '$',
    initialAmount: 2.95,
    monthlyAmount: 49.95,
    paidDisplay: '$2.95 AUD',
    monthlyDisplay: '$49.95 AUD'
  },
  {
    ip: 'GB',
    currencyCode: 'GBP',
    symbol: '£',
    initialAmount: 1.95,
    monthlyAmount: 49.95,
    paidDisplay: '£1.95 GBP',
    monthlyDisplay: '£49.95 GBP'
  },
  {
    ip: 'JP',
    currencyCode: 'JPY',
    symbol: '¥',
    initialAmount: 300,
    monthlyAmount: 7500,
    paidDisplay: '¥300 JPY',
    monthlyDisplay: '¥7500.00 JPY'
  },
  {
    ip: 'BR',
    currencyCode: 'BRL',
    symbol: 'R$',
    initialAmount: 9.9,
    monthlyAmount: 229,
    paidDisplay: 'R$9,90 BRL',
    monthlyDisplay: 'R$229,00 BRL'
  },
  {
    ip: 'TR',
    currencyCode: 'TRY',
    symbol: '₺',
    initialAmount: 59,
    monthlyAmount: 999,
    paidDisplay: '₺59,00 TRY',
    monthlyDisplay: '₺999,00 TRY'
  },
  {
    ip: 'PL',
    currencyCode: 'PLN',
    symbol: 'zł',
    initialAmount: 7.9,
    monthlyAmount: 149,
    paidDisplay: '7,90 zł',
    monthlyDisplay: '149,00 zł'
  },
  {
    ip: 'Default',
    currencyCode: 'EUR',
    symbol: '€',
    initialAmount: 1.95,
    monthlyAmount: 49.95,
    paidDisplay: '€1.95 EUR',
    monthlyDisplay: '€49.95 EUR'
  }
]

test.describe('currencyByIp payment display mapping', () => {
  for (const c of currencyCases) {
    test(`${c.ip} returns ${c.currencyCode} amounts used by refund scenarios`, () => {
      expect(getCurrencyExpectationForIp(c.ip)).toMatchObject({
        currencyCode: c.currencyCode,
        symbol: c.symbol,
        initialAmount: c.initialAmount,
        monthlyAmount: c.monthlyAmount
      })
      expect(formatAmountPaid(c.ip)).toBe(c.paidDisplay)
      expect(formatMonthlyAmount(c.ip)).toBe(c.monthlyDisplay)
    })
  }

  test('unknown IP falls back to the EUR default display', () => {
    expect(getCurrencyExpectationForIp('unknown')).toEqual(getCurrencyExpectationForIp('Default'))
    expect(formatAmountPaid('unknown')).toBe('€1.95 EUR')
    expect(formatMonthlyAmount('unknown')).toBe('€49.95 EUR')
  })
})
