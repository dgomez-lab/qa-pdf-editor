import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { selectors } from '../helpers/dashboardActions'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Dashboard.feature` — `@PDFEDITOR_DASHBOARD_PAYMENT`:
 * tras flow Dashboard + open form 0, el botón "get full access" deja de mostrarse (usuario ya tiene pago).
 */
test.describe('Dashboard — payment status (banner)', { tag: ['@PDFEDITOR_DASHBOARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('tras pago, el botón get-full-access ya no aparece', { tag: ['@PDFEDITOR_DASHBOARD_PAYMENT'] }, async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+dashpayment+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)

    await page.waitForTimeout(2000)
    const getFullAccess = page.locator(selectors.getFullAccessButton).first()
    await expect(getFullAccess).toHaveCount(0)
  })
})
