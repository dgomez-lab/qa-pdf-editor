import { test, type Page } from '@playwright/test'
import { dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import { isPdfhintSite } from '../helpers/seoExpectations'
import { toCatcherEmail, waitForMessageDetail } from '../helpers/mailpitClient'
import {
  assertAccountCreatedEmail,
  subjectFragmentForLocale
} from '../helpers/accountCreatedEmailAssertions'

function mailpitReady(): boolean {
  return !!process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
}

async function gotoLoginInLocale(page: Page, locale: string): Promise<void> {
  const loc = locale.toLowerCase()
  const path = isPdfhintSite() ? (loc === 'en' ? '/en/login' : `/${loc}/login`) : '/login'
  await gotoMarketingPath(page, path, { waitUntil: 'domcontentloaded' })
  await dismissCookiesIfPresent(page)
}

async function runAccountCreatedEmailTest(page: Page, locale: string, emailDefault: string): Promise<void> {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? emailDefault
  const mailpitSearch = toCatcherEmail(email)

  await gotoLoginInLocale(page, locale)
  await page.locator('[data-id="emailForm"]').waitFor({ state: 'visible', timeout: 60_000 })
  const afterMs = Date.now()
  await page.locator('[data-id="emailForm"]').fill(email)
  await page.locator('[data-id="loginBtnSubmit"]').click()

  const detail = await waitForMessageDetail({
    search: mailpitSearch,
    subjectIncludes: subjectFragmentForLocale(locale),
    timeoutMs: 90_000,
    afterMs
  })
  assertAccountCreatedEmail(detail, locale, email)
}

/**
 * Paridad con `TransactionalEmails.feature` — Scenario Outline "Account created email after registration from login".
 * Requiere Mailpit (`PLAYWRIGHT_MAILPIT_URL`) y entorno **pdfhint** para rutas `/en/login`, `/es/login`, etc.
 */
test.describe('Transactional — account created (Mailpit)', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL'] }, () => {
  test.beforeEach(() => {
    test.skip(!mailpitReady(), 'PLAYWRIGHT_MAILPIT_URL (API v1 Mailpit)')
    test.skip(!isPdfhintSite(), 'Rutas localizadas /{locale}/login usadas en staging pdfhint')
  })

  test('EN — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_EN'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'en', `playwright+acct+${Date.now()}@example.com`)
  })

  test('ES — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_ES'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'es', `playwright+acctes+${Date.now()}@example.com`)
  })

  test('FR — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_FR'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'fr', `playwright+acctfr+${Date.now()}@example.com`)
  })

  test('DE — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_DE'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'de', `playwright+acctde+${Date.now()}@example.com`)
  })

  test('IT — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_IT'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'it', `playwright+acctit+${Date.now()}@example.com`)
  })

  test('PT — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_PT'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'pt', `playwright+acctpt+${Date.now()}@example.com`)
  })

  test('NL — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_NL'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'nl', `playwright+acctnl+${Date.now()}@example.com`)
  })

  test('JA — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_JA'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'ja', `playwright+acctja+${Date.now()}@example.com`)
  })

  test('PL — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_PL'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'pl', `playwright+acctpl+${Date.now()}@example.com`)
  })

  test('TR — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_TR'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'tr', `playwright+accttr+${Date.now()}@example.com`)
  })

  test('AR — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_AR'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'ar', `playwright+acctar+${Date.now()}@example.com`)
  })

  test('KO — correo cuenta creada', { tag: ['@PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_KO'] }, async ({
    page
  }) => {
    test.setTimeout(120_000)
    await runAccountCreatedEmailTest(page, 'ko', `playwright+acctko+${Date.now()}@example.com`)
  })
})
