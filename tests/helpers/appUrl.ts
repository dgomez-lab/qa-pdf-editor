/**
 * Resolución del subdominio `app.*` para los flujos autenticados de pdfhint
 * (login, dashboard, account, settings).
 *
 * Arquitectura del producto en staging/prod:
 * - `staging.pdfhint.com` y `pdfhint.com` → marketing (home, /lp/*, /forms, /editor anónimo,
 *   /faqs, /contact, /about, /cookies, /privacy, /terms, /terms-and-conditions).
 * - `app.staging.pdfhint.com` y `app.pdfhint.com` → app autenticada (login, dashboard,
 *   account, settings, editor logueado tras magic-link).
 *
 * El legacy `qai-pa-pdf-editor` no necesitaba este split porque navegaba siempre a
 * través del botón "Login" del header (`data-id="logIn"`) que apunta al `app.*`. En
 * Playwright muchos specs hacen `page.goto('/en/login' | '/dashboard' | '/account')`
 * directamente, así que necesitan el host `app.*`.
 *
 * Variables de entorno:
 * - `PDFHINT_APP_BASE_URL` — override explícito (default: deriva de `BASE_URL` añadiendo
 *   `app.` al hostname).
 * - Si la `BASE_URL` ya incluye `app.`, se usa tal cual.
 * - Si no es un host pdfhint (p.ej. mergedpdf `red.mvps.website`), se devuelve la
 *   `BASE_URL` original (en mvps el login está en el mismo dominio).
 */

import { resolvePlaywrightBaseUrl } from '../../playwright/resolveBaseUrl'

export function resolveAppBaseUrl(): string {
  const explicit = process.env.PDFHINT_APP_BASE_URL?.trim()
  if (explicit) return stripTrailing(explicit)

  const base = resolvePlaywrightBaseUrl()
  return mapToAppHost(base)
}

export function isPdfhintApp(): boolean {
  return /pdfhint\.com/i.test(resolvePlaywrightBaseUrl())
}

/**
 * Devuelve una URL absoluta apta para `page.goto(...)` para una ruta autenticada
 * (login/dashboard/account/settings). Si el host no es pdfhint, devuelve la ruta
 * relativa para mantener el comportamiento del legacy mvps.
 */
export function appUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (!isPdfhintApp()) return cleanPath
  return `${resolveAppBaseUrl()}${cleanPath}`
}

function mapToAppHost(base: string): string {
  try {
    const u = new URL(base)
    if (!/pdfhint\.com$/i.test(u.hostname)) return stripTrailing(base)
    if (u.hostname.startsWith('app.')) return stripTrailing(base)
    u.hostname = `app.${u.hostname}`
    return stripTrailing(u.toString())
  } catch {
    return stripTrailing(base)
  }
}

function stripTrailing(url: string): string {
  return url.replace(/\/+$/, '')
}
