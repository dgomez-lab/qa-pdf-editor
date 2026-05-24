import { test, expect } from '@playwright/test'
import { maybeFillStripeBillingForTestIp, stripeBillingForTestIp } from './stripePayment'

test.describe('stripePayment billing by test IP', () => {
  test('maps trimmed US test IP to Stripe billing fields', () => {
    expect(stripeBillingForTestIp(' US ')).toEqual({ country: 'US', postal: '90210' })
  })

  test('does not map empty or unsupported test IP values', () => {
    expect(stripeBillingForTestIp()).toBeUndefined()
    expect(stripeBillingForTestIp('')).toBeUndefined()
    expect(stripeBillingForTestIp('Default')).toBeUndefined()
    expect(stripeBillingForTestIp('ES')).toBeUndefined()
  })

  test('fills country and postal code for visible US billing fields', async ({ page }) => {
    await page.setContent(`
      <select id="payment-countryInput">
        <option value="ES">Spain</option>
        <option value="US">United States</option>
      </select>
      <input id="payment-postalCodeInput" value="" />
    `)

    await maybeFillStripeBillingForTestIp(page, 'US')

    await expect(page.locator('#payment-countryInput')).toHaveValue('US')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('90210')
  })

  test('leaves billing fields unchanged for unsupported test IP values', async ({ page }) => {
    await page.setContent(`
      <select id="payment-countryInput">
        <option value="ES" selected>Spain</option>
        <option value="US">United States</option>
      </select>
      <input id="payment-postalCodeInput" value="28001" />
    `)

    await maybeFillStripeBillingForTestIp(page, 'ES')

    await expect(page.locator('#payment-countryInput')).toHaveValue('ES')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('28001')
  })

  test('skips US billing when the postal code field is not visible yet', async ({ page }) => {
    await page.setContent(`
      <select id="payment-countryInput">
        <option value="ES" selected>Spain</option>
        <option value="US">United States</option>
      </select>
      <input id="payment-postalCodeInput" value="28001" hidden />
    `)

    await maybeFillStripeBillingForTestIp(page, 'US')

    await expect(page.locator('#payment-countryInput')).toHaveValue('ES')
    await expect(page.locator('#payment-postalCodeInput')).toHaveValue('28001')
  })
})
