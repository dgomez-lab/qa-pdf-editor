import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'

/**
 * Paridad mínima con `Users.feature` — ruta de cuenta: invitado ve login o cabecera de cuenta.
 */
test.describe('Users — cuenta (carga)', { tag: ['@PDFEDITOR_USER'] }, () => {
  test('ruta cuenta o login accesible', { tag: ['@PDFEDITOR_USER_ACCOUNT'] }, async ({ page }) => {
    const path = isPdfhintSite() ? '/en/account' : '/account'
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)

    const loginEmail = page.locator('[data-id="emailForm"]')
    const accountish = page.getByRole('heading', { name: /account|cuenta|compte|konto|conto/i })
    await expect(loginEmail.or(accountish).first()).toBeVisible({ timeout: 60_000 })
  })
})
