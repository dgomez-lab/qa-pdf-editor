import { test, expect, type Page } from '@playwright/test'
import { fillStripePaymentLikeLegacy } from './stripePayment'

const card = {
  number: '4242424242424242',
  exp: '1234',
  cvc: '123'
}

async function loadPaymentPage(page: Page) {
  await page.setContent(`
    <button type="button">Pay with card</button>
    <iframe
      title="Secure payment input frame"
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

test.describe('fillStripePaymentLikeLegacy', () => {
  test('fills card fields and US billing for a US test IP', async ({ page }) => {
    await loadPaymentPage(page)

    await fillStripePaymentLikeLegacy(page, card, { testIp: ' US ' })

    const frame = page.frameLocator('iframe[title="Secure payment input frame"]')
    await expect(frame.locator("input[name='number']")).toHaveValue(card.number)
    await expect(frame.locator("input[name='expiry']")).toHaveValue(card.exp)
    await expect(frame.locator("input[name='cvc']")).toHaveValue(card.cvc)
    await expect(page.locator('#payment-countryInput')).toHaveValue('US')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('90210')
  })

  test('leaves billing fields unchanged for unsupported test IPs', async ({ page }) => {
    await loadPaymentPage(page)

    await fillStripePaymentLikeLegacy(page, card, { testIp: 'ES' })

    const frame = page.frameLocator('iframe[title="Secure payment input frame"]')
    await expect(frame.locator("input[name='number']")).toHaveValue(card.number)
    await expect(page.locator('#payment-countryInput')).toHaveValue('ES')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('')
  })
})
