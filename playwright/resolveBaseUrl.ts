/**
 * Resuelve la base URL alineada con qai-pa-pdf-editor (`ProjectData.getUrl` + `configuration.pdfhint`).
 *
 * Prioridad:
 * 1. `BASE_URL` si viene definida (control total).
 * 2. `APP=pdfhint` (o por defecto): staging pdfhint sin token QA.
 * 3. `APP=mergedpdf` (o `mvps`): `https://{red|redN}.mvps.website` (sin query; el token
 *    `x-token-qa` se añade en cada navegación vía `tests/helpers/mvpsUrl.ts`).
 *
 * Slots MVPS: `MVPS_SLOT` vacío o `0` → `red`; `1`…`10` → `red1`…`red10`.
 * También se admite `ENVIRONMENT=red3` estilo Cucumber (`projectVars.environment`).
 */
export function resolvePlaywrightBaseUrl(): string {
  const explicit = process.env.BASE_URL?.trim()
  if (explicit) {
    try {
      const normalized = explicit.includes('://') ? explicit : `https://${explicit}`
      const u = new URL(normalized)
      if (u.hostname.includes('mvps.website') && u.search) {
        if (!process.env.QAI_TOKEN_PARAM?.trim()) {
          process.env.QAI_TOKEN_PARAM = u.search.slice(1).replace(/^\?/, '')
        }
        return stripTrailingSlashes(u.origin)
      }
    } catch {
      /* usar explicit tal cual */
    }
    return stripTrailingSlashes(explicit)
  }

  // `??` no sustituye cadena vacía: en CI a veces `APP`/`PLAYWRIGHT_APP` llegan como "".
  const appRaw =
    process.env.APP?.trim() || process.env.PLAYWRIGHT_APP?.trim() || ''
  const defaultApp =
    !appRaw && process.env.GITHUB_ACTIONS === 'true' ? 'mergedpdf' : 'pdfhint'
  const app = (appRaw || defaultApp).toLowerCase()
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

/**
 * Origen MVPS sin query de QA (el token va en `ensureMvpsMarketingUrl` al hacer `goto`).
 */
function buildMvpsWithToken(): string {
  const slug = resolveMvpsSlug()
  return `https://${slug}.mvps.website`
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
