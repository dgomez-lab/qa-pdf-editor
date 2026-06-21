import { test, expect, type Page } from '@playwright/test'
import { fillStripePaymentLikeLegacy } from './stripePayment'

const visa = {
  number: '4242424242424242',
  exp: '1234',
  cvc: '123'
}

function escapedSrcdoc(html: string): string {
  return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

async function mountUnifiedStripePayment(page: Page): Promise<void> {
  const stripeFrame = escapedSrcdoc(`
    <html>
      <body>
        <input name="number" />
        <input name="expiry" />
        <input name="cvc" />
      </body>
    </html>
  `)

  await page.setContent(`
    <button type="button">
      <img src="/icons/checkout-flow/card.svg" alt="" />
      Pay with card
    </button>
    <iframe
      title="Secure payment input frame"
      src="https://js.stripe.com/v3/elements-inner-payment?componentName=payment"
      srcdoc="${stripeFrame}">
    </iframe>
    <select id="payment-countryInput" name="country">
      <option value="ES">Spain</option>
      <option value="US">United States</option>
    </select>
    <input id="payment-postalCodeInput" name="postalCode" />
  `)
}

test.describe('stripePayment legacy fill helper', () => {
  test('fills unified Stripe card fields and US billing details for US test ip', async ({ page }) => {
    await mountUnifiedStripePayment(page)

    await fillStripePaymentLikeLegacy(page, visa, { testIp: 'US' })

    const frame = page.frameLocator('iframe[title="Secure payment input frame"]')
    await expect(frame.locator('input[name="number"]')).toHaveValue(visa.number)
    await expect(frame.locator('input[name="expiry"]')).toHaveValue(visa.exp)
    await expect(frame.locator('input[name="cvc"]')).toHaveValue(visa.cvc)
    await expect(page.locator('#payment-countryInput')).toHaveValue('US')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('90210')
  })

  test('leaves billing details unchanged for unsupported test ip', async ({ page }) => {
    await mountUnifiedStripePayment(page)

    await fillStripePaymentLikeLegacy(page, visa, { testIp: 'ES' })

    const frame = page.frameLocator('iframe[title="Secure payment input frame"]')
    await expect(frame.locator('input[name="number"]')).toHaveValue(visa.number)
    await expect(frame.locator('input[name="expiry"]')).toHaveValue(visa.exp)
    await expect(frame.locator('input[name="cvc"]')).toHaveValue(visa.cvc)
    await expect(page.locator('#payment-countryInput')).toHaveValue('ES')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('')
  })
})
