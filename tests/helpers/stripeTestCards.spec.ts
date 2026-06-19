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

  test('success sample pool contains only successful refund-flow cards', () => {
    expect(SUCCESS_PAYMENT_CARD_NAMES).toEqual([
      'Visa',
      'MasterCard',
      'AMEX',
      'Discover',
      'Dinners',
      'JCB'
    ])
  })

  test('sampleSuccessPaymentCardName selects the first success card at the lower boundary', () => {
    const prev = Math.random
    Math.random = () => 0
    try {
      expect(sampleSuccessPaymentCardName()).toBe('Visa')
    } finally {
      Math.random = prev
    }
  })

  test('sampleSuccessPaymentCardName selects the last success card below the upper boundary', () => {
    const prev = Math.random
    Math.random = () => 0.999999
    try {
      expect(sampleSuccessPaymentCardName()).toBe('JCB')
    } finally {
      Math.random = prev
    }
  })
})
