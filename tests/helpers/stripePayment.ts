import type { FrameLocator, Page } from '@playwright/test'
import { editor } from '../pages/editorSelectors'

const cardNumberLocators = [
  "input[name='number']",
  "input[name='cardnumber']",
  'input[autocomplete="cc-number"]',
  'input[data-elements-stable-field-name="cardNumber"]',
  'input[placeholder*="Card"]',
  'input[aria-label*="Card"]'
]

const expiryLocators = [
  "input[name='expiry']",
  "input[name='exp-date']",
  'input[autocomplete="cc-exp"]',
  'input[data-elements-stable-field-name="cardExpiry"]'
]

const cvcLocators = [
  "input[name='cvc']",
  'input[autocomplete="cc-csc"]',
  'input[data-elements-stable-field-name="cardCvc"]',
  "input[name='cc-csc']"
]

const stripeCountrySelect =
  "select#payment-countryInput, select[name='country']"
const stripeZipInput =
  '#payment-postalCodeInput, input[name="postalCode"], input[data-id="payment-zipInput"]'

const STRIPE_BILLING_BY_IP: Partial<Record<string, { country: string; postal: string }>> = {
  US: { country: 'US', postal: '90210' }
}

export type StripePaymentOptions = {
  testIp?: string
}

async function tryClickPayWithCard(page: Page): Promise<void> {
  /**
   * Selectores en cascada para "Pay with card" en pdfhint/mergedpdf:
   * 1) xpath legacy (icono `card.svg`) — sigue funcionando en mvps.
   * 2) Nombre accesible "Pay with card" (EN/ES/FR/IT/PT/DE) — staging pdfhint actual.
   */
  const labelRe = /pay with card|pagar con tarjeta|payer par carte|paga con carta|pagar com cart[ãa]o|mit karte zahlen|tarjeta de cr[ée]dito/i
  const candidates = [
    page.locator(editor.payWithCardButton).first(),
    page.getByRole('button', { name: labelRe }).first(),
    page.locator('button:has-text("Pay with card")').first()
  ]
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    for (const btn of candidates) {
      if (await btn.isVisible({ timeout: 250 }).catch(() => false)) {
        await btn.click({ timeout: 5_000, force: true }).catch(() => {})
        await page.waitForTimeout(800)
        return
      }
    }
    await page.waitForTimeout(400)
  }
}

async function tryFillInFrame(frame: FrameLocator, number: string, exp: string, cvc: string): Promise<boolean> {
  for (const sel of cardNumberLocators) {
    const loc = frame.locator(sel).first()
    if (await loc.isVisible({ timeout: 4000 }).catch(() => false)) {
      await loc.fill(number)
      for (const es of expiryLocators) {
        const el = frame.locator(es).first()
        if (await el.isVisible({ timeout: 4000 }).catch(() => false)) {
          await el.fill(exp)
          break
        }
      }
      for (const cs of cvcLocators) {
        const cl = frame.locator(cs).first()
        if (await cl.isVisible({ timeout: 4000 }).catch(() => false)) {
          await cl.fill(cvc)
          break
        }
      }
      return true
    }
  }
  return false
}

async function fillUnifiedPaymentIframe(page: Page, number: string, exp: string, cvc: string): Promise<boolean> {
  const outer = page.locator(editor.stripePaymentIframe).first()
  if (!(await outer.isVisible({ timeout: 25_000 }).catch(() => false))) return false
  const fl = page.frameLocator(editor.stripePaymentIframe)
  return tryFillInFrame(fl, number, exp, cvc)
}

async function fillPaymentElementHost(page: Page, number: string, exp: string, cvc: string): Promise<boolean> {
  const host = page.locator(editor.paymentElementHost).first()
  if (!(await host.isVisible({ timeout: 20_000 }).catch(() => false))) return false
  const inner = host.frameLocator('iframe')
  return tryFillInFrame(inner, number, exp, cvc)
}

async function fillSplitStripeIframes(page: Page, number: string, exp: string, cvc: string): Promise<boolean> {
  const numFrame = page.frameLocator(editor.stripeCardNumberIframe)
  for (const sel of cardNumberLocators) {
    const loc = numFrame.locator(sel).first()
    if (await loc.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await loc.fill(number)
      const expFrame = page.frameLocator(editor.stripeExpiryIframe)
      for (const es of expiryLocators) {
        const el = expFrame.locator(es).first()
        if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
          await el.fill(exp)
          break
        }
      }
      const cvcFrame = page.frameLocator(editor.stripeCvcIframe)
      for (const cs of cvcLocators) {
        const cl = cvcFrame.locator(cs).first()
        if (await cl.isVisible({ timeout: 5000 }).catch(() => false)) {
          await cl.fill(cvc)
          break
        }
      }
      return true
    }
  }
  return false
}

async function fillInsideStripeFrame(fr: import('@playwright/test').Frame, number: string, exp: string, cvc: string): Promise<{ didNumber: boolean; didExp: boolean; didCvc: boolean }> {
  const out = { didNumber: false, didExp: false, didCvc: false }
  for (const sel of cardNumberLocators) {
    const loc = fr.locator(sel).first()
    if (await loc.isVisible({ timeout: 250 }).catch(() => false)) {
      await loc.fill(number).catch(() => {})
      out.didNumber = true
      break
    }
  }
  for (const sel of expiryLocators) {
    const loc = fr.locator(sel).first()
    if (await loc.isVisible({ timeout: 250 }).catch(() => false)) {
      await loc.fill(exp).catch(() => {})
      out.didExp = true
      break
    }
  }
  for (const sel of cvcLocators) {
    const loc = fr.locator(sel).first()
    if (await loc.isVisible({ timeout: 250 }).catch(() => false)) {
      await loc.fill(cvc).catch(() => {})
      out.didCvc = true
      break
    }
  }
  return out
}

async function fillByWalkingStripeFrames(page: Page, number: string, exp: string, cvc: string): Promise<boolean> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const frames = page.frames().filter((f) => {
      const u = f.url()
      return f !== page.mainFrame() && /stripe\.com|stripe\.net/i.test(u)
    })

    /**
     * Stripe Payment Element 2.x: los 3 inputs (number/expiry/cvc) viven en un único
     * frame cuyo URL contiene `componentName=payment` (no `componentName=cardNumber`).
     * Se prioriza ese frame; si no se encuentra, se itera sobre todos los frames Stripe
     * (modelo split legacy con frames separados por componente).
     */
    const paymentFrames = frames.filter((f) => /componentName=payment(\b|&|$)/i.test(f.url()))

    for (const fr of paymentFrames.length > 0 ? paymentFrames : frames) {
      const r = await fillInsideStripeFrame(fr, number, exp, cvc)
      if (r.didNumber && r.didExp && r.didCvc) return true
    }

    let didNumber = false
    let didExp = false
    let didCvc = false
    for (const fr of frames) {
      const r = await fillInsideStripeFrame(fr, number, exp, cvc)
      if (r.didNumber) didNumber = true
      if (r.didExp) didExp = true
      if (r.didCvc) didCvc = true
    }

    if (didNumber && didExp && didCvc) return true
    await page.waitForTimeout(500)
  }
  return false
}

export function stripeBillingForTestIp(testIp?: string): { country: string; postal: string } | undefined {
  const ip = testIp?.trim()
  if (!ip) return undefined
  return STRIPE_BILLING_BY_IP[ip]
}

async function fillStripeCountryAndPostal(
  page: Page,
  country: string,
  postal: string
): Promise<void> {
  const countrySelect = page.locator(stripeCountrySelect).first()
  await countrySelect.waitFor({ state: 'visible', timeout: 20_000 })
  try {
    await countrySelect.selectOption(country)
  } catch {
    await countrySelect.click({ timeout: 5_000, force: true }).catch(() => {})
    const option = page
      .locator(
        `xpath=//select[@id='payment-countryInput' or @name='country']/option[@value='${country}']`
      )
      .first()
    await option.waitFor({ state: 'visible', timeout: 10_000 })
    await option.click({ timeout: 5_000, force: true })
  }
  const zip = page.locator(stripeZipInput).first()
  await zip.waitFor({ state: 'visible', timeout: 20_000 })
  await zip.fill(postal)
}

export async function maybeFillStripeBillingForTestIp(page: Page, testIp?: string): Promise<void> {
  const billing = stripeBillingForTestIp(testIp)
  if (!billing) return
  const zip = page.locator(stripeZipInput).first()
  if (!(await zip.isVisible({ timeout: 4_000 }).catch(() => false))) return
  await fillStripeCountryAndPostal(page, billing.country, billing.postal)
}

/**
 * Orden alineado con `EditorPage.fillPaymentForm` en qai-pa-pdf-editor.
 */
export async function fillStripePaymentLikeLegacy(
  page: Page,
  card: { number: string; exp: string; cvc: string },
  options?: StripePaymentOptions
): Promise<void> {
  await tryClickPayWithCard(page)
  await page.waitForTimeout(800)

  let filled = false
  if (await fillUnifiedPaymentIframe(page, card.number, card.exp, card.cvc)) filled = true
  else if (await fillPaymentElementHost(page, card.number, card.exp, card.cvc)) filled = true
  else if (await fillSplitStripeIframes(page, card.number, card.exp, card.cvc)) filled = true
  else if (await fillByWalkingStripeFrames(page, card.number, card.exp, card.cvc)) filled = true

  if (!filled) {
    throw new Error(
      'No se pudieron rellenar los campos de tarjeta Stripe (unificado, #payment-element, split ni frames stripe.com). Revisa trace / UI del entorno.'
    )
  }

  await maybeFillStripeBillingForTestIp(page, options?.testIp)
}
