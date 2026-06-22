import { test, expect } from '@playwright/test'
import { fillStripePaymentLikeLegacy } from './stripePayment'
import { editor } from '../pages/editorSelectors'

const card = {
  number: '4242424242424242',
  exp: '1234',
  cvc: '123'
}

async function mountUnifiedStripePaymentFixture(page: import('@playwright/test').Page): Promise<void> {
  await page.setContent(`
    <button type="button">
      <img src="/icons/checkout-flow/card.svg" alt="" />
      Pay with card
    </button>
    <iframe
      src="https://js.stripe.com/v3/elements-inner-payment?componentName=payment"
      srcdoc="
        <input name='number' />
        <input name='expiry' />
        <input name='cvc' />
      "
    ></iframe>
    <select id="payment-countryInput">
      <option value="ES">Spain</option>
      <option value="US">United States</option>
    </select>
    <input id="payment-postalCodeInput" />
  `)
}

test.describe('stripe payment legacy fill helper', () => {
  test('fills unified Stripe payment frame and US billing fields for US test IP', async ({ page }) => {
    await mountUnifiedStripePaymentFixture(page)

    await fillStripePaymentLikeLegacy(page, card, { testIp: 'US' })

    const stripeFrame = page.frameLocator(editor.stripePaymentIframe)
    await expect(stripeFrame.locator("input[name='number']")).toHaveValue(card.number)
    await expect(stripeFrame.locator("input[name='expiry']")).toHaveValue(card.exp)
    await expect(stripeFrame.locator("input[name='cvc']")).toHaveValue(card.cvc)
    await expect(page.locator('#payment-countryInput')).toHaveValue('US')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('90210')
  })

  test('leaves billing fields unchanged for unsupported test IPs', async ({ page }) => {
    await mountUnifiedStripePaymentFixture(page)

    await fillStripePaymentLikeLegacy(page, card, { testIp: 'ES' })

    await expect(page.locator('#payment-countryInput')).toHaveValue('ES')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('')
  })
})
