import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'
import { isPdfhintApp, resolveAppBaseUrl } from './appUrl'

/**
 * Cliente para el endpoint de QA de recurrencias y operaciones administrativas
 * (cancelaciones, reembolsos, bloqueo de cuentas) alineado 1:1 con la legacy
 * `PdfApi` de `qai-pa-pdf-editor`:
 *
 *   POST `${BASE_URL}/api/v1/qa/recurrent`         { test:'1', subscriptionId, errorType?:'soft'|'hard' }
 *   POST `${BASE_URL}/api/v1/qa/cancel-subscription` { subscriptionId }
 *   POST `${BASE_URL}/api/v1/qa/refund`              { orderId, status?:'failed' }
 *   POST `${BASE_URL}/api/v1/qa/customer/block`      { customerUUID, fail:false }
 *
 * Headers en todos los casos: `X-API-KEY: t0k3nS3vr3t` (valor legacy por defecto;
 * se puede sobreescribir con `PLAYWRIGHT_QA_API_KEY`).
 *
 * Variables soportadas:
 * - `PLAYWRIGHT_RECURRENCE_API_BASE_URL` — base; si no se define usa la BASE_URL del
 *   proyecto (p.ej. `https://red.mvps.website?x-token-qa=...`). Acepta paths sueltos
 *   (`/api/v1/qa/recurrent`) o URLs completas.
 * - `PLAYWRIGHT_RECURRENCE_PAY_PATH` — override de path (default `/api/v1/qa/recurrent`).
 * - `PLAYWRIGHT_QA_API_KEY` — override del header `X-API-KEY` (default `t0k3nS3vr3t`).
 */

export type RecurrenceKind = 'success' | 'soft' | 'hard'

const LEGACY_API_KEY = 't0k3nS3vr3t'
const RECURRENT_PATH = '/api/v1/qa/recurrent'
const CANCEL_PATH = '/api/v1/qa/cancel-subscription'
const REFUND_PATH = '/api/v1/qa/refund'
const BLOCK_PATH = '/api/v1/qa/customer/block'

export function stripQueryAndTrailing(url: string): string {
  const noQuery = url.split('?')[0]
  return noQuery.replace(/\/+$/, '')
}

export function resolveRecurrenceApiBaseUrl(): string {
  const overriden = process.env.PLAYWRIGHT_RECURRENCE_API_BASE_URL?.trim()
  if (overriden) return stripQueryAndTrailing(overriden)
  if (isPdfhintApp()) return stripQueryAndTrailing(resolveAppBaseUrl())
  return stripQueryAndTrailing(resolvePlaywrightBaseUrl())
}

function buildUrl(path: string): string {
  return `${resolveRecurrenceApiBaseUrl()}${path}`
}

export function qaApiHeaders(): Record<string, string> {
  const key = process.env.PLAYWRIGHT_QA_API_KEY?.trim() || LEGACY_API_KEY
  return {
    'X-API-KEY': key,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export function buildPayRecurrenceBody(
  subscriptionId: string | number,
  kind: RecurrenceKind
): Record<string, unknown> {
  const idNum = Number(subscriptionId)
  const body: Record<string, unknown> = {
    test: '1',
    subscriptionId: Number.isFinite(idNum) ? idNum : subscriptionId
  }
  if (kind === 'soft' || kind === 'hard') body.errorType = kind
  return body
}

export function isAcceptableRecurrenceHttpFailure(kind: RecurrenceKind, status: number): boolean {
  return kind === 'hard' && status === 400
}

async function postQa(path: string, body: Record<string, unknown>): Promise<Response> {
  const url = buildUrl(path)
  const res = await fetch(url, {
    method: 'POST',
    headers: qaApiHeaders(),
    body: JSON.stringify(body)
  })
  return res
}

export async function payLegacyRecurrence(subscriptionId: string | number, kind: RecurrenceKind): Promise<void> {
  const path = process.env.PLAYWRIGHT_RECURRENCE_PAY_PATH?.trim() || RECURRENT_PATH
  const body = buildPayRecurrenceBody(subscriptionId, kind)

  const res = await postQa(path, body)
  if (!res.ok) {
    if (isAcceptableRecurrenceHttpFailure(kind, res.status)) return
    throw new Error(`payLegacyRecurrence ${kind}: HTTP ${res.status}`)
  }
}

export async function cancelSubscriptionConfirmApi(subscriptionId: string | number): Promise<void> {
  const idNum = Number(subscriptionId)
  const body = { subscriptionId: Number.isFinite(idNum) ? idNum : subscriptionId }
  const res = await postQa(CANCEL_PATH, body)
  if (!res.ok) throw new Error(`cancelSubscriptionConfirmApi: HTTP ${res.status}`)
}

export async function confirmRefundPaymentApi(orderId: string | number, kind: 'success' | 'failed' = 'success'): Promise<void> {
  const body: Record<string, unknown> = { orderId }
  if (kind === 'failed') body.status = 'failed'
  const res = await postQa(REFUND_PATH, body)
  if (!res.ok) throw new Error(`confirmRefundPaymentApi: HTTP ${res.status}`)
}

export async function blockCustomerApi(customerUUID: string): Promise<void> {
  const res = await postQa(BLOCK_PATH, { customerUUID, fail: false })
  if (!res.ok) throw new Error(`blockCustomerApi: HTTP ${res.status}`)
}

/**
 * Espera heurística post-disparo. El backend procesa el evento y CRM
 * eventualmente refleja la transacción; el caller debe verificar en CRM.
 */
export async function waitForRecurrenceToFinish(timeoutMs = 60_000): Promise<void> {
  await new Promise((r) => setTimeout(r, Math.min(timeoutMs, 30_000)))
}
