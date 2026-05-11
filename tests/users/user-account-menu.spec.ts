import { test, expect, type Page } from '@playwright/test'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { clickAccountMenu, selectors } from '../helpers/dashboardActions'
import { accountSelectors } from '../helpers/accountActions'
import { loginSelectors } from '../helpers/loginFlow'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

async function ensureLoggedInDashboard(page: Page): Promise<void> {
  test.setTimeout(360_000)
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+menu+${unique}@example.com`
  await runEditorUploadRegisterAndVisaPayment(page, { email })
  await openDashboardViaPaymentSuccessModal(page)
}

/**
 * `Users.feature` — Scenario Outline "User clicks on every link on the account menu":
 * 4 tags: ACCOUNT / MEMBERSHIP / DASHBOARD / LOGOUT.
 */
test.describe('Users — menú de cuenta', { tag: ['@PDFEDITOR_USER'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('Account', { tag: ['@PDFEDITOR_USER_ACCOUNT'] }, async ({ page }) => {
    await ensureLoggedInDashboard(page)
    await clickAccountMenu(page)
    await page.locator(selectors.accountMenuLink).click()
    await expect(page.locator(accountSelectors.firstNameInput).first()).toBeVisible({ timeout: 30_000 })
  })

  test('Membership', { tag: ['@PDFEDITOR_USER_MEMBERSHIP'] }, async ({ page }) => {
    await ensureLoggedInDashboard(page)
    await clickAccountMenu(page)
    await page.locator(selectors.membershipMenuLink).click()
    await expect(page.locator(accountSelectors.activeStatus).first()).toBeVisible({ timeout: 30_000 })
  })

  test('Dashboard', { tag: ['@PDFEDITOR_USER_DASHBOARD'] }, async ({ page }) => {
    await ensureLoggedInDashboard(page)
    await clickAccountMenu(page)
    await page.locator(selectors.dashboardMenuLink).click()
    await expect(page.locator(selectors.uploadDocumentButton).first()).toBeVisible({ timeout: 30_000 })
  })

  test('Logout', { tag: ['@PDFEDITOR_USER_LOGOUT'] }, async ({ page }) => {
    await ensureLoggedInDashboard(page)
    await clickAccountMenu(page)
    await page.locator(selectors.logoutMenuLink).click()
    await expect(page.locator(loginSelectors.loginCtaButton).or(page.locator(loginSelectors.emailForm)).first()).toBeVisible({ timeout: 30_000 })
  })
})
