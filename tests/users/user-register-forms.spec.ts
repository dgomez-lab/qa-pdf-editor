import { test, expect } from '@playwright/test'
import { openHome, dismissCookiesIfPresent } from '../helpers/navigation'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { gotoAccount } from '../helpers/dashboardActions'
import { gotoMembership, accountSelectors } from '../helpers/accountActions'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_REGISTER_FORMS`: registro accediendo por la ruta /forms (flow Forms).
 */
test.describe('Users — registro vía Forms', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flow Forms: registro + membership activa', { tag: ['@PDFEDITOR_USER_REGISTER_FORMS'] }, async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+regforms+${unique}@example.com`

    await openHome(page)
    await dismissCookiesIfPresent(page)
    // Llegada vía la página de formularios (equivalente a flow Forms del legacy).
    await page.goto('/forms', { waitUntil: 'domcontentloaded' }).catch(() => {})

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await gotoAccount(page)
    await gotoMembership(page)
    await expect(page.locator(accountSelectors.activeStatus).first()).toBeVisible({ timeout: 60_000 })
  })
})
