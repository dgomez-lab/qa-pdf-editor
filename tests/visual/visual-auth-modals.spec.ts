import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'
import { toCatcherEmail, waitForMagicLink } from '../helpers/mailpitClient'
import { runEditorUploadRegisterAndVisaPayment, openDashboardViaPaymentSuccessModal } from '../helpers/pdfhintEditorPaymentFlow'
import { gotoAccount, closeOnboarding, selectors } from '../helpers/dashboardActions'
import { gotoMembership, cancelSubscriptionFromAccount, accountSelectors } from '../helpers/accountActions'
import { editor } from '../pages/editorSelectors'
import { appUrl } from '../helpers/appUrl'

function visualSnapshotsEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_VISUAL_SNAPSHOTS?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}
function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}
function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

const screenshotOptions = {
  fullPage: false,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const,
  maxDiffPixels: 3500
}

/**
 * `Visual.feature` — escenarios con sesión / pago: modales del editor, dashboard side-menu,
 * Account Canceled / Unsubscribe screen.
 */
test.describe('Visual — auth & modales', { tag: ['@PDFEDITOR_VISUAL'] }, () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!visualSnapshotsEnabled(), 'PLAYWRIGHT_VISUAL_SNAPSHOTS=1')
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  // ---------- Editor (no paid: modal "Pay with card") ----------
  test('Editor Modal No Paid', { tag: ['@PDFEDITOR_VISUAL_EDITOR_MODAL_NO_PAID'] }, async ({ page }) => {
    test.setTimeout(240_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const samplePdf = require('path').join(__dirname, '..', 'fixtures', 'sample.pdf') as string
    const { openHome } = await import('../helpers/navigation')
    const { home } = await import('../pages/editorSelectors')
    await openHome(page)
    await page.locator(home.fileInput).first().setInputFiles(samplePdf)
    await page.locator(editor.downloadButton).first().waitFor({ state: 'visible', timeout: 180_000 })
    await page.locator(editor.downloadButton).first().click({ force: true })
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-editor-modal-no-paid.png', screenshotOptions)
  })

  // ---------- Editor Payment Modal (post-create-user, ver precio) ----------
  test('Editor Payment Modal', { tag: ['@PDFEDITOR_VISUAL_EDITOR_MODAL_PAYMENT'] }, async ({ page }) => {
    test.setTimeout(240_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+vispay+${unique}@example.com`
    // Reaprovecha flujo create-user dentro del editor (Visa real pero detenido antes del éxito)
    const samplePdf = require('path').join(__dirname, '..', 'fixtures', 'sample.pdf') as string
    const { openHome } = await import('../helpers/navigation')
    const { home } = await import('../pages/editorSelectors')
    await openHome(page)
    await page.locator(home.fileInput).first().setInputFiles(samplePdf)
    await page.locator(editor.downloadButton).first().waitFor({ state: 'visible', timeout: 180_000 })
    await page.locator(editor.downloadButton).first().click({ force: true })
    await page.locator(editor.emailInput).fill(email)
    await page.locator(editor.downloadLoginButton).click()
    await page.locator('[data-id="transactionPrice"]').first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-editor-modal-payment.png', screenshotOptions)
  })

  // ---------- Editor Modal Paid / Convert Paid / Share Mail (requiere usuario pre-pago) ----------
  test('Editor Modal Paid', { tag: ['@PDFEDITOR_VISUAL_EDITOR_MODAL_PAID'] }, async ({ page }) => {
    test.setTimeout(360_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+vispaid+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-editor-modal-paid.png', screenshotOptions)
  })

  test('Editor Modal Convert Paid', { tag: ['@PDFEDITOR_VISUAL_EDITOR_MODAL_CONVERT_PAID'] }, async ({ page }) => {
    test.setTimeout(360_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+visconv+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    const convert = page.locator('[data-id="convertToolbar"]').first()
    if (await convert.isVisible({ timeout: 30_000 }).catch(() => false)) await convert.click().catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-editor-modal-convert-paid.png', screenshotOptions)
  })

  test('Editor Modal Share Mail', { tag: ['@PDFEDITOR_VISUAL_EDITOR_MODAL_SHARE_MAIL'] }, async ({ page }) => {
    test.setTimeout(360_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+visshare+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    const share = page.locator('[data-id="shareToolbar"]').first()
    if (await share.isVisible({ timeout: 30_000 }).catch(() => false)) await share.click().catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-editor-modal-share-mail.png', screenshotOptions)
  })

  // ---------- Account Canceled / Cancel Subscription ----------
  test('Account Canceled', { tag: ['@PDFEDITOR_VISUAL_ACCOUNT_CANCELED'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+visaccc+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await gotoAccount(page)
    await gotoMembership(page)
    await cancelSubscriptionFromAccount(page)
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-account-canceled.png', screenshotOptions)
  })

  test('Cancel Subscription (confirm screen)', { tag: ['@PDFEDITOR_VISUAL_CANCEL_SUBSCRIPTION'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+viscancel+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await gotoAccount(page)
    await gotoMembership(page)
    const link = page.locator(accountSelectors.cancelSubscriptionLink).first()
    if (await link.isVisible({ timeout: 30_000 }).catch(() => false)) await link.click().catch(() => {})
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-cancel-subscription.png', screenshotOptions)
  })

  // ---------- Dashboard (4 outline) ----------
  test('Dashboard Onboarding', { tag: ['@PDFEDITOR_VISUAL_DASHBOARD_ONBOARDING'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+visonbo+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
    const tutorial = page.locator(selectors.onboardingViewTutorialButton).first()
    if (await tutorial.isVisible({ timeout: 30_000 }).catch(() => false)) {
      // mantenemos la tarjeta tutorial visible
    }
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-dashboard-onboarding.png', screenshotOptions)
  })

  test('Dashboard', { tag: ['@PDFEDITOR_VISUAL_DASHBOARD'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+visdash+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
    await page.locator(selectors.dashboardSideMenuLink).first().click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-dashboard.png', screenshotOptions)
  })

  test('Dashboard My Documents', { tag: ['@PDFEDITOR_VISUAL_DASHBOARD_MY_DOCUMENTS'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+vismydoc+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
    await page.locator(selectors.dashboardMyDocumentsSideMenuLink).first().click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-dashboard-my-documents.png', screenshotOptions)
  })

  test('Dashboard Most Used Forms', { tag: ['@PDFEDITOR_VISUAL_DASHBOARD_MOST_USED_FORMS'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+vismuf+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
    await page.locator(selectors.dashboardMostUsedFormsSideMenuLink).first().click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-dashboard-most-used-forms.png', screenshotOptions)
  })

  test('Dashboard Trash Bin', { tag: ['@PDFEDITOR_VISUAL_DASHBOARD_TRASH'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+vistrash+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
    await page.locator(selectors.dashboardTrashSideMenuLink).first().click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-dashboard-trash.png', screenshotOptions)
  })

  test('Dashboard Delete Modal', { tag: ['@PDFEDITOR_VISUAL_DASHBOARD_DELETE_MODAL'] }, async ({ page }) => {
    test.setTimeout(420_000)
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+visdel+${unique}@example.com`
    await runEditorUploadRegisterAndVisaPayment(page, { email })
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
    const del = page.locator(selectors.delete0Bin).first()
    if (await del.isVisible({ timeout: 30_000 }).catch(() => false)) await del.click().catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('visual-dashboard-delete-modal.png', screenshotOptions)
  })

  // ---------- Magic link session screens (sin pago) ----------
  test('Magic link redirect (account session)', { tag: ['@PDFEDITOR_VISUAL_ACCOUNT_LOGIN'] }, async ({ page }) => {
    test.setTimeout(240_000)
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!isPdfhintSite(), 'Rutas localizadas pdfhint')
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const email = `playwright+vismagic+${unique}@example.com`
    await page.goto(appUrl('/en/login'), { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    const afterMs = Date.now()
    await page.locator('[data-id="emailForm"]').fill(email)
    await page.locator('[data-id="loginBtnSubmit"]').click()
    const url = await waitForMagicLink({ search: toCatcherEmail(email), subjectIncludes: 'sign in', afterMs, timeoutMs: 120_000 })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await expect(page).toHaveScreenshot('visual-account-magic-redirect.png', screenshotOptions)
  })
})
