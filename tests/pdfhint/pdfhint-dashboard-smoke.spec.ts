import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { waitForMagicLink, toCatcherEmail } from '../helpers/mailpitClient'
import { fillStripePaymentLikeLegacy } from '../helpers/stripePayment'
import { editor, home } from '../pages/editorSelectors'
import { dashboard } from '../pages/dashboardSelectors'
import { appUrl } from '../helpers/appUrl'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import * as path from 'path'

const samplePdf = path.join(__dirname, '..', 'fixtures', 'sample.pdf')

function dashboardSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PDFHINT_DASHBOARD_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

test.describe('PDF Hint — smoke Dashboard → editor → pago', { tag: ['@PDFEDITOR_PDFHINT_SMOKE_DASHBOARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!dashboardSmokeEnabled(), 'PLAYWRIGHT_PDFHINT_DASHBOARD_SMOKE=1')
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1 (Stripe al final del flujo)')
    const mailpit = !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
    const allowNoMailpit = process.env.PLAYWRIGHT_PDFHINT_DASHBOARD_ALLOW_NO_MAILPIT === '1'
    test.skip(
      !mailpit && !allowNoMailpit,
      'PLAYWRIGHT_MAILPIT_URL (magic link) o PLAYWRIGHT_PDFHINT_DASHBOARD_ALLOW_NO_MAILPIT=1 si /login autologuea sin email'
    )
  })

  /**
   * Paridad con `PDFhint.feature` escenario Dashboard: registro vía `/login`, cerrar modal editor,
   * onboarding dashboard, Full access, subir PDF, editor, pago, descarga.
   * Requiere Mailpit para magic link salvo que el entorno autologuee al pulsar "Sign in".
   */
  test('registro login → dashboard → subscribe → upload → pago', async ({ page }) => {
    test.setTimeout(420_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const rawEmail = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+dash+${unique}@example.com`
    const mailpitSearch = process.env.PLAYWRIGHT_MAILPIT_SEARCH_EMAIL?.trim() || toCatcherEmail(rawEmail)

    await gotoMarketingPath(page, appUrl('/login'), { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)

    await page.locator('[data-id="emailForm"]').waitFor({ state: 'visible', timeout: 60_000 })
    await page.locator('[data-id="emailForm"]').fill(rawEmail)
    await page.locator('[data-id="loginBtnSubmit"]').click()

    const afterMs = Date.now()
    if (process.env.PLAYWRIGHT_MAILPIT_URL?.trim()) {
      const magicUrl = await waitForMagicLink({
        search: mailpitSearch,
        subjectIncludes: process.env.PLAYWRIGHT_MAILPIT_MAGIC_SUBJECT?.trim() || 'sign in',
        timeoutMs: 120_000,
        afterMs
      })
      await gotoMarketingPath(page, magicUrl, { waitUntil: 'domcontentloaded' })
    } else {
      await page.waitForURL(/dashboard|editor|lp\//i, { timeout: 120_000 }).catch(() => {})
    }

    await page.locator(editor.closeModalButton).waitFor({ state: 'visible', timeout: 120_000 })
    await page.locator(editor.uploadLoader).first().waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await page.locator(editor.closeModalButton).click()
    await page.locator(editor.closeModalButton).waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {})

    const closeOnboarding = page.locator(dashboard.onboardingCloseModal).first()
    await closeOnboarding.waitFor({ state: 'visible', timeout: 60_000 })
    await closeOnboarding.click()
    await closeOnboarding.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {})

    const subscribe = page.locator(dashboard.getFullAccessButton).first()
    await expect(subscribe).toBeVisible({ timeout: 90_000 })
    await subscribe.click()

    await page.locator(dashboard.uploadDocumentButton).waitFor({ state: 'visible', timeout: 90_000 })
    await page.locator(home.fileInput).first().setInputFiles(samplePdf)

    await expect(page).toHaveURL(/edit|editor|lp\//i, { timeout: 180_000 })
    await page.locator(editor.loadingOverlay).first().waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})

    const downloadBtn = page.locator(editor.downloadButton).first()
    await expect(downloadBtn).toBeVisible({ timeout: 180_000 })
    await page.waitForTimeout(2000)
    await downloadBtn.click({ force: true })

    await page.locator(editor.emailInput).waitFor({ state: 'visible', timeout: 60_000 })
    await page.locator(editor.emailInput).fill(rawEmail)
    await page.locator(editor.downloadLoginButton).click()

    const number = process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242'
    const exp = process.env.STRIPE_TEST_CARD_EXP ?? '1234'
    const cvc = process.env.STRIPE_TEST_CARD_CVC ?? '123'
    await fillStripePaymentLikeLegacy(page, { number, exp, cvc })
    await page.locator(editor.continuePayment).click()

    await expect(page.locator(editor.downloadButton).first()).toBeVisible({ timeout: 120_000 })
  })
})
