import { test, expect } from '@playwright/test'
import {
  SUCCESS_PAYMENT_CARD_NAMES,
  sampleSuccessPaymentCardName,
  stripeCardForName
} from '../bdd/stripeTestCards'

test.describe('stripeTestCards legacy parity', () => {
  test('Generic uses Stripe generic decline', () => {
    expect(stripeCardForName('Generic').number).toBe('4000000000000002')
  })

  test('NoFunds uses insufficient funds decline', () => {
    expect(stripeCardForName('NoFunds').number).toBe('4000000000009995')
  })

  test('CardLost uses lost card decline', () => {
    expect(stripeCardForName('CardLost').number).toBe('4000000000009987')
  })

  test('Visa uses success test card', () => {
    expect(stripeCardForName('Visa').number).toBe('4242424242424242')
  })

  test('random success cards include expected non-decline pool only', () => {
    expect(SUCCESS_PAYMENT_CARD_NAMES).toEqual(['Visa', 'MasterCard', 'AMEX', 'Discover', 'Dinners', 'JCB'])
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('UnionPay')

    const declineNumbers = new Set([
      stripeCardForName('Generic').number,
      stripeCardForName('NoFunds').number,
      stripeCardForName('CardLost').number
    ])

    for (const name of SUCCESS_PAYMENT_CARD_NAMES) {
      expect(declineNumbers.has(stripeCardForName(name).number)).toBe(false)
    }
  })

  test('random sampler can select every success card boundary', () => {
    const originalRandom = Math.random
    try {
      for (const [index, name] of SUCCESS_PAYMENT_CARD_NAMES.entries()) {
        Math.random = () => (index + 0.01) / SUCCESS_PAYMENT_CARD_NAMES.length
        expect(sampleSuccessPaymentCardName()).toBe(name)
      }
      Math.random = () => 0.999999
      expect(sampleSuccessPaymentCardName()).toBe(SUCCESS_PAYMENT_CARD_NAMES.at(-1))
    } finally {
      Math.random = originalRandom
    }
  })

  test('UnionPay preset is available but not used by random refund sampler', () => {
    expect(stripeCardForName('UnionPay').number).toBe('6200000000000005')
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('UnionPay')
  })

  test('unknown card names fall back to the default success card', () => {
    expect(stripeCardForName(' MissingPreset ').number).toBe(stripeCardForName('Visa').number)
  })
})
