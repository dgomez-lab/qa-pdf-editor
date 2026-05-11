import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'
import { editor } from '../pages/editorSelectors'
import { appUrl } from '../helpers/appUrl'

/**
 * Superficie mínima de ruta Dashboard (invitado o app): sin pago previo.
 * Complementa `@PDFEDITOR_DASHBOARD` (pago + modal) y `@PDFEDITOR_DASHBOARD_RENAME_DOCUMENT`.
 */
test.describe('Dashboard — ruta', { tag: ['@PDFEDITOR_DASHBOARD'] }, () => {
  test('carga ruta dashboard o login', { tag: ['@PDFEDITOR_DASHBOARD_ROUTE_LOAD'] }, async ({ page }) => {
    const path = isPdfhintSite() ? '/en/dashboard' : '/dashboard'
    await page.goto(appUrl(path), { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)

    const loginEmail = page.locator('[data-id="emailForm"]')
    const uploadCta = page.locator(editor.uploadDocumentButton).first()
    await expect(loginEmail.or(uploadCta)).toBeVisible({ timeout: 60_000 })
  })
})
