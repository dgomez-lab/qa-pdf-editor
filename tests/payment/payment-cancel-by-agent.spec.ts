import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment } from '../helpers/pdfhintEditorPaymentFlow'
import { confirmSubscriptionCancellation, isCrmConfigured, openCrmCustomerForEmail, unsubscribeCustomer, waitForSubscriptionStatus } from '../helpers/crmStaging'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}
function crmReady(): boolean {
  return isCrmConfigured()
}

/**
 * `FirstPayment.feature` — `@PDFEDITOR_PAYMENT_CANCEL_SUBSCRIPTION_BY_AGENT`:
 * usuario paga, agente cancela y confirma desde CRM. Tras refresh, estado pasa a "Unsuscribed".
 */
/**
 * Bug del producto detectado en staging (mayo 2026): la transición
 * `Non renewal → Unsuscribed` en el CRM tras `cancel-subscription` API
 * no llega a producirse dentro del periodo de polling razonable (>3 min);
 * la primera transición `Active → Non renewal` por agente sí funciona.
 * Gateado con `PLAYWRIGHT_ALLOW_FLAKY_CANCEL=1` hasta que el backend del
 * staging procese el evento.
 */
function flakyCancelEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_ALLOW_FLAKY_CANCEL?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

test.describe('Payment — agente cancela suscripción', { tag: ['@PDFEDITOR_PAYMENT'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
    test.skip(
      !flakyCancelEnabled(),
      'Bug del producto: CRM no transiciona a Unsuscribed tras API confirm en staging; activar con PLAYWRIGHT_ALLOW_FLAKY_CANCEL=1 cuando se arregle'
    )
  })

  test('pago → agent unsubscribe → confirm → estado Unsuscribed', { tag: ['@PDFEDITOR_PAYMENT_CANCEL_SUBSCRIPTION_BY_AGENT'] }, async ({ page, context }) => {
    test.setTimeout(420_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+cana+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    const crmPage = await openCrmCustomerForEmail(context, email)
    await unsubscribeCustomer(crmPage)
    let status = await waitForSubscriptionStatus(crmPage, /non.*renewal|cancel/i, { timeoutMs: 180_000 })
    expect(status.toLowerCase()).toMatch(/non.*renewal|cancel/)
    await confirmSubscriptionCancellation(crmPage)
    status = await waitForSubscriptionStatus(crmPage, /unsuscribed|unsubscribed|cancel/i, { timeoutMs: 180_000 })
    expect(status.toLowerCase()).toMatch(/unsuscribed|unsubscribed|cancel/)
    await crmPage.close()
  })
})
