import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'
import {
  extractAccountCreatedGetStartedHref,
  extractMagicLinkFromMessage,
  isMailpitConfigured,
  toCatcherEmail,
  waitForMessageDetailSubjectMatchesOne
} from '../helpers/mailpitClient'
import { appUrl } from '../helpers/appUrl'

function mailpitReady(): boolean {
  return isMailpitConfigured()
}

test.describe('Smoke — login por magic link', { tag: ['@PDFEDITOR_SMOKE'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!isPdfhintSite(), '/en/login (pdfhint)')
  })

  test('email + Mailpit abre sesión', { tag: ['@PDFEDITOR_SMOKE_MAGIC_LINK'] }, async ({ page }) => {
    test.setTimeout(180_000)
    const unique = Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
    // El legacy genera `qa_<random>+pdfeditor@catcher.1ecorp.net` para que Mailpit reciba
    // el correo (cualquier dominio externo no llega al catcher de staging).
    const rawEmail = process.env.PLAYWRIGHT_TEST_EMAIL ?? `qa${unique}+pdfeditor@catcher.1ecorp.net`
    const search = process.env.PLAYWRIGHT_MAILPIT_SEARCH_EMAIL?.trim() || toCatcherEmail(rawEmail)

    await page.goto(appUrl('/en/login'), { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('[data-id="emailForm"]').waitFor({ state: 'visible', timeout: 60_000 })
    const afterMs = Date.now()
    await page.locator('[data-id="emailForm"]').fill(rawEmail)
    await page.locator('[data-id="loginBtnSubmit"]').click()

    /**
     * El primer envío con un email nuevo dispara `pdfhint - Free account created` (con CTA
     * "Get started!" que loguea); el reenvío con el mismo email manda `sign in`. Aceptamos
     * ambos para que el smoke sea robusto.
     */
    const message = await waitForMessageDetailSubjectMatchesOne({
      search,
      subjectSubstrings: ['sign in', 'free account created', 'account created'],
      timeoutMs: 120_000,
      afterMs
    })
    const isAccountCreated = /account created/i.test(message.Subject ?? '')
    const magicUrl = isAccountCreated
      ? extractAccountCreatedGetStartedHref(message)
      : extractMagicLinkFromMessage(message)
    await page.goto(magicUrl, { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await expect(page).toHaveURL(/dashboard|editor|lp|account|upload|home|pdfhint|mvps/i, { timeout: 90_000 })
  })
})
