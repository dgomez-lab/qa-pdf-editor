import type { Page } from '@playwright/test'

/**
 * Sustituye la comprobación por data-id mostUsedForm/logIn (UI Astro de marketing pdfhint).
 * Mantiene la intención del smoke SEO: login accesible con URL absoluta y enlace a /forms.
 */
async function resolvePdfhintLoginLink(page: Page) {
  const byRole = page.getByRole('link', { name: /^log\s*in$/i }).first()
  if (await byRole.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return byRole
  }
  const byDataId = page.locator('a[data-id="logIn"]').first()
  await byDataId.waitFor({ state: 'visible', timeout: 15_000 })
  return byDataId
}

export async function collectPdfhintHeaderSeoErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  let login
  try {
    login = await resolvePdfhintLoginLink(page)
  } catch {
    errors.push('missing visible Login link in main navigation')
    return errors
  }
  const href = await login.getAttribute('href')
  if (!href || href.trim() === '') {
    errors.push('Login: missing href')
    return errors
  }
  if (!/^https?:\/\//i.test(href.trim())) {
    errors.push(`Login: expected absolute http(s) href, got: ${href}`)
  }
  try {
    const u = new URL(href.trim())
    const pn = u.pathname.replace(/\/$/, '') || '/'
    const okLogin = /\/login$/i.test(pn) || /\/en\/login$/i.test(pn)
    if (!okLogin) errors.push(`Login: unexpected pathname ${u.pathname}`)
  } catch {
    errors.push(`Login: invalid URL ${href}`)
  }

  const formsLink = page.locator('main a[href*="/forms"], nav a[href*="/forms"]').first()
  if (!(await formsLink.count())) {
    errors.push('missing link to /forms in main or nav')
  } else {
    const fh = await formsLink.getAttribute('href')
    if (!fh) errors.push('Forms link: missing href')
    else {
      const origin = new URL(page.url()).origin
      try {
        const pu = /^https?:\/\//i.test(fh.trim()) ? new URL(fh.trim()) : new URL(fh.trim(), `${origin}/`)
        const p = pu.pathname.replace(/\/$/, '') || '/'
        if (p !== '/forms') errors.push(`Forms link: expected pathname /forms, got ${pu.pathname}`)
      } catch {
        errors.push(`Forms link: invalid href ${fh}`)
      }
    }
  }

  return errors
}
