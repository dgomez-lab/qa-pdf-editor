import { test, expect } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { isPdfhintSite } from '../helpers/seoExpectations'
import { toCatcherEmail, waitForMagicLink } from '../helpers/mailpitClient'
import { appUrl } from '../helpers/appUrl'

function visualSnapshotsEnabled(): boolean {
  const v = process.env.PLAYWRIGHT_VISUAL_SNAPSHOTS?.trim()
  return v === '1' || v === 'true' || v === 'yes'
}

function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}

const screenshotOptions = {
  fullPage: false,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const,
  maxDiffPixels: 3500
}

/**
 * Visual con **sesión**: magic link desde `/en/login` → `/en/account` (pdfhint).
 * Baselines: `tests/visual/visual-account-session.spec.ts-snapshots/` (`PLAYWRIGHT_VISUAL_SNAPSHOTS=1` + Mailpit).
 */
test.describe('Visual — cuenta (sesión)', { tag: ['@PDFEDITOR_VISUAL'] }, () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!visualSnapshotsEnabled(), 'PLAYWRIGHT_VISUAL_SNAPSHOTS=1')
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL (magic link)')
    test.skip(!isPdfhintSite(), 'Rutas /en/login y /en/account (staging pdfhint)')
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('Account', { tag: ['@PDFEDITOR_VISUAL_ACCOUNT'] }, async ({ page }) => {
    test.setTimeout(240_000)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const rawEmail = process.env.PLAYWRIGHT_TEST_EMAIL ?? `playwright+visacct+${unique}@example.com`
    const search = process.env.PLAYWRIGHT_MAILPIT_SEARCH_EMAIL?.trim() || toCatcherEmail(rawEmail)

    await page.goto(appUrl('/en/login'), { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('[data-id="emailForm"]').waitFor({ state: 'visible', timeout: 60_000 })
    const afterMs = Date.now()
    await page.locator('[data-id="emailForm"]').fill(rawEmail)
    await page.locator('[data-id="loginBtnSubmit"]').click()

    const magicUrl = await waitForMagicLink({
      search,
      subjectIncludes: process.env.PLAYWRIGHT_MAILPIT_MAGIC_SUBJECT?.trim() || 'sign in',
      timeoutMs: 120_000,
      afterMs
    })
    await page.goto(magicUrl, { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.waitForTimeout(3000)

    await page.goto(appUrl('/en/account'), { waitUntil: 'domcontentloaded' })
    await dismissCookiesIfPresent(page)
    await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 })
    await page.waitForTimeout(2000)
    await expect(page).toHaveScreenshot('visual-account.png', screenshotOptions)
  })
})
