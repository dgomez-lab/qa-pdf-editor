import { test, expect, type Frame, type Page } from '@playwright/test'
import { fillStripePaymentLikeLegacy } from './stripePayment'

const testCard = {
  number: '4242424242424242',
  exp: '1234',
  cvc: '123'
}

async function renderStripePaymentForm(page: Page): Promise<Frame> {
  await page.setContent(`
    <button type="button"><img src="/icons/checkout-flow/card.svg" alt="">Pay with card</button>
    <iframe title="Secure payment input frame"></iframe>
    <select id="payment-countryInput">
      <option value="">Select country</option>
      <option value="ES">Spain</option>
      <option value="US">United States</option>
    </select>
    <input id="payment-postalCodeInput" />
  `)

  const frameHandle = await page.locator('iframe[title="Secure payment input frame"]').elementHandle()
  const frame = await frameHandle?.contentFrame()
  if (!frame) throw new Error('Missing synthetic Stripe frame')
  await frame.setContent(`
    <input name="number" />
    <input name="expiry" />
    <input name="cvc" />
  `)
  return frame
}

test.describe('fillStripePaymentLikeLegacy', () => {
  test('fills unified Stripe card fields and US billing fields for US test IP', async ({ page }) => {
    const frame = await renderStripePaymentForm(page)

    await fillStripePaymentLikeLegacy(page, testCard, { testIp: 'US' })

    await expect(frame.locator("input[name='number']")).toHaveValue(testCard.number)
    await expect(frame.locator("input[name='expiry']")).toHaveValue(testCard.exp)
    await expect(frame.locator("input[name='cvc']")).toHaveValue(testCard.cvc)
    await expect(page.locator('#payment-countryInput')).toHaveValue('US')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('90210')
  })

  test('leaves optional billing fields unchanged for unsupported test IP', async ({ page }) => {
    const frame = await renderStripePaymentForm(page)

    await fillStripePaymentLikeLegacy(page, testCard, { testIp: 'ES' })

    await expect(frame.locator("input[name='number']")).toHaveValue(testCard.number)
    await expect(frame.locator("input[name='expiry']")).toHaveValue(testCard.exp)
    await expect(frame.locator("input[name='cvc']")).toHaveValue(testCard.cvc)
    await expect(page.locator('#payment-countryInput')).toHaveValue('')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('')
  })
})
