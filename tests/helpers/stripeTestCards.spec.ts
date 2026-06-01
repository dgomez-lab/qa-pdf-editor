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

  test('success card sampler only includes successful payment cards', () => {
    expect(SUCCESS_PAYMENT_CARD_NAMES).toEqual([
      'Visa',
      'MasterCard',
      'AMEX',
      'Discover',
      'Dinners',
      'JCB'
    ])

    const declineNumbers = new Set(['4000000000000002', '4000000000009995', '4000000000009987'])

    for (const cardName of SUCCESS_PAYMENT_CARD_NAMES) {
      expect(declineNumbers.has(stripeCardForName(cardName).number)).toBe(false)
    }
  })

  test('success card sampler maps random boundaries to valid indices', () => {
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
