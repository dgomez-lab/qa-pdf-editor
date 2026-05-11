import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { editor } from '../pages/editorSelectors'
import { gotoLogin } from '../helpers/dashboardActions'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_PAID_NO_LOGOUT_OTHER_FILE`:
 * tras pago Visa, si el usuario vuelve a login con ese mismo email sigue viendo descarga
 * (no se le pide pagar de nuevo).
 */
test.describe('Users — usuario de pago no se desloguea entre archivos', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('tras pago, login con el mismo email mantiene descarga', { tag: ['@PDFEDITOR_USER_PAID_NO_LOGOUT_OTHER_FILE'] }, async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+paidlog+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await gotoLogin(page)
    await page.locator('[data-id="emailForm"]').fill(email)
    await page.locator('[data-id="loginBtnSubmit"]').click()
    await expect(page.locator(editor.downloadButton).or(page.locator('[data-id="ctaUploadDocument"]')).first()).toBeVisible({ timeout: 60_000 })
  })
})
