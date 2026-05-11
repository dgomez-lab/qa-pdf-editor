/**
 * Resuelve la base URL alineada con qai-pa-pdf-editor (`ProjectData.getUrl` + `configuration.pdfhint`).
 *
 * Prioridad:
 * 1. `BASE_URL` si viene definida (control total).
 * 2. `APP=pdfhint` (o por defecto): staging pdfhint sin token QA.
 * 3. `APP=mergedpdf` (o `mvps`): `https://{red|redN}.mvps.website?x-token-qa=...`
 *
 * Slots MVPS: `MVPS_SLOT` vacío o `0` → `red`; `1`…`10` → `red1`…`red10`.
 * También se admite `ENVIRONMENT=red3` estilo Cucumber (`projectVars.environment`).
 */
export function resolvePlaywrightBaseUrl(): string {
  const explicit = process.env.BASE_URL?.trim()
  if (explicit) return stripTrailingSlashes(explicit)

  const app = (process.env.APP ?? process.env.PLAYWRIGHT_APP ?? 'pdfhint').toLowerCase()
  if (app === 'mergedpdf' || app === 'mvps') {
    return buildMvpsWithToken()
  }
  if (
    app === 'pdfhint' ||
    app === 'staging-pdfhint' ||
    app === 'pdfhint-staging' ||
    app === 'website-pdfhint'
  ) {
    const o = process.env.PDFHINT_BASE_URL?.trim()
    return stripTrailingSlashes(o || 'https://staging.pdfhint.com')
  }

  const o = process.env.PDFHINT_BASE_URL?.trim()
  return stripTrailingSlashes(o || 'https://staging.pdfhint.com')
}

function buildMvpsWithToken(): string {
  const token = process.env.QAI_TOKEN_PARAM?.trim() || 'x-token-qa=niGqCYH7McqERAB'
  const slug = resolveMvpsSlug()
  const base = `https://${slug}.mvps.website`
  if (process.env.APPEND_QA_TOKEN === '0' || process.env.APPEND_QA_TOKEN === 'false') {
    return base
  }
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}${token}`
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '')
}

function resolveMvpsSlug(): string {
  const env = process.env.ENVIRONMENT?.trim().toLowerCase()
  if (env && /^red\d*$/i.test(env)) {
    return env
  }
  const slot = process.env.MVPS_SLOT?.trim()
  if (!slot || slot === '0') return 'red'
  if (/^\d{1,2}$/.test(slot)) return `red${slot}`
  if (/^red\d*$/i.test(slot)) return slot.toLowerCase()
  return 'red'
}
