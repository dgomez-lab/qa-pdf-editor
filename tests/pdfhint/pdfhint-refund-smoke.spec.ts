import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import {
  isCrmConfigured,
  openCrmCustomerForEmail,
  readTransactionRowCells,
  refundLastPaymentLikeLegacy
} from '../helpers/crmStaging'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

function crmEnvReady(): boolean {
  return isCrmConfigured()
}

test.describe('PDF Hint — smoke refund (CRM)', { tag: ['@PDFEDITOR_PAYMENT', '@PDFEDITOR_PDFHINT_SMOKE_REFUND'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmEnvReady(), 'PLAYWRIGHT_CRM_USER y PLAYWRIGHT_CRM_PASSWORD (opcional PLAYWRIGHT_CRM_BASE_URL)')
  })

  test('pago Visa + refund en CRM + fila Refund', async ({ page, context }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await page.waitForTimeout(5000)

    const crmPage = await openCrmCustomerForEmail(context, email)
    await refundLastPaymentLikeLegacy(crmPage)
    await crmPage.reload({ waitUntil: 'domcontentloaded' })

    const cells = await readTransactionRowCells(crmPage)
    expect(cells[4]?.toLowerCase()).toContain('refund')
    expect(cells[5]?.toLowerCase()).toContain('success')
    expect(cells[9]?.toLowerCase()).toContain('stripe')
    expect(cells[6]).toMatch(/1\.95/)
    expect(cells[7]).toMatch(/EUR/i)
    expect(cells[16]).toMatch(/full access/i)

    await crmPage.close()
  })
})
