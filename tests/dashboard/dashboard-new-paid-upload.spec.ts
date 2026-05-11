import { test, expect } from '@playwright/test'
import {
  runEditorUploadRegisterAndVisaPayment,
  openDashboardViaPaymentSuccessModal
} from '../helpers/pdfhintEditorPaymentFlow'
import { editor } from '../pages/editorSelectors'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Paridad con `Dashboard.feature` — `@PDFEDITOR_DASHBOARD` / escenario "Dashboard for new paid users"
 * (flujo Default: pago inicial → modal éxito → Dashboard con `ctaUploadDocument`).
 */
test.describe('Dashboard — usuario de pago nuevo', { tag: ['@PDFEDITOR_DASHBOARD'] }, () => {
  test.beforeEach(() => {
    test.skip(
      !paymentSmokeEnabled(),
      'Requiere PLAYWRIGHT_PAYMENT_SMOKE=1 (mismo entorno que smoke Visa / CRM refund).'
    )
  })

  test('tras Visa, modal post-pago lleva al Dashboard y aparece subir documento', async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+dashpaid+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)

    await expect(page.locator(editor.uploadDocumentButton).first()).toBeVisible({ timeout: 30_000 })
  })
})
