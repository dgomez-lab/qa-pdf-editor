import { test, expect } from '@playwright/test'
import { sampleSuccessPaymentCardName, stripeCardForName } from '../bdd/stripeTestCards'

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

  test('trims card names and falls back to Visa for unknown names', () => {
    expect(stripeCardForName(' MasterCard ').number).toBe('5555555555554444')
    expect(stripeCardForName('UnknownCard').number).toBe('4242424242424242')
  })

  test('UnionPay preset is available but not sampled as a default success card', () => {
    expect(stripeCardForName('UnionPay').number).toBe('6200000000000005')

    const originalRandom = Math.random
    const samples = [0, 0.17, 0.34, 0.5, 0.67, 0.99]
    let index = 0
    Math.random = () => samples[index++] ?? 0

    try {
      expect(Array.from({ length: samples.length }, () => sampleSuccessPaymentCardName())).toEqual([
        'Visa',
        'MasterCard',
        'AMEX',
        'Discover',
        'Dinners',
        'JCB'
      ])
    } finally {
      Math.random = originalRandom
    }
  })
})
