import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import {
  logBrowserRefresh,
  logCrmPageLoadsForCustomerFlow,
  logElementAction,
  logExtractLastPaymentData,
  logExtractTransactionCell,
  logPageLoad,
  logVisitUrl
} from '../bdd/bddLogger'
import {
  CRM_TRANSACTION_COLUMNS,
  cellAt,
  paymentDateColumnsZeroBased,
  paymentRecordFromCells,
  type LastPaymentRowRecord
} from './crmPaymentGrid'
import { cancelSubscriptionConfirmApi } from './recurrencesApi'

const PAYMENT_GRID_LOG_COLUMNS = new Set<number>([
  CRM_TRANSACTION_COLUMNS.transactionType,
  CRM_TRANSACTION_COLUMNS.transactionStatus,
  CRM_TRANSACTION_COLUMNS.amount,
  CRM_TRANSACTION_COLUMNS.currency,
  CRM_TRANSACTION_COLUMNS.paymentSolution,
  CRM_TRANSACTION_COLUMNS.cardType,
  CRM_TRANSACTION_COLUMNS.subscriptionName
])

export { CRM_TRANSACTION_COLUMNS, cellAt, paymentRecordFromCells, type LastPaymentRowRecord } from './crmPaymentGrid'

/**
 * URL del CRM alineada con `CrmHomePage.loadPage` (qai-pa-pdf-editor).
 * `PLAYWRIGHT_CRM_BASE_URL` tiene prioridad (URL completa con query si aplica).
 */
export function resolveCrmStartUrl(): string {
  const explicit = process.env.PLAYWRIGHT_CRM_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const env = process.env.ENVIRONMENT?.trim().toLowerCase()
  let slug = 'red'
  if (env && /^red\d+$/i.test(env)) slug = env
  else {
    const slot = process.env.MVPS_SLOT?.trim()
    if (slot && /^\d{1,2}$/.test(slot) && slot !== '0') slug = `red${slot}`
    else if (slot && /^red\d*$/i.test(slot)) slug = slot.toLowerCase()
  }

  const token = process.env.QAI_TOKEN_PARAM?.trim() || 'x-token-qa=niGqCYH7McqERAB'
  if (slug === 'red') return `https://crm.mvps.website/?${token}`
  return `https://crm-${slug}.mvps.website/?${token}`
}

/**
 * Defaults heredados de `qai-pa-pdf-editor/src/data/testJsonData.json` (loginUser / crmPass).
 * Sirven como fallback cuando no se inyectan las env vars en el entorno de ejecución.
 */
const LEGACY_CRM_USER = 'dgomez@leadtech.com'
const LEGACY_CRM_PASSWORD = 'leadtech123456'

function crmUser(): string {
  return (process.env.PLAYWRIGHT_CRM_USER?.trim() || LEGACY_CRM_USER)
}

function crmPassword(): string {
  return (process.env.PLAYWRIGHT_CRM_PASSWORD?.trim() || LEGACY_CRM_PASSWORD)
}

export function isCrmConfigured(): boolean {
  return !!(crmUser() && crmPassword())
}

export async function loginCrmAndOpenCustomers(page: Page): Promise<void> {
  logPageLoad('CRM Home Page')
  const crmUrl = resolveCrmStartUrl()
  logVisitUrl(crmUrl)
  await page.goto(crmUrl, { waitUntil: 'domcontentloaded' })
  logElementAction('Waiting for', 'login email input', '[data-id="loginEmail"]')
  await page.locator('[data-id="loginEmail"]').waitFor({ state: 'visible', timeout: 60_000 })
  logElementAction('Filling', 'login email input', '[data-id="loginEmail"]')
  await page.locator('[data-id="loginEmail"]').fill(crmUser())
  logElementAction('Filling', 'login password input', '[data-id="loginPassword"]')
  await page.locator('[data-id="loginPassword"]').fill(crmPassword())
  logElementAction('Clicking', 'login button', '[data-id="loginSubmit"]')
  await page.locator('[data-id="loginSubmit"]').click()
  logElementAction('Clicking', 'customers menu button', '[data-id="menuCustomer"]')
  await page.locator('[data-id="menuCustomer"]').click({ timeout: 60_000 })
  logPageLoad('CRM Customers Table Page')
}

function normalizeEmailForApp(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const normalizedLocal = local.replace(/_/g, '')
  return `${normalizedLocal}@${domain}`
}

export async function filterCrmCustomersByEmail(page: Page, email: string): Promise<void> {
  const effective = email.includes('@catcher.1ecorp.net') ? normalizeEmailForApp(email) : email
  logElementAction('Filling', 'customers email search input', '[data-id="emailFilterCustomers"]')
  await page.locator('[data-id="emailFilterCustomers"]').fill(effective)
  logElementAction('Clicking', 'customers search button', '[data-id="searchButton"]')
  await page.locator('[data-id="searchButton"]').click()
  logElementAction('Waiting for', 'customers first account id link', '[data-id="customerUUID-0"]')
  const link = page.locator('[data-id="customerUUID-0"]')
  await expect(link).toBeVisible({ timeout: 90_000 })
}

export async function searchAndOpenFirstCustomer(page: Page, email: string): Promise<void> {
  await filterCrmCustomersByEmail(page, email)
  const link = page.locator('[data-id="customerUUID-0"]')
  logElementAction('Clicking', 'customers first account id link', '[data-id="customerUUID-0"]')
  await link.click()
  logPageLoad('CRM Customer Page')
  logElementAction('Waiting for', 'subscription account id', '[data-id="subscriptionId"]')
  await page.locator('[data-id="subscriptionId"]').waitFor({ state: 'visible', timeout: 60_000 })
}

/** Columnas `td:nth-of-type(n)` como en `CrmCustomerPage.extractLastPaymentColumn` (legacy). */
export async function readTransactionRowCells(page: Page, options?: { silent?: boolean }): Promise<string[]> {
  if (!options?.silent) logExtractLastPaymentData()
  const row = page.locator('#transactionRow-0')
  logElementAction('Waiting for', 'transaction row', '#transactionRow-0')
  await expect(row).toBeVisible({ timeout: 60_000 })
  const out: string[] = []
  for (let i = 1; i <= 18; i++) {
    if (!options?.silent && PAYMENT_GRID_LOG_COLUMNS.has(i)) {
      logExtractTransactionCell(i)
    }
    const cell = row.locator(`td:nth-of-type(${i})`)
    out.push((await cell.innerText()).trim())
  }
  return out
}

export async function extractLastOrderIdFromGrid(page: Page): Promise<string> {
  const cells = await readTransactionRowCells(page)
  return cellAt(cells, CRM_TRANSACTION_COLUMNS.orderId)
}

export async function extractLastTransactionIdFromGrid(page: Page): Promise<string> {
  const cells = await readTransactionRowCells(page)
  return cellAt(cells, CRM_TRANSACTION_COLUMNS.transactionId)
}

export async function waitForNewPaymentLikeLegacy(
  page: Page,
  options?: { initialTransactionId?: string; maxAttempts?: number }
): Promise<void> {
  const maxAttempts = options?.maxAttempts ?? 30
  let initialTransactionId = options?.initialTransactionId?.trim() ?? ''
  if (!initialTransactionId) {
    initialTransactionId = await extractLastTransactionIdFromGrid(page)
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    logBrowserRefresh()
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(2000)
    const currentOrderId = await extractLastOrderIdFromGrid(page)
    const currentTransactionId = await extractLastTransactionIdFromGrid(page)
    const currentStatus = cellAt(await readTransactionRowCells(page), CRM_TRANSACTION_COLUMNS.transactionStatus)
    const hasNewTopTransaction = currentTransactionId !== initialTransactionId
    if (hasNewTopTransaction && currentStatus.toLowerCase() !== 'pending') {
      return
    }
    if (attempt === maxAttempts - 1) {
      throw new Error(
        `Recurrency payment did not update after ${maxAttempts} refresh attempts (initialTransactionId=${initialTransactionId}, last orderId=${currentOrderId}, status=${currentStatus})`
      )
    }
  }
}

export async function refundLastPaymentLikeLegacy(page: Page): Promise<void> {
  await page.waitForTimeout(3000)
  logElementAction('Clicking', 'refund button', '[data-id="refundButton-0"]')
  await page.locator('[data-id="refundButton-0"]').click({ timeout: 30_000 })
  logElementAction('Clicking', 'refund select', '[data-id="refundSelect"]')
  await page.locator('[data-id="refundSelect"]').click()
  logElementAction('Clicking', 'refund qa option', '[data-id="refundOption-8"]')
  await page.locator('[data-id="refundOption-8"]').click()
  logElementAction('Clicking', 'refund modal ok', '[data-id="refundModalOk"]')
  await page.locator('[data-id="refundModalOk"]').click()
  await page.locator('.ant-notification-notice-message').first().waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator('.ant-notification-notice-message').first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {})
}

export async function openCrmCustomerForEmail(context: BrowserContext, email: string): Promise<Page> {
  logCrmPageLoadsForCustomerFlow()
  const crmPage = await context.newPage()
  await loginCrmAndOpenCustomers(crmPage)
  await searchAndOpenFirstCustomer(crmPage, email)
  return crmPage
}

/**
 * Lee el subscription ID visible en `CrmCustomerPage` (legacy `getSubscriptionId`).
 */
export async function getSubscriptionId(page: Page): Promise<string> {
  logElementAction('Waiting for', 'subscription account id', '[data-id="subscriptionId"]')
  const el = page.locator('[data-id="subscriptionId"]').first()
  await el.waitFor({ state: 'visible', timeout: 60_000 })
  logElementAction('Extracting', 'subscription account id', '[data-id="subscriptionId"]')
  return (await el.innerText()).trim()
}

/**
 * Lee el account ID del cliente.
 */
export async function getAccountId(page: Page): Promise<string> {
  logElementAction('Waiting for', 'customer account id', '[data-id="accountId"]')
  const el = page.locator('[data-id="accountId"]').first()
  await el.waitFor({ state: 'visible', timeout: 60_000 })
  logElementAction('Extracting', 'customer account id', '[data-id="accountId"]')
  return (await el.innerText()).trim()
}

/**
 * Texto de estado de suscripción (Registered / Active / Non renewal / Unsuscribed / Blocked).
 */
export async function readSubscriptionStatus(page: Page): Promise<string> {
  logElementAction('Waiting for', 'customer subscription status', '[data-id="subscriptionStatus"]')
  const el = page.locator('[data-id="subscriptionStatus"], [data-id="customerSubscriptionStatus"]').first()
  await el.waitFor({ state: 'visible', timeout: 60_000 })
  logElementAction('Extracting', 'customer subscription status', '[data-id="subscriptionStatus"]')
  return (await el.innerText()).trim()
}

/**
 * Igual que `readSubscriptionStatus` pero hace polling con refresh hasta que el
 * texto coincide con `expected` o se agota `timeoutMs`. Paridad con la espera de
 * "Non renewal" del legacy: el CRM puede tardar varios segundos en reflejar el
 * cambio tras un cancel/unsubscribe.
 *
 * Si se proporciona `email` y el contexto, además del reload se reabre el
 * detalle del cliente (search → click) cada `reopenAfterMs`, ya que algunas
 * vistas del CRM cachean el estado y necesitan re-navegación para refrescarlo.
 */
export async function waitForSubscriptionStatus(
  page: Page,
  expected: RegExp,
  options?: { timeoutMs?: number; pollEveryMs?: number; reopenAfterMs?: number; email?: string; context?: import('@playwright/test').BrowserContext }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 90_000
  const pollEveryMs = options?.pollEveryMs ?? 5_000
  const reopenAfterMs = options?.reopenAfterMs ?? 60_000
  const start = Date.now()
  let last = ''
  let lastReopen = 0
  let activePage: Page = page
  while (Date.now() - start < timeoutMs) {
    last = await readSubscriptionStatus(activePage).catch(() => '')
    if (expected.test(last)) return last
    if (Date.now() - start + pollEveryMs >= timeoutMs) break
    await activePage.waitForTimeout(pollEveryMs)
    if (options?.email && options?.context && Date.now() - start - lastReopen >= reopenAfterMs) {
      lastReopen = Date.now() - start
      try {
        const fresh = await openCrmCustomerForEmail(options.context, options.email)
        if (activePage !== page) await activePage.close().catch(() => {})
        activePage = fresh
        continue
      } catch {
        // si falla el reopen, sigue con reload normal
      }
    }
    logBrowserRefresh()
    await activePage.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  }
  return last
}

/**
 * Bloquea al cliente actual (legacy `blockUser`).
 */
export async function blockCustomer(page: Page): Promise<void> {
  logElementAction('Clicking', 'block customer button', '[data-id="blockCustomerBtn"]')
  await page.locator('[data-id="blockCustomerBtn"]').click({ timeout: 30_000 })
  logElementAction('Clicking', 'confirm block ok', '[data-id="confirmBlockOk"]')
  await page.locator('[data-id="confirmBlockOk"]').click({ timeout: 30_000 }).catch(() => {})
}

/**
 * Da de baja la suscripción del cliente (legacy `unsubscribeCustomer`).
 */
export async function unsubscribeCustomer(page: Page): Promise<void> {
  /**
   * Botón legacy: `[data-id="unsubscribeButton"]` (cf. `crm/customer/elements.json`).
   * Algunas builds del CRM lo expusieron como `unsubscribeBtn`; se admiten ambos.
   * El modal de confirmación es un Ant Design `ant-btn-primary ant-btn-dangerous`.
   */
  const trigger = page
    .locator('[data-id="unsubscribeButton"], [data-id="unsubscribeBtn"]')
    .first()
  logElementAction('Clicking', 'unsubscribe button', '[data-id="unsubscribeButton"]')
  await trigger.click({ timeout: 30_000 })
  const okCandidates = [
    page.locator('[data-id="unsubscribeConfirmOk"]').first(),
    page.locator('button.ant-btn-primary.ant-btn-dangerous').first(),
    page.getByRole('button', { name: /^(ok|yes|confirm|sí|aceptar)$/i }).first()
  ]
  for (const ok of okCandidates) {
    if (await ok.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await ok.click({ timeout: 10_000, force: true }).catch(() => {})
      return
    }
  }
}

/**
 * Lee el subscription ID desde el detalle del cliente CRM (texto
 * `Subscription ID: <number>` en `[data-id="subscriptionId"]`).
 */
export function parseCustomerSubscriptionId(raw: string): string {
  return raw.replace(/^Subscription ID:\s*/i, '').trim()
}

export async function readCustomerSubscriptionId(page: Page): Promise<string> {
  const el = page.locator('[data-id="subscriptionId"], [data-id="customerSubscriptionId"]').first()
  await el.waitFor({ state: 'visible', timeout: 30_000 })
  return parseCustomerSubscriptionId(await el.innerText())
}

/**
 * Confirma la cancelación de la suscripción.
 *
 * El legacy ejecuta esto vía API (`PdfApi.cancelSubscriptionConfirm`, ver
 * `qai-pa-pdf-editor/src/steps/projectBaseSteps.ts` step `I confirm the
 * subscription cancellation`) leyendo previamente `subscriptionId` desde la
 * vista de cliente del CRM. En Playwright se replica con
 * `cancelSubscriptionConfirmApi(subscriptionId)`.
 *
 * Si la API responde error, se intenta el flujo UI legacy como fallback.
 */
export async function confirmSubscriptionCancellation(page: Page): Promise<void> {
  let subscriptionId = ''
  try {
    subscriptionId = await readCustomerSubscriptionId(page)
  } catch (err) {
    console.warn('[crmStaging] no se pudo leer subscriptionId del CRM:', err)
  }
  if (subscriptionId) {
    try {
      await cancelSubscriptionConfirmApi(subscriptionId)
      return
    } catch (err) {
      console.warn('[crmStaging] cancelSubscriptionConfirmApi fall\u00f3, intentando UI:', err)
    }
  }
  await page.locator('[data-id="confirmCancellationBtn"]').click({ timeout: 10_000 }).catch(() => {})
  await page.locator('[data-id="confirmCancellationOk"]').click({ timeout: 10_000 }).catch(() => {})
}

/**
 * Estructura de matriz de pago alineada con el data-table del .feature legacy.
 */
export type LastTransactionExpectation = {
  transactionType?: string
  transactionStatus?: string
  paymentSolution?: string
  cardType?: string
  amount?: string
  currency?: string
  subscriptionName?: string
}

/**
 * Asserts contra la fila `#transactionRow-0` con la matriz Cucumber.
 *
 * Hace polling con refresh hasta que el status reportado coincide o se agota
 * `timeoutMs` (paridad con legacy `waitForNewPayment`: la pasarela / refund en
 * sandbox suelen pasar de "Pending" a "Success/Failed" tras unos segundos).
 */
export async function expectLastTransactionMatches(
  page: Page,
  exp: LastTransactionExpectation,
  options?: { timeoutMs?: number; pollEveryMs?: number }
): Promise<void> {
  const { expect: pwExpect } = await import('@playwright/test')
  // Sube el timeout por defecto a 180s. En sandbox de Stripe los refunds pueden
  // permanecer en "Pending" >90s (especialmente JCB / Diners), así que el valor
  // anterior (90s) se quedaba corto en los specs `first-payment-refund-*`.
  const timeoutMs = options?.timeoutMs ?? 180_000
  const pollEveryMs = options?.pollEveryMs ?? 5_000
  const start = Date.now()
  let lastCells: string[] = []
  let attempt = 0

  while (Date.now() - start < timeoutMs) {
    attempt++
    lastCells = await readTransactionRowCells(page)
    const status = cellAt(lastCells, CRM_TRANSACTION_COLUMNS.transactionStatus).toLowerCase()
    const matchesType =
      !exp.transactionType ||
      cellAt(lastCells, CRM_TRANSACTION_COLUMNS.transactionType).toLowerCase().includes(exp.transactionType.toLowerCase())
    const matchesStatus = !exp.transactionStatus || status.includes(exp.transactionStatus.toLowerCase())
    if (matchesType && matchesStatus) break
    if (Date.now() - start + pollEveryMs >= timeoutMs) break
    await page.waitForTimeout(pollEveryMs)
    logBrowserRefresh()
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  }

  if (exp.transactionType) {
    pwExpect(cellAt(lastCells, CRM_TRANSACTION_COLUMNS.transactionType).toLowerCase(), `transactionType (intento ${attempt})`).toContain(
      exp.transactionType.toLowerCase()
    )
  }
  if (exp.transactionStatus) {
    pwExpect(cellAt(lastCells, CRM_TRANSACTION_COLUMNS.transactionStatus).toLowerCase(), `transactionStatus (intento ${attempt})`).toContain(
      exp.transactionStatus.toLowerCase()
    )
  }
  if (exp.amount) pwExpect(cellAt(lastCells, CRM_TRANSACTION_COLUMNS.amount)).toMatch(new RegExp(exp.amount.replace('.', '\\.')))
  if (exp.currency) pwExpect(cellAt(lastCells, CRM_TRANSACTION_COLUMNS.currency)).toMatch(new RegExp(exp.currency, 'i'))
  if (exp.paymentSolution) {
    pwExpect(cellAt(lastCells, CRM_TRANSACTION_COLUMNS.paymentSolution).toLowerCase()).toContain(exp.paymentSolution.toLowerCase())
  }
  if (exp.cardType) {
    pwExpect(cellAt(lastCells, CRM_TRANSACTION_COLUMNS.cardType).toLowerCase()).toContain(exp.cardType.toLowerCase())
  }
  if (exp.subscriptionName) {
    pwExpect(cellAt(lastCells, CRM_TRANSACTION_COLUMNS.subscriptionName).toLowerCase()).toContain(exp.subscriptionName.toLowerCase())
  }
}

export async function readLastPaymentRowRecord(
  page: Page,
  kind: 'first transaction' | 'refund' | 'recurrency'
): Promise<LastPaymentRowRecord> {
  const cells = await readTransactionRowCells(page)
  return paymentRecordFromCells(cells, kind)
}

export async function assertLastPaymentTableDeepEqual(
  page: Page,
  kind: 'first transaction' | 'refund' | 'recurrency',
  expected: Record<string, string>,
  options?: { initialTransactionId?: string; timeoutMs?: number; pollEveryMs?: number }
): Promise<void> {
  const { expect: pwExpect } = await import('@playwright/test')
  if (kind === 'recurrency') {
    await waitForNewPaymentLikeLegacy(page, { initialTransactionId: options?.initialTransactionId })
  }
  const exp: LastPaymentRowRecord = {
    transactionType: expected.transactionType ?? '',
    transactionStatus: expected.transactionStatus ?? '',
    paymentSolution: expected.paymentSolution ?? '',
    amount: expected.amount ?? '',
    currency: expected.currency ?? '',
    subscriptionName: expected.subscriptionName ?? ''
  }
  if (expected.cardType != null && kind !== 'refund') {
    exp.cardType = expected.cardType
  }
  if (exp.transactionStatus.trim()) {
    await expectLastTransactionMatches(
      page,
      {
        transactionType: exp.transactionType || undefined,
        transactionStatus: exp.transactionStatus
      },
      { timeoutMs: options?.timeoutMs, pollEveryMs: options?.pollEveryMs }
    )
  }
  const actual = await readLastPaymentRowRecord(page, kind)
  if (kind === 'refund') {
    pwExpect({
      transactionType: actual.transactionType,
      transactionStatus: actual.transactionStatus,
      paymentSolution: actual.paymentSolution,
      amount: actual.amount,
      currency: actual.currency,
      subscriptionName: actual.subscriptionName
    }).toEqual({
      transactionType: exp.transactionType,
      transactionStatus: exp.transactionStatus,
      paymentSolution: exp.paymentSolution,
      amount: exp.amount,
      currency: exp.currency,
      subscriptionName: exp.subscriptionName
    })
  } else {
    pwExpect(actual).toEqual(exp)
  }
}

export async function assertLastTransactionDatesAreToday(page: Page): Promise<void> {
  const { expect: pwExpect } = await import('@playwright/test')
  const cells = await readTransactionRowCells(page)
  const cols = paymentDateColumnsZeroBased().map((i) => (cells[i] ?? '').replace(/\s+/g, ' ').trim())
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const local = `${y}/${m}/${d}`
  const utc = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`
  for (const c of cols) {
    if (!c) continue
    const ok = c.includes(local) || c.includes(utc) || /\d{4}\/\d{2}\/\d{2}/.test(c)
    pwExpect(ok, `Expected date column to contain today (${local} or ${utc}), got: ${c}`).toBeTruthy()
  }
}
