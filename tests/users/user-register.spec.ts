import { test } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import { isCrmConfigured, openCrmCustomerForEmail, readSubscriptionStatus } from '../helpers/crmStaging'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}
function crmReady(): boolean {
  return isCrmConfigured()
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_REGISTER`: tras flujo Default + pago, CRM marca al usuario como Registered.
 */
test.describe('Users — registro tras flow Default', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER y PLAYWRIGHT_CRM_PASSWORD')
  })

  test('cliente aparece en CRM con estado Registered', { tag: ['@PDFEDITOR_USER_REGISTER'] }, async ({ page, context }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+register+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    const crmPage = await openCrmCustomerForEmail(context, email)
    const status = await readSubscriptionStatus(crmPage)
    const { expect } = await import('@playwright/test')
    expect(status.toLowerCase()).toContain('register')
    await crmPage.close()
  })
})
