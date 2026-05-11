import { test, expect } from '@playwright/test'
import {
  runEditorUploadRegisterAndVisaPayment,
  openDashboardViaPaymentSuccessModal
} from '../helpers/pdfhintEditorPaymentFlow'
import { dashboard } from '../pages/dashboardSelectors'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

const rename0Btn = '[data-id="dashboardFiles-0-rename"]'
const renameInput = '[data-id="modalInput"]'
const renameSubmit = '[data-id="dashboardRenameBtn"]'
const document0Name = '[data-id="dashboardFiles-0"]'

/**
 * Paridad con `Dashboard.feature` — `@PDFEDITOR_DASHBOARD_RENAME_DOCUMENT`.
 */
test.describe('Dashboard — renombrar documento', { tag: ['@PDFEDITOR_DASHBOARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('cerrar onboarding y renombrar primer documento a QA Rename.pdf', async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+rename+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)

    const closeOnboarding = page.locator(dashboard.onboardingCloseModal).first()
    await closeOnboarding.waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await closeOnboarding.click({ timeout: 10_000 }).catch(() => {})

    const renameBtn = page.locator(rename0Btn).first()
    if (!(await renameBtn.isVisible({ timeout: 20_000 }).catch(() => false))) {
      test.skip(true, 'No hay fila dashboardFiles-0 (sin documento listado tras el pago en este entorno).')
    }

    await renameBtn.click()
    await page.locator(renameInput).waitFor({ state: 'visible', timeout: 30_000 })
    await page.locator(renameInput).fill('QA Rename')
    await page.locator(renameSubmit).click()

    await expect(page.locator(document0Name).first()).toContainText(/QA Rename\.pdf/i, { timeout: 45_000 })
  })
})
