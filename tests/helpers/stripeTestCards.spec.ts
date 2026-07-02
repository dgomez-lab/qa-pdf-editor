import { test, expect } from '@playwright/test'
import {
  sampleSuccessPaymentCardName,
  stripeCardForName,
  SUCCESS_PAYMENT_CARD_NAMES
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

  test('all success payment card names resolve to their expected presets', () => {
    const expectedNumbers = new Map([
      ['Visa', '4242424242424242'],
      ['MasterCard', '5555555555554444'],
      ['AMEX', '378282246310005'],
      ['Discover', '6011111111111117'],
      ['Dinners', '30569309025904'],
      ['JCB', '3530111333300000']
    ])

    for (const cardName of SUCCESS_PAYMENT_CARD_NAMES) {
      expect(stripeCardForName(cardName).number, cardName).toBe(expectedNumbers.get(cardName))
    }
  })

  test('unknown card names fall back to the default success card after trimming', () => {
    expect(stripeCardForName(' Unknown ').number).toBe('4242424242424242')
  })

  test('sampleSuccessPaymentCardName samples within the success card list bounds', () => {
    const originalRandom = Math.random
    const samples = [
      { randomValue: 0, cardName: 'Visa' },
      { randomValue: 1 / SUCCESS_PAYMENT_CARD_NAMES.length, cardName: 'MasterCard' },
      { randomValue: 3 / SUCCESS_PAYMENT_CARD_NAMES.length, cardName: 'Discover' },
      { randomValue: 0.999999, cardName: 'JCB' }
    ]

    try {
      for (const { randomValue, cardName } of samples) {
        Math.random = () => randomValue
        expect(sampleSuccessPaymentCardName()).toBe(cardName)
      }
    } finally {
      Math.random = originalRandom
    }
  })
})
