import { test, expect } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { gotoAccount } from '../helpers/dashboardActions'
import { fillAccountForm, clickSaveChanges, accountSelectors } from '../helpers/accountActions'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Users.feature` — `@PDFEDITOR_USER_ACCOUNT_EDIT_NAME`: editar nombre / apellido y persistencia.
 */
test.describe('Users — editar nombre en cuenta', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('editar nombre / apellidos persisten tras refresh', { tag: ['@PDFEDITOR_USER_ACCOUNT_EDIT_NAME'] }, async ({ page }) => {
    test.setTimeout(360_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+editname+${unique}@example.com`

    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await gotoAccount(page)

    await page.locator(accountSelectors.firstNameInput).waitFor({ state: 'visible', timeout: 60_000 })
    await fillAccountForm(page, { firstName: 'TestName', lastName: 'TestLastName', secondLastName: 'TestSecondLast' })
    await clickSaveChanges(page)
    await page.waitForTimeout(3000)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page.locator(accountSelectors.firstNameInput)).toHaveValue('TestName', { timeout: 30_000 })
    await expect(page.locator(accountSelectors.lastNameInput)).toHaveValue('TestLastName', { timeout: 30_000 })
    await expect(page.locator(accountSelectors.secondLastNameInput)).toHaveValue('TestSecondLast', { timeout: 30_000 })
  })
})
