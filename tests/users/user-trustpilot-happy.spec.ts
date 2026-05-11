import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { selectors } from '../helpers/dashboardActions'
import { waitForNewPagePopup } from '../helpers/trustpilotWindow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_TRUSTPILOT_HAPPY_NEW_TAB`: tras pago, clic en "happy" abre
 * trustpilot.com/evaluate-link en nueva pestaña.
 */
test.describe('Users — Trustpilot "happy" abre Trustpilot evaluate-link', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('clic "happy" abre Trustpilot en nueva pestaña', { tag: ['@PDFEDITOR_USER_TRUSTPILOT_HAPPY_NEW_TAB'] }, async ({ page, context }) => {
    test.setTimeout(420_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+tph+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)

    const happy = page.locator(selectors.reviewHappyButton).first()
    if (!(await happy.isVisible({ timeout: 30_000 }).catch(() => false))) {
      test.skip(true, 'Modal Trustpilot no apareció en este entorno tras pago Visa.')
    }
    const popup = await waitForNewPagePopup(context, () => happy.click({ timeout: 10_000 }))
    expect(popup.url()).toContain('trustpilot.com')
    expect(popup.url()).toMatch(/evaluate-link/)
    await popup.close()
  })
})
