export type CurrencyExpectation = {
  symbol: string
  initialAmount: number
  currencyCode: string
  monthlyAmount: number
  emailInitialDisplay?: string
  emailMonthlyDisplay?: string
}

const IP = {
  US: 'US',
  ES: 'ES',
  CA: 'CA',
  AU: 'AU',
  GB: 'GB',
  JP: 'JP',
  BR: 'BR',
  TR: 'TR',
  PL: 'PL',
  Default: 'Default'
} as const

const CURRENCY_BY_IP: Record<string, CurrencyExpectation> = {
  [IP.US]: { symbol: '$', initialAmount: 1.95, currencyCode: 'USD', monthlyAmount: 49.95 },
  [IP.ES]: { symbol: '€', initialAmount: 1.95, currencyCode: 'EUR', monthlyAmount: 49.95 },
  [IP.CA]: { symbol: '$', initialAmount: 2.95, currencyCode: 'CAD', monthlyAmount: 49.95 },
  [IP.AU]: { symbol: '$', initialAmount: 2.95, currencyCode: 'AUD', monthlyAmount: 49.95 },
  [IP.GB]: { symbol: '£', initialAmount: 1.95, currencyCode: 'GBP', monthlyAmount: 49.95 },
  [IP.JP]: {
    symbol: '¥',
    initialAmount: 300,
    monthlyAmount: 7500,
    currencyCode: 'JPY',
    emailInitialDisplay: '¥300 JPY',
    emailMonthlyDisplay: '¥7500.00 JPY'
  },
  [IP.BR]: {
    symbol: 'R$',
    initialAmount: 9.9,
    monthlyAmount: 229,
    currencyCode: 'BRL',
    emailInitialDisplay: 'R$9,90 BRL',
    emailMonthlyDisplay: 'R$229,00 BRL'
  },
  [IP.TR]: {
    symbol: '₺',
    initialAmount: 59,
    monthlyAmount: 999,
    currencyCode: 'TRY',
    emailInitialDisplay: '₺59,00 TRY',
    emailMonthlyDisplay: '₺999,00 TRY'
  },
  [IP.PL]: {
    symbol: 'zł',
    initialAmount: 7.9,
    monthlyAmount: 149,
    currencyCode: 'PLN',
    emailInitialDisplay: '7,90 zł',
    emailMonthlyDisplay: '149,00 zł'
  },
  [IP.Default]: { symbol: '€', initialAmount: 1.95, currencyCode: 'EUR', monthlyAmount: 49.95 }
}

export function getCurrencyExpectationForIp(ip: string): CurrencyExpectation {
  const c = CURRENCY_BY_IP[ip]
  if (c) return c
  return CURRENCY_BY_IP[IP.Default]
}

export function formatAmountPaid(ip: string): string {
  const c = getCurrencyExpectationForIp(ip)
  if (c.emailInitialDisplay) return c.emailInitialDisplay
  const { symbol, initialAmount, currencyCode } = c
  return `${symbol}${initialAmount.toFixed(2)} ${currencyCode}`
}

export function formatMonthlyAmount(ip: string): string {
  const c = getCurrencyExpectationForIp(ip)
  if (c.emailMonthlyDisplay) return c.emailMonthlyDisplay
  const { symbol, monthlyAmount, currencyCode } = c
  return `${symbol}${monthlyAmount.toFixed(2)} ${currencyCode}`
}

export const EUR_DEFAULT_IP = IP.Default
