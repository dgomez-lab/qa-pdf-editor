import { test, expect } from '@playwright/test'
import * as path from 'path'
import { gotoDashboard, closeOnboardingOnce, selectors } from '../helpers/dashboardActions'
import { home, editor } from '../pages/editorSelectors'
import { clickNextButton } from '../helpers/editorActions'
import { fillStripePaymentLikeLegacy } from '../helpers/stripePayment'

function paymentSmokeEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_PAYMENT_SMOKE?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * `Dashboard.feature` — `@PDFEDITOR_DASHBOARD_SUBSCRIBE_UPLOAD_AND_PAY`:
 * usuario logueado pulsa "Get Full Access" desde Dashboard, sube doc, paga y aparece descarga.
 */
test.describe('Dashboard — subscribe + upload + pay', { tag: ['@PDFEDITOR_DASHBOARD'] }, () => {
  test.beforeEach(() => {
    test.skip(!paymentSmokeEnabled(), 'PLAYWRIGHT_PAYMENT_SMOKE=1')
  })

  test('clic Get Full Access → upload → pago → descarga', { tag: ['@PDFEDITOR_DASHBOARD_SUBSCRIBE_UPLOAD_AND_PAY'] }, async ({ page }) => {
    test.setTimeout(360_000)

    await gotoDashboard(page)
    await closeOnboardingOnce(page)
    const subscribe = page.locator(selectors.getFullAccessButton).first()
    if (!(await subscribe.isVisible({ timeout: 30_000 }).catch(() => false))) {
      test.skip(true, 'Dashboard no expone Get Full Access en este entorno (login/autologin requerido).')
    }
    await subscribe.click({ timeout: 10_000 }).catch(() => {})

    const samplePdf = path.join(__dirname, '..', 'fixtures', 'sample.pdf')
    await page.locator(home.fileInput).first().setInputFiles(samplePdf).catch(() => {})
    await expect(page.locator(editor.downloadButton).first()).toBeVisible({ timeout: 180_000 })
    await clickNextButton(page)
    await fillStripePaymentLikeLegacy(page, {
      number: process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242',
      exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
      cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123'
    })
    await page.locator(editor.continuePayment).click()
    await expect(page.locator(editor.downloadButton).first()).toBeVisible({ timeout: 120_000 })
  })
})
