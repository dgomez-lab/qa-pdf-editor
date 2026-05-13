import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'

function visualSnapshotsEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_VISUAL_SNAPSHOTS?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

const screenshotOptions = {
  fullPage: false,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const,
  maxDiffPixels: 2500
}

/**
 * `Visual.feature` — Scenario Outline "Visual comparison of all forms in editor page" (18 forms).
 * Cada test abre la LP del formulario (ruta `/lp/<slug>` heurística) y captura.
 */
type Form = { tag: string; path: string; pngBase: string }

const forms: Form[] = [
  { tag: '@PDFEDITOR_VISUAL_FORM_W4', path: '/lp/w4-form-2023', pngBase: 'form-w4' },
  { tag: '@PDFEDITOR_VISUAL_FORM_W9', path: '/lp/form-w9', pngBase: 'form-w9' },
  { tag: '@PDFEDITOR_VISUAL_FORM_1040_2021', path: '/lp/1040-2021-form', pngBase: 'form-1040-2021' },
  { tag: '@PDFEDITOR_VISUAL_FORM_1040', path: '/lp/1040-form', pngBase: 'form-1040' },
  { tag: '@PDFEDITOR_VISUAL_FORM_SOCIAL', path: '/lp/social-security-card-form', pngBase: 'form-social' },
  { tag: '@PDFEDITOR_VISUAL_FORM_1099', path: '/lp/form-1099-misc-2022', pngBase: 'form-1099' },
  { tag: '@PDFEDITOR_VISUAL_FORM_1099_NEC', path: '/lp/form-1099-nec', pngBase: 'form-1099-nec' },
  { tag: '@PDFEDITOR_VISUAL_FORM_W2', path: '/lp/w2-form', pngBase: 'form-w2' },
  { tag: '@PDFEDITOR_VISUAL_FORM_1095', path: '/lp/form-1095', pngBase: 'form-1095' },
  { tag: '@PDFEDITOR_VISUAL_FORM_PHILIPPINES', path: '/lp/form-philippines', pngBase: 'form-philippines' },
  { tag: '@PDFEDITOR_VISUAL_FORM_941', path: '/lp/form-941', pngBase: 'form-941' },
  { tag: '@PDFEDITOR_VISUAL_FORM_FEEDEX', path: '/lp/form-feedex', pngBase: 'form-feedex' },
  { tag: '@PDFEDITOR_VISUAL_FORM_DA', path: '/lp/form-da', pngBase: 'form-da' },
  { tag: '@PDFEDITOR_VISUAL_FORM_SCHEDULE', path: '/lp/form-schedule', pngBase: 'form-schedule' },
  { tag: '@PDFEDITOR_VISUAL_FORM_DS11', path: '/lp/form-ds11', pngBase: 'form-ds11' },
  { tag: '@PDFEDITOR_VISUAL_FORM_OBITUARY', path: '/lp/form-obituary', pngBase: 'form-obituary' },
  { tag: '@PDFEDITOR_VISUAL_FORM_MARRIAGE', path: '/lp/form-marriage', pngBase: 'form-marriage' },
  { tag: '@PDFEDITOR_VISUAL_FORM_GIFT', path: '/lp/form-gift', pngBase: 'form-gift' }
]

test.describe('Visual — formularios (LP)', { tag: ['@PDFEDITOR_VISUAL'] }, () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!visualSnapshotsEnabled(), 'PLAYWRIGHT_VISUAL_SNAPSHOTS=1')
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  for (const f of forms) {
    test(`Form ${f.pngBase}`, { tag: [f.tag] }, async ({ page }) => {
      const path = process.env[`PLAYWRIGHT_VISUAL_FORM_PATH_${f.pngBase.toUpperCase().replace(/-/g, '_')}`]?.trim() || f.path
      const resp = await gotoMarketingPath(page, path, { waitUntil: 'domcontentloaded' }).catch(() => null)
      if (resp && resp.status() >= 400) {
        test.skip(true, `Form LP ${path} → HTTP ${resp.status()} (legacy slug ausente en este entorno)`)
      }
      await dismissCookiesIfPresent(page)
      await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
      await page.waitForTimeout(2000)
      await expect(page).toHaveScreenshot(`visual-${f.pngBase}.png`, screenshotOptions)
    })
  }
})
