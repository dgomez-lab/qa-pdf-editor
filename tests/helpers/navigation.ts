import type { Page } from '@playwright/test'
import { home } from '../pages/editorSelectors'
import { isMvpsMergedStage } from './siteContext'
import { isPdfhintSite } from './seoExpectations'
import { gotoMarketingPath } from './mvpsUrl'
import { waitForMvpsHeaderHydration } from './seoAbsoluteHrefs'

/**
 * Cierra banners de consentimiento (CMP en marketing puede no usar solo data-id del editor).
 */
export async function dismissCookiesIfPresent(page: Page): Promise<void> {
  const candidates = [
    page.locator('[data-id="ctaAcceptCookies"]'),
    page.getByRole('button', { name: /Agree and close/i }),
    page.getByRole('button', { name: /Accept all/i }),
    page.getByRole('button', { name: /Aceptar/i })
  ]
  for (const loc of candidates) {
    if (await loc.first().isVisible({ timeout: 2500 }).catch(() => false)) {
      await loc.first().click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
      break
    }
  }
}

export type OpenHomeOptions = {
  /** Query string en la raíz (p. ej. UTM: `{ utm_source: 'x', utm_medium: 'y' }`). */
  query?: Record<string, string>
  /** Paridad `HomePage.loadPageWithLocale` (pdfhint: `/es/`, `/fr/`, …; `en` → `/`). */
  locale?: string
}

function resolveHomePath(options?: OpenHomeOptions): string {
  const loc = options?.locale?.trim().toLowerCase()
  let base = '/'
  if (loc && isPdfhintSite() && loc !== 'en') {
    base = `/${loc}/`
  }
  const q = options?.query
  if (q && Object.keys(q).length > 0) {
    const qs = new URLSearchParams(q).toString()
    if (base === '/') return `/?${qs}`
    return `${base}?${qs}`
  }
  return base
}

async function waitForMvpsHomeReady(page: Page, timeoutMs: number): Promise<boolean> {
  const logo = page.locator('[data-id="logo"]').first()
  const fileHit = page.locator(home.fileInput).first()
  const main = page.locator('main').first()
  try {
    await Promise.race([
      logo.waitFor({ state: 'visible', timeout: timeoutMs }),
      fileHit.waitFor({ state: 'attached', timeout: timeoutMs }),
      main.waitFor({ state: 'visible', timeout: timeoutMs })
    ])
    await waitForMvpsHeaderHydration(page, timeoutMs)
    return true
  } catch {
    return false
  }
}

async function waitForPdfhintHomeReady(page: Page, timeoutMs: number): Promise<boolean> {
  const homeLink = page.getByRole('link', { name: /pdfhint Home|^Home$/i }).first()
  const logoByDataId = page.locator('[data-id="logo"]').first()
  const fileHit = page.locator(home.fileInput).first()
  const mainOrHeading = page.locator('main, h1, h2, h3').first()
  try {
    await Promise.race([
      homeLink.waitFor({ state: 'visible', timeout: timeoutMs }),
      logoByDataId.waitFor({ state: 'visible', timeout: timeoutMs }),
      fileHit.waitFor({ state: 'attached', timeout: timeoutMs }),
      mainOrHeading.waitFor({ state: 'visible', timeout: timeoutMs })
    ])
    return true
  } catch {
    try {
      await page
        .locator('main, h1, h2, h3, [data-id="logo"]')
        .first()
        .waitFor({ state: 'visible', timeout: Math.min(timeoutMs, 30_000) })
      return true
    } catch {
      return false
    }
  }
}

export async function openHome(page: Page, options?: OpenHomeOptions): Promise<void> {
  const path = resolveHomePath(options)
  const mvps = isMvpsMergedStage()
  const firstPassTimeout = process.env.CI ? (mvps ? 45_000 : 40_000) : mvps ? 90_000 : 60_000
  const finalTimeout = process.env.CI && mvps ? 120_000 : mvps ? 90_000 : 60_000

  const loadOnce = async () => {
    await gotoMarketingPath(page, path)
    await dismissCookiesIfPresent(page)
    return mvps ? waitForMvpsHomeReady(page, firstPassTimeout) : waitForPdfhintHomeReady(page, firstPassTimeout)
  }

  if (!(await loadOnce()) && process.env.CI) {
    await gotoMarketingPath(page, path)
    await dismissCookiesIfPresent(page)
  }

  if (mvps) {
    const ready = await waitForMvpsHomeReady(page, finalTimeout)
    if (!ready) {
      throw new Error('MVPS home did not load (logo, file input, or main)')
    }
    return
  }

  const ready = await waitForPdfhintHomeReady(page, finalTimeout)
  if (!ready) {
    throw new Error('Home page did not load expected markers')
  }
}
