import { expect, test, type FrameLocator, type Page } from '@playwright/test'
import { fillStripePaymentLikeLegacy } from './stripePayment'

const visaCard = {
  number: '4242424242424242',
  exp: '1234',
  cvc: '123'
}

async function setStripeLikePaymentForm(
  page: Page,
  billing: { country: string; postal: string } = { country: 'ES', postal: '' }
): Promise<FrameLocator> {
  const iframeHtml = `
    <html>
      <body>
        <input name="number" />
        <input name="expiry" />
        <input name="cvc" />
      </body>
    </html>
  `

  await page.setContent(`
    <button type="button">Pay with card</button>
    <iframe
      src="https://js.stripe.com/v3/elements-inner-payment?componentName=payment"
      srcdoc="${iframeHtml.replace(/"/g, '&quot;')}"
    ></iframe>
    <select id="payment-countryInput" name="country">
      <option value="ES"${billing.country === 'ES' ? ' selected' : ''}>Spain</option>
      <option value="US"${billing.country === 'US' ? ' selected' : ''}>United States</option>
    </select>
    <input id="payment-postalCodeInput" name="postalCode" value="${billing.postal}" />
  `)

  return page.frameLocator("iframe[src*='componentName=payment']")
}

test.describe('fillStripePaymentLikeLegacy billing by test IP', () => {
  test('fills US billing fields after Stripe card details', async ({ page }) => {
    const frame = await setStripeLikePaymentForm(page)

    await fillStripePaymentLikeLegacy(page, visaCard, { testIp: ' US ' })

    await expect(frame.locator("input[name='number']")).toHaveValue(visaCard.number)
    await expect(frame.locator("input[name='expiry']")).toHaveValue(visaCard.exp)
    await expect(frame.locator("input[name='cvc']")).toHaveValue(visaCard.cvc)
    await expect(page.locator('#payment-countryInput')).toHaveValue('US')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('90210')
  })

  test('leaves billing fields unchanged for unsupported or default IPs', async ({ page }) => {
    for (const testIp of ['Default', 'FR']) {
      const frame = await setStripeLikePaymentForm(page, { country: 'ES', postal: '28001' })

      await fillStripePaymentLikeLegacy(page, visaCard, { testIp })

      await expect(frame.locator("input[name='number']")).toHaveValue(visaCard.number)
      await expect(page.locator('#payment-countryInput')).toHaveValue('ES')
      await expect(page.locator('#payment-postalCodeInput')).toHaveValue('28001')
    }
  })
})
