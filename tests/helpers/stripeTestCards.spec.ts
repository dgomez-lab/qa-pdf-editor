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

  test('success payment card names stay aligned with configured Stripe presets', () => {
    expect(SUCCESS_PAYMENT_CARD_NAMES).toEqual([
      'Visa',
      'MasterCard',
      'AMEX',
      'Discover',
      'Dinners',
      'JCB'
    ])
    expect(stripeCardForName('MasterCard').number).toBe('5555555555554444')
    expect(stripeCardForName('AMEX').number).toBe('378282246310005')
    expect(stripeCardForName('Discover').number).toBe('6011111111111117')
    expect(stripeCardForName('Dinners').number).toBe('30569309025904')
    expect(stripeCardForName('JCB').number).toBe('3530111333300000')
  })

  test('sampleSuccessPaymentCardName covers first and last cards from Math.random boundaries', () => {
    const random = Math.random
    try {
      Math.random = () => 0
      expect(sampleSuccessPaymentCardName()).toBe('Visa')

      Math.random = () => 0.999999
      expect(sampleSuccessPaymentCardName()).toBe('JCB')
    } finally {
      Math.random = random
    }
  })
})
