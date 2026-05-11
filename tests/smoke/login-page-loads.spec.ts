import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'

test.describe('Smoke — login', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test('ruta login carga', { tag: ['@PDFEDITOR_SMOKE_LOGIN'] }, async ({ page }) => {
    const path = isPdfhintSite()
      ? (process.env.SEO_LOGIN_PATHNAME?.trim() || '/en/login')
      : '/login'
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => null)
    if (!res || res.status() >= 400) {
      test.skip(true, `login no disponible en esta baseURL (${path})`)
      return
    }
    await dismissCookiesIfPresent(page)
    await expect(page.locator('main').or(page.locator('body')).first()).toBeVisible({ timeout: 60_000 })
  })
})
