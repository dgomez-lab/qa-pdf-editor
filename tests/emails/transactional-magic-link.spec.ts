import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'
import { toCatcherEmail, waitForMessageDetail, subjectFragmentFor } from '../helpers/mailpitClient'

function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}

type Case = { tag: string; loc: string }

const cases: Case[] = [
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_ES', loc: 'es' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_FR', loc: 'fr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_IT', loc: 'it' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_PT', loc: 'pt' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_DE', loc: 'de' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_JA', loc: 'ja' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_PL', loc: 'pl' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_TR', loc: 'tr' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_AR', loc: 'ar' },
  { tag: '@PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_NL', loc: 'nl' }
]

/**
 * `TransactionalEmails.feature` — "Magic link email is in <locale> language" (10 locales).
 */
test.describe('Transactional — magic link (Mailpit)', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL')
    test.skip(!isPdfhintSite(), 'Rutas localizadas pdfhint')
  })

  for (const c of cases) {
    test(`${c.loc.toUpperCase()} — magic link email`, { tag: [c.tag] }, async ({ page }) => {
      test.setTimeout(180_000)
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+ml${c.loc}+${unique}@example.com`

      await page.goto(`/${c.loc}/login`, { waitUntil: 'domcontentloaded' })
      await dismissCookiesIfPresent(page)
      const afterMs = Date.now()
      await page.locator('[data-id="emailForm"]').waitFor({ state: 'visible', timeout: 60_000 })
      await page.locator('[data-id="emailForm"]').fill(email)
      await page.locator('[data-id="loginBtnSubmit"]').click()

      const detail = await waitForMessageDetail({
        search: toCatcherEmail(email),
        subjectIncludes: subjectFragmentFor('magicLink', c.loc),
        timeoutMs: 120_000,
        afterMs
      })
      expect(detail.Subject?.trim()).toBeTruthy()
      expect(`${detail.HTML ?? ''}\n${detail.Text ?? ''}`).toMatch(/https?:\/\//)
    })
  }
})
