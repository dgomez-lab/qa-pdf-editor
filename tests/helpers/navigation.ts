import type { Page } from '@playwright/test'
import { home } from '../pages/editorSelectors'
import { isMvpsMergedStage } from './siteContext'
import { gotoMarketingPath } from './mvpsUrl'

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
}

export async function openHome(page: Page, options?: OpenHomeOptions): Promise<void> {
  const path =
    options?.query && Object.keys(options.query).length > 0
      ? `/?${new URLSearchParams(options.query).toString()}`
      : '/'
  await gotoMarketingPath(page, path)
  await dismissCookiesIfPresent(page)

  if (isMvpsMergedStage()) {
    const logo = page.locator('[data-id="logo"]').first()
    const fileHit = page.locator(home.fileInput).first()
    const main = page.locator('main').first()
    await Promise.race([
      logo.waitFor({ state: 'visible', timeout: 90_000 }),
      fileHit.waitFor({ state: 'attached', timeout: 90_000 }),
      main.waitFor({ state: 'visible', timeout: 90_000 })
    ])
    return
  }

  const homeLink = page.getByRole('link', { name: /pdfhint Home|^Home$/i }).first()
  const logoByDataId = page.locator('[data-id="logo"]').first()
  await Promise.race([
    homeLink.waitFor({ state: 'visible', timeout: 60_000 }),
    logoByDataId.waitFor({ state: 'visible', timeout: 60_000 })
  ]).catch(async () => {
    await page.locator('main').waitFor({ state: 'visible', timeout: 15_000 })
  })
}
