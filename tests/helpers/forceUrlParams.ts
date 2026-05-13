import type { Page } from '@playwright/test'
import { gotoMarketingPath } from './mvpsUrl'

/**
 * Equivalente Playwright a `BotPage.forceUrlWithParameters` (qai-pa-pdf-editor).
 * Toma la URL actual y le agrega/sustituye los parámetros indicados, luego navega.
 *
 * - Valores vacíos no se serializan (legacy también los excluye).
 */
export async function forceUrlWithParameters(page: Page, params: Record<string, string>): Promise<void> {
  const current = new URL(page.url())
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue
    current.searchParams.set(k, v)
  }
  await gotoMarketingPath(page, current.toString(), { waitUntil: 'domcontentloaded' })
}

/**
 * Paridad con "I force a wrong URL" del legacy: sustituye el último segmento por una ruta inválida
 * y navega esperando 404 / fallback (`/this-route-does-not-exist`).
 */
export async function forceWrongUrl(page: Page): Promise<void> {
  const raw = new URL('/this-route-does-not-exist', page.url()).toString()
  await gotoMarketingPath(page, raw, { waitUntil: 'domcontentloaded' }).catch(() => {})
}
