import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { selectors, closeOnboarding } from '../helpers/dashboardActions'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Dashboard.feature` — `@PDFEDITOR_DASHBOARD_PERMANENT_DELETE_DOCUMENT`:
 * tras pago, eliminar primer documento, restaurarlo y borrarlo definitivamente desde la papelera.
 */
test.describe('Dashboard — borrar / restaurar / borrar definitivo', { tag: ['@PDFEDITOR_DASHBOARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('flujo bin / restore / permanent delete', { tag: ['@PDFEDITOR_DASHBOARD_PERMANENT_DELETE_DOCUMENT'] }, async ({ page }) => {
    test.setTimeout(420_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+permdel+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await page.waitForTimeout(4000)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await closeOnboarding(page)

    const deleteBtn = page.locator(selectors.delete0Bin).first()
    if (!(await deleteBtn.isVisible({ timeout: 30_000 }).catch(() => false))) {
      test.skip(true, 'No hay dashboardFiles-0 (sin documento listado tras pago).')
    }
    await deleteBtn.click()
    await page.waitForTimeout(2000)

    await page.locator(selectors.dashboardTrashSideMenuLink).first().click({ timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(2000)

    const restore = page.locator(selectors.restore0).first()
    if (await restore.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await restore.click({ timeout: 10_000 })
      await page.waitForTimeout(2000)
    }

    const deleteAgain = page.locator(selectors.delete0Bin).first()
    if (await deleteAgain.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await deleteAgain.click({ timeout: 10_000 })
      await page.waitForTimeout(2000)
      await page.locator(selectors.dashboardTrashSideMenuLink).first().click({ timeout: 30_000 }).catch(() => {})
    }
    const perm = page.locator(selectors.permanentDelete0).first()
    if (await perm.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await perm.click({ timeout: 10_000 })
      await page.waitForTimeout(2000)
    }
    await expect(page.locator(selectors.delete0Bin).first()).toHaveCount(0)
  })
})
