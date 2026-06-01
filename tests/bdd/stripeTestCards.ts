export type StripeCard = { number: string; exp: string; cvc: string }

const DEFAULT: StripeCard = {
  number: process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242',
  exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
  cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123'
}

const PRESETS: Record<string, StripeCard> = {
  Visa: DEFAULT,
  MasterCard: {
    number: process.env.STRIPE_TEST_MASTERCARD_NUMBER ?? '5555555555554444',
    exp: process.env.STRIPE_TEST_MASTERCARD_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_MASTERCARD_CVC ?? '123'
  },
  AMEX: {
    number: process.env.STRIPE_TEST_AMEX_NUMBER ?? '378282246310005',
    exp: process.env.STRIPE_TEST_AMEX_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_AMEX_CVC ?? '1234'
  },
  Discover: {
    number: process.env.STRIPE_TEST_DISCOVER_NUMBER ?? '6011111111111117',
    exp: process.env.STRIPE_TEST_DISCOVER_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_DISCOVER_CVC ?? '123'
  },
  Dinners: {
    number: process.env.STRIPE_TEST_DINERS_NUMBER ?? '30569309025904',
    exp: process.env.STRIPE_TEST_DINERS_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_DINERS_CVC ?? '123'
  },
  JCB: {
    number: process.env.STRIPE_TEST_JCB_NUMBER ?? '3530111333300000',
    exp: process.env.STRIPE_TEST_JCB_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_JCB_CVC ?? '123'
  },
  UnionPay: {
    number: process.env.STRIPE_TEST_UNIONPAY_NUMBER ?? '6200000000000005',
    exp: process.env.STRIPE_TEST_UNIONPAY_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_UNIONPAY_CVC ?? '123'
  },
  Generic: {
    number: process.env.STRIPE_TEST_DECLINE_NUMBER ?? '4000000000000002',
    exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123'
  },
  NoFunds: {
    number: process.env.STRIPE_TEST_INSUFFICIENT_NUMBER ?? '4000000000009995',
    exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123'
  },
  CardLost: {
    number: process.env.STRIPE_TEST_LOST_NUMBER ?? '4000000000009987',
    exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
    cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123'
  }
}

export const SUCCESS_PAYMENT_CARD_NAMES = [
  'Visa',
  'MasterCard',
  'AMEX',
  'Discover',
  'Dinners',
  'JCB'
] as const

export function sampleSuccessPaymentCardName(): (typeof SUCCESS_PAYMENT_CARD_NAMES)[number] {
  const i = Math.floor(Math.random() * SUCCESS_PAYMENT_CARD_NAMES.length)
  return SUCCESS_PAYMENT_CARD_NAMES[i]!
}

export function stripeCardForName(name: string): StripeCard {
  const k = name.trim()
  return PRESETS[k] ?? DEFAULT
}
