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

  test('success payment card pool contains only intended success presets', () => {
    expect([...SUCCESS_PAYMENT_CARD_NAMES]).toEqual([
      'Visa',
      'MasterCard',
      'AMEX',
      'Discover',
      'Dinners',
      'JCB'
    ])
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('Generic')
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('NoFunds')
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('CardLost')
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('UnionPay')
  })

  test('random success payment card samples lower and upper boundaries', () => {
    const originalRandom = Math.random
    try {
      Math.random = () => 0
      expect(sampleSuccessPaymentCardName()).toBe('Visa')

      Math.random = () => 0.999999
      expect(sampleSuccessPaymentCardName()).toBe('JCB')
    } finally {
      Math.random = originalRandom
    }
  })
})
