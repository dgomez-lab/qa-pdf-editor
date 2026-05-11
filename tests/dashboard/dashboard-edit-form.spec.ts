import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { closeOnboarding, selectors } from '../helpers/dashboardActions'
import { clickNextButton } from '../helpers/editorActions'
import { editor } from '../pages/editorSelectors'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Dashboard.feature` — `@PDFEDITOR_DASHBOARD_EDIT_FORM`:
 * abrir formulario 0 desde "Most used forms", completar el siguiente paso y volver a Dashboard.
 */
test.describe('Dashboard — abrir formulario más usado', { tag: ['@PDFEDITOR_DASHBOARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('open form 0 → next → payment success → dashboard', { tag: ['@PDFEDITOR_DASHBOARD_EDIT_FORM'] }, async ({ page }) => {
    test.setTimeout(420_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+editform+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await page.waitForTimeout(2000)
    await closeOnboarding(page)

    const openForm = page.locator(selectors.openForm0Button).first()
    if (!(await openForm.isVisible({ timeout: 30_000 }).catch(() => false))) {
      test.skip(true, 'No hay openForm-0 (entorno sin formularios).')
    }
    await openForm.click({ timeout: 10_000 })
    await page.waitForURL(/editor/i, { timeout: 60_000 }).catch(() => {})
    await clickNextButton(page)
    await expect(page.locator(editor.downloadButton).or(page.locator(`xpath=${editor.paymentSuccessDownloadButton}`)).first()).toBeVisible({ timeout: 60_000 })
  })
})
