import { test, expect } from '@playwright/test'
import { expectLastTransactionMatches, getSubscriptionId, isCrmConfigured, loginCrmAndOpenCustomers, searchAndOpenFirstCustomer } from '../helpers/crmStaging'
import { payLegacyRecurrence, waitForRecurrenceToFinish } from '../helpers/recurrencesApi'

function crmReady(): boolean {
  return isCrmConfigured()
}
function recurrenceApiReady(): boolean {
  return !!process.env.PLAYWRIGHT_RECURRENCE_API_BASE_URL?.trim()
}

/**
 * `Recurrences.feature` — `@PDFEDITOR_PAYMENT_RECURRENCE_LEGACY_14056`:
 * dispara la recurrencia 14056 (success) en API y valida la fila Worldpay USD 29.95 en CRM.
 */
test.describe('Recurrences — legacy 14056 (success)', { tag: ['@PDFEDITOR_PAYMENT'] }, () => {
  test.beforeEach(() => {
    test.skip(!crmReady(), 'PLAYWRIGHT_CRM_USER/PASSWORD')
    test.skip(!recurrenceApiReady(), 'PLAYWRIGHT_RECURRENCE_API_BASE_URL')
  })

  test('14056 success → Worldpay USD 29.95 en CRM', { tag: ['@PDFEDITOR_PAYMENT_RECURRENCE_LEGACY_14056'] }, async ({ page }) => {
    test.setTimeout(360_000)
    const email = process.env.PLAYWRIGHT_RECURRENCE_TARGET_EMAIL?.trim() ?? 'dario.ochoa+legacy_customer+f3a551c0@ext.leadtech.com'

    await loginCrmAndOpenCustomers(page)
    await searchAndOpenFirstCustomer(page, email)
    const subscriptionId = await getSubscriptionId(page)
    await payLegacyRecurrence(subscriptionId, 'success')
    await waitForRecurrenceToFinish()
    await page.reload({ waitUntil: 'domcontentloaded' })

    await expectLastTransactionMatches(page, {
      transactionType: 'Payment',
      transactionStatus: 'Success',
      paymentSolution: 'Worldpay',
      cardType: 'VISA',
      amount: '29.95',
      currency: 'USD',
      subscriptionName: 'Full Access'
    })
    expect(true).toBe(true)
  })
})
