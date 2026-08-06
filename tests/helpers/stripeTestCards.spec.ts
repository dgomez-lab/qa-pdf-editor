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

  test('success brand presets keep Stripe test PANs and AMEX four-digit CVC', () => {
    expect(stripeCardForName('MasterCard')).toMatchObject({
      number: '5555555555554444',
      exp: '1234',
      cvc: '123'
    })
    expect(stripeCardForName('AMEX')).toMatchObject({
      number: '378282246310005',
      exp: '1234',
      cvc: '1234'
    })
    expect(stripeCardForName('Discover').number).toBe('6011111111111117')
    expect(stripeCardForName('Dinners').number).toBe('30569309025904')
    expect(stripeCardForName('JCB').number).toBe('3530111333300000')
    expect(stripeCardForName('UnionPay').number).toBe('6200000000000005')
  })

  test('unknown names fall back to the Visa success card after trim', () => {
    expect(stripeCardForName('  UnknownBrand  ')).toEqual(stripeCardForName('Visa'))
  })

  test('SUCCESS_PAYMENT_CARD_NAMES lists brands accepted for happy-path payments', () => {
    expect([...SUCCESS_PAYMENT_CARD_NAMES]).toEqual([
      'Visa',
      'MasterCard',
      'AMEX',
      'Discover',
      'Dinners',
      'JCB'
    ])
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('UnionPay')
    expect(SUCCESS_PAYMENT_CARD_NAMES).not.toContain('Generic')
  })

  test('sampleSuccessPaymentCardName returns a configured success brand', () => {
    for (let i = 0; i < 20; i++) {
      expect(SUCCESS_PAYMENT_CARD_NAMES).toContain(sampleSuccessPaymentCardName())
    }
  })
})
