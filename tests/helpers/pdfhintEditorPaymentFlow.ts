import * as path from 'path'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { openHome } from './navigation'
import { isPdfhintScenario } from './pdfhintScenario'
import { fillStripePaymentLikeLegacy } from './stripePayment'
import { editor, home } from '../pages/editorSelectors'
import { waitForEditorAfterUpload } from './editorActions'

const samplePdf = path.join(__dirname, '..', 'fixtures', 'sample.pdf')

export type EditorPaymentOptions = {
  /** Email para registro en el editor (flujo Direct + upload). */
  email: string
  stripe?: { number: string; exp: string; cvc: string }
  /** Parámetros en la URL inicial (`/` o `/?…`) antes del upload (p. ej. UTM, `ip`). */
  homeQuery?: Record<string, string>
  /** Paridad `HomePage.loadPageWithLocale` — ver `openHome({ locale })`. */
  homeLocale?: string
  /** Paridad `TransactionalEmails.feature`: textos en transaction-price / monthlyTransactionPrice tras registro, antes de Stripe. */
  prePaymentEditorContains?: { priceContains: string; monthlyContains: string }
}

/** Stripe test: mensajes de declinación / fondos insuficientes (EN + fragmentos localizables). */
const declineMessageRe =
  /declined|rechazad|declin[ée]|abgelehnt|rifiutat|recusad|your card (has been|was)|card (couldn't be|cannot be)|payment failed|pago.*fall|insufficient|insuffisant|insuficiente|unzureichend|non sufficienti|insufficiente|expired|expiration|expir[ée]|ablauf|caducad|scadut|만료|期限切れ|lost|stolen|perdue|robada|furto|verloren|gestolen|incorrect.*cvc|cvc.*invalid|invalid.*cvc|security code|sicherheitscode|codice.*sicurezza/i

async function runEditorDirectUploadAndOpenPayment(
  page: Page,
  opts: Pick<EditorPaymentOptions, 'email' | 'homeQuery' | 'homeLocale' | 'prePaymentEditorContains'>
): Promise<void> {
  const hasQuery = opts.homeQuery && Object.keys(opts.homeQuery).length > 0
  await openHome(page, {
    ...(hasQuery ? { query: opts.homeQuery } : {}),
    ...(opts.homeLocale ? { locale: opts.homeLocale } : {})
  })
  if (isPdfhintScenario()) {
    const hero = page.locator(home.uploadDocumentHeroInput).first()
    await hero.waitFor({ state: 'attached', timeout: 120_000 })
    await hero.setInputFiles(samplePdf)
    await page
      .locator(home.uploadLoadingOverlay)
      .first()
      .waitFor({ state: 'hidden', timeout: 120_000 })
      .catch(() => {})
  } else {
    await page.locator(home.uploadDocumentButton).first().setInputFiles(samplePdf)
  }
  await waitForEditorAfterUpload(page)
  await page.locator(editor.downloadButton).first().click({ force: true })

  await page.locator(editor.emailInput).waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator(editor.emailInput).fill(opts.email)
  await page.locator(editor.downloadLoginButton).click()

  if (opts.prePaymentEditorContains) {
    const priceLoc = page.locator(editor.transactionPrice)
    const monthlyLoc = page.locator(editor.monthlyTransactionPrice)
    await expect(priceLoc).toBeVisible({ timeout: 90_000 })
    await expect(monthlyLoc).toBeVisible({ timeout: 90_000 })
    await expect(priceLoc).toContainText(opts.prePaymentEditorContains.priceContains, { timeout: 30_000 })
    await expect(monthlyLoc).toContainText(opts.prePaymentEditorContains.monthlyContains, { timeout: 30_000 })
  }
}

async function anyFrameBodyMatchesDecline(page: Page): Promise<boolean> {
  for (const frame of page.frames()) {
    const txt = await frame.locator('body').innerText().catch(() => '')
    if (declineMessageRe.test(txt)) return true
  }
  return false
}

/**
 * Paridad con el tronco común de @PDFEDITOR_PDFHINT_SMOKE_VISA / smoke de pago:
 * Home → upload → descarga → email → Stripe → botón confirmar → descarga visible.
 */
export async function runEditorUploadRegisterAndVisaPayment(page: Page, opts: EditorPaymentOptions): Promise<void> {
  const number = opts.stripe?.number ?? process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242'
  const exp = opts.stripe?.exp ?? process.env.STRIPE_TEST_CARD_EXP ?? '1234'
  const cvc = opts.stripe?.cvc ?? process.env.STRIPE_TEST_CARD_CVC ?? '123'

  await runEditorDirectUploadAndOpenPayment(page, {
    email: opts.email,
    homeQuery: opts.homeQuery,
    homeLocale: opts.homeLocale,
    prePaymentEditorContains: opts.prePaymentEditorContains
  })
  await fillStripePaymentLikeLegacy(page, { number, exp, cvc })
  await page.locator(editor.continuePayment).click()
  await expect(page.locator(editor.pdfRadioButton).first()).toBeVisible({ timeout: 120_000 })
}

/**
 * Mismo tronco que el pago Visa hasta confirmar; con número de prueba declinado (p. ej. `4000000000000002`)
 * espera mensaje de error en página o iframes Stripe (no descarga post-pago).
 */
export async function runEditorUploadRegisterStripePaymentExpectDecline(
  page: Page,
  opts: EditorPaymentOptions
): Promise<void> {
  const number =
    opts.stripe?.number ?? process.env.STRIPE_TEST_DECLINE_NUMBER?.trim() ?? '4000000000000002'
  const exp = opts.stripe?.exp ?? process.env.STRIPE_TEST_DECLINE_EXP?.trim() ?? '1234'
  const cvc = opts.stripe?.cvc ?? process.env.STRIPE_TEST_DECLINE_CVC?.trim() ?? '123'

  await runEditorDirectUploadAndOpenPayment(page, {
    email: opts.email,
    homeQuery: opts.homeQuery,
    homeLocale: opts.homeLocale,
    prePaymentEditorContains: opts.prePaymentEditorContains
  })
  await fillStripePaymentLikeLegacy(page, { number, exp, cvc })
  await page.locator(editor.continuePayment).click()
  await expect.poll(async () => anyFrameBodyMatchesDecline(page), { timeout: 90_000, intervals: [500, 1500, 3000] }).toBeTruthy()
}

/**
 * Paridad con `EditorPage.downloadDocument()` (legacy): tras el pago, el modal
 * "Payment Success!" muestra una selección de formato (PDF/PNG/JPG/Word/...) con
 * el botón Download deshabilitado por defecto. Hay que activar PDF (radio
 * `[checked]` puede no bastar) y luego pulsar Download para volver al dashboard.
 *
 * Estrategia robusta:
 *  1. Esperar al heading "Payment Success!" o al xpath legacy.
 *  2. Si el botón Download (con xpath legacy) ya es clickeable, clicarlo.
 *  3. Si no, clic explícito en la tarjeta PDF y luego en el botón Download.
 *  4. Como último recurso, cerrar el modal (X) y navegar a /dashboard manualmente.
 */
export async function openDashboardViaPaymentSuccessModal(page: Page): Promise<void> {
  await page.waitForTimeout(1500)

  const successHeader = page.getByRole('heading', { name: /payment success/i }).first()
  await successHeader.waitFor({ state: 'visible', timeout: 120_000 }).catch(() => {})

  const legacyBtn = page.locator(`xpath=${editor.paymentSuccessDownloadButton}`).first()
  const tryClickEnabled = async (locator: ReturnType<Page['locator']>): Promise<boolean> => {
    try {
      const visible = await locator.isVisible({ timeout: 1500 }).catch(() => false)
      if (!visible) return false
      const enabled = await locator.isEnabled({ timeout: 500 }).catch(() => false)
      if (!enabled) return false
      await locator.click({ timeout: 5000, force: true }).catch(() => {})
      return true
    } catch {
      return false
    }
  }

  if (await tryClickEnabled(legacyBtn)) {
    await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
    return
  }

  /**
   * Activa el formato PDF si está deshabilitado el botón Download.
   * El layout actual: `<div role="radio">PDF PDF</div>` que requiere click manual.
   */
  const pdfRadio = page.getByRole('radio', { name: /^PDF\s+PDF$/ }).first()
  if (await pdfRadio.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await pdfRadio.click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
  } else {
    const pdfCard = page.getByText(/^PDF$/, { exact: false }).first()
    await pdfCard.click({ force: true }).catch(() => {})
  }

  if (await tryClickEnabled(legacyBtn)) return

  const downloadBtn = page.getByRole('button', { name: /^download$/i }).first()
  if (await tryClickEnabled(downloadBtn)) return

  /**
   * Fallback: cerrar el modal (botón X) y navegar a /dashboard. El usuario ya
   * está logueado, así que la nav directa equivale a "post-payment redirect".
   */
  const closeBtn = page.locator('dialog button').first()
  await closeBtn.click({ force: true }).catch(() => {})
}
