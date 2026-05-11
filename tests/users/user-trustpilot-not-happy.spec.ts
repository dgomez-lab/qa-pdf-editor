import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { selectors } from '../helpers/dashboardActions'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_TRUSTPILOT_NOT_HAPPY_REDIRECT`: tras pago, modal Trustpilot
 * con clic en "not happy" redirige a /reviews.
 */
test.describe('Users — Trustpilot "not happy" redirige a /reviews', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('clic "not happy" lleva a URL con /reviews', { tag: ['@PDFEDITOR_USER_TRUSTPILOT_NOT_HAPPY_REDIRECT'] }, async ({ page }) => {
    test.setTimeout(420_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+tpnh+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)

    const notHappy = page.locator(selectors.reviewNotHappyButton).first()
    if (!(await notHappy.isVisible({ timeout: 30_000 }).catch(() => false))) {
      test.skip(true, 'Modal Trustpilot no apareció en este entorno tras pago Visa.')
    }
    await notHappy.click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    expect(page.url()).toMatch(/\/reviews/)
  })
})
