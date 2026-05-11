import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { gotoAccount } from '../helpers/dashboardActions'
import { gotoMembership, accountSelectors } from '../helpers/accountActions'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_REGISTER_ACTIVE`: registro + activación via membership.
 */
test.describe('Users — registro y membresía activa', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('tras pago, /account → membership muestra estado activo', { tag: ['@PDFEDITOR_USER_REGISTER_ACTIVE'] }, async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+regactive+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await gotoAccount(page)
    await gotoMembership(page)
    await expect(page.locator(accountSelectors.activeStatus).first()).toBeVisible({ timeout: 60_000 })
  })
})
