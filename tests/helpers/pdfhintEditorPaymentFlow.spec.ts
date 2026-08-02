import { test, expect } from '@playwright/test'
import { matchesStripeDeclineMessage } from './pdfhintEditorPaymentFlow'

test.describe('matchesStripeDeclineMessage', () => {
  test('detects English and localized Stripe decline copy', () => {
    expect(matchesStripeDeclineMessage('Your card was declined.')).toBe(true)
    expect(matchesStripeDeclineMessage('Tarjeta rechazada por el banco')).toBe(true)
    expect(matchesStripeDeclineMessage('Votre carte a été déclinée')).toBe(true)
    expect(matchesStripeDeclineMessage('Karte abgelehnt')).toBe(true)
    expect(matchesStripeDeclineMessage('Pagamento rifiutato')).toBe(true)
    expect(matchesStripeDeclineMessage('Your card has insufficient funds.')).toBe(true)
    expect(matchesStripeDeclineMessage('Fondos insuficientes')).toBe(true)
    expect(matchesStripeDeclineMessage('Your card has expired')).toBe(true)
    expect(matchesStripeDeclineMessage('Incorrect CVC code')).toBe(true)
    expect(matchesStripeDeclineMessage('カードが期限切れです')).toBe(true)
  })

  test('does not match unrelated payment UI copy', () => {
    expect(matchesStripeDeclineMessage('Payment Success!')).toBe(false)
    expect(matchesStripeDeclineMessage('Continue to payment')).toBe(false)
    expect(matchesStripeDeclineMessage('Download your PDF')).toBe(false)
    expect(matchesStripeDeclineMessage('')).toBe(false)
  })
})
