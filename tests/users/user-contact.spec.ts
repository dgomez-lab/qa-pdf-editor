import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { contact } from '../pages/contactSelectors'

/**
 * Paridad con `Users.feature` — `@PDFEDITOR_USER_CONTACT` (formulario contacto).
 */
test.describe('Users — contacto', { tag: ['@PDFEDITOR_USER'] }, () => {
  test('enviar formulario de contacto muestra éxito', { tag: ['@PDFEDITOR_USER_CONTACT'] }, async ({ page }) => {
    const email =
      process.env.PLAYWRIGHT_CONTACT_EMAIL?.trim() ||
      `playwright-contact+${Date.now()}@example.com`

    await gotoMarketingPath(page, '/contact', { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)

    await page.locator(contact.firstName).waitFor({ state: 'visible', timeout: 60_000 })
    await page.locator(contact.firstName).fill('Playwright')
    await page.locator(contact.lastName).fill('QA')
    await page.locator(contact.email).fill(email)
    await page.locator(contact.transactionId).fill('E2E')
    const subject = page.locator(contact.subjectSelect)
    await subject.selectOption({ value: 'unsubscribe' }).catch(async () => {
      await subject.selectOption({ label: 'Unsubscribe Request' })
    })
    await page.locator(contact.message).fill('Mensaje de prueba automatizado (qa-pdf-editor).')
    await page.locator(contact.acceptTerms).click()
    await page.locator(contact.sendButton).click()

    await expect(page.locator(contact.success).first()).toBeVisible({ timeout: 60_000 })
  })
})
