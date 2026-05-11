import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import { blockCustomer, isCrmConfigured, openCrmCustomerForEmail, readSubscriptionStatus } from '../helpers/crmStaging'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}
function crmReady(): boolean {
  return isCrmConfigured()
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_AGENT_BLOCK_USER`: agente bloquea al usuario y el cliente
 * recibe error en login.
 */
test.describe('Users — agente bloquea cuenta', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
  })

  test('agente bloquea: estado cambia y login rechaza al usuario', { tag: ['@PDFEDITOR_USER_AGENT_BLOCK_USER'] }, async ({ page, context }) => {
    test.setTimeout(420_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+block+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    const crmPage = await openCrmCustomerForEmail(context, email)
    await blockCustomer(crmPage)
    await page.waitForTimeout(2000)
    await crmPage.reload({ waitUntil: 'domcontentloaded' })
    const status = await readSubscriptionStatus(crmPage)
    expect(status.toLowerCase()).toMatch(/block|baneado|bloque/)
    await crmPage.close()
  })
})
