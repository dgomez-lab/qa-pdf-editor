import type { BrowserContext, Page } from '@playwright/test'
import { openHome, dismissCookiesIfPresent } from '../helpers/navigation'
import { gotoMarketingPath } from '../helpers/mvpsUrl'
import {
  runEditorUploadRegisterAndVisaPayment,
  openDashboardViaPaymentSuccessModal
} from '../helpers/pdfhintEditorPaymentFlow'
import {
  closeOnboarding,
  closeOnboardingOnce,
  gotoAccount,
  gotoDashboard,
  gotoLogin,
  clickAccountMenu
} from '../helpers/dashboardActions'
import { fixturePathFor, gotoLanding } from '../helpers/multiFormatUpload'
import { isPdfhintScenario } from '../helpers/pdfhintScenario'
import { home } from '../pages/editorSelectors'
import { fillStripePaymentLikeLegacy } from '../helpers/stripePayment'
import { clickNextButton, createNewUserFromEditor, waitForEditorAfterUpload } from '../helpers/editorActions'
import { logPageLoad, logVisitUrl } from './bddLogger'
import { registerNewUserFromLogin, loginExistingUserFromLogin } from '../helpers/loginFlow'
import { openCrmCustomerForEmail, loginCrmAndOpenCustomers, searchAndOpenFirstCustomer } from '../helpers/crmStaging'
import { forceUrlWithParameters, forceWrongUrl } from '../helpers/forceUrlParams'
import { homeQueryFromTestData } from '../helpers/testIpQuery'
import { contact } from '../pages/contact/contactSelectorsBundle'
import type { BddWorld } from './fixtures'
import { closeCrmPageIfOpen } from './stepHelpers'

function flow(td: Record<string, string>): string {
  return (td.flow ?? 'Default').trim()
}

export async function loadHomePage(page: Page, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  logPageLoad('Home')
  const loc = w.testData.locale?.trim()
  await openHome(page, {
    ...(homeQueryFromTestData(w.testData) ? { query: homeQueryFromTestData(w.testData)! } : {}),
    ...(loc && loc !== 'en' ? { locale: loc } : {})
  })
  logVisitUrl(page.url())
  w.currentPage = 'Home'
}

export async function loadLoginPage(page: Page, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  logPageLoad('Login')
  const f = flow(w.testData)
  if (f === 'Direct' || f === 'Dashboard') {
    await loadHomePage(page, w)
    const loginLink = page.getByRole('link', { name: /log\s*in/i }).first()
    if (await loginLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await loginLink.click()
      await page.waitForURL(/\/login/i, { timeout: 60_000 }).catch(() => {})
    } else {
      await gotoLogin(page)
    }
    await dismissCookiesIfPresent(page)
    await page.locator('[data-id="emailForm"]').waitFor({ state: 'visible', timeout: 60_000 })
  } else {
    await runEditorUploadRegisterAndVisaPayment(page, {
      email: w.email,
      homeQuery: homeQueryFromTestData(w.testData),
      homeLocale: w.testData.locale?.trim() || undefined
    })
    await page.locator('[data-id="emailForm"]').waitFor({ state: 'visible', timeout: 60_000 })
  }
  w.currentPage = 'Login'
}

export async function loadEditorPage(page: Page, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  logPageLoad('Editor')
  const f = flow(w.testData)
  if (f === 'Forms') {
    await openHome(page, {})
    await dismissCookiesIfPresent(page)
    await gotoMarketingPath(page, '/forms', { waitUntil: 'domcontentloaded' }).catch(() => {})
  } else if (f === 'Dashboard') {
    await gotoLogin(page)
    await dismissCookiesIfPresent(page)
    await registerNewUserFromLogin(page, w.email)
    await page.waitForURL(/editor|\/en\//i, { timeout: 120_000 }).catch(() => {})
    if (w.testData.skipUploadInEditorLoadPage === 'true' || w.testData.skipUploadInEditorLoadPage === 'yes') {
      const close = page.locator('[data-id="ctaCloseModal"]').first()
      await close.waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
      await page.locator('.line-loader, [class*="LinearLoader"]').first().waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})
      await page.waitForTimeout(5000)
      await close.click({ timeout: 10_000 }).catch(() => {})
      w.currentPage = 'Editor'
      return
    }
    const pdfPath = fixturePathFor('PDF')
    if (!pdfPath) throw new Error('Missing sample.pdf for Editor load')
    await page.locator(home.fileInput).first().setInputFiles(pdfPath)
    await waitForEditorAfterUpload(page)
    w.currentPage = 'Editor'
    return
  } else {
    await openHome(page, {
      ...(homeQueryFromTestData(w.testData) ? { query: homeQueryFromTestData(w.testData)! } : {}),
      ...(w.testData.locale?.trim() && w.testData.locale.trim() !== 'en'
        ? { locale: w.testData.locale.trim() }
        : {})
    })
    await dismissCookiesIfPresent(page)
    const pdfPath = fixturePathFor('PDF')
    if (!pdfPath) throw new Error('Missing sample.pdf')
    await page.locator(home.fileInput).first().setInputFiles(pdfPath)
    await waitForEditorAfterUpload(page)
  }
  logVisitUrl(page.url())
  w.currentPage = 'Editor'
}

export async function loadDashboardPage(page: Page, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  logPageLoad('Dashboard')
  const f = flow(w.testData)
  if (f === 'Direct') {
    await gotoLogin(page)
    await dismissCookiesIfPresent(page)
    await loginExistingUserFromLogin(page, w.email)
    await gotoDashboard(page)
  } else if (f === 'Dashboard') {
    await loadEditorPage(page, w)
    if (w.testData.skipUploadInEditorLoadPage !== 'true' && w.testData.skipUploadInEditorLoadPage !== 'yes') {
      await clickNextButton(page, { flow: w.testData.flow })
      await createNewUserFromEditor(page, w.email)
      await fillStripePaymentLikeLegacy(
        page,
        {
          number: process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242',
          exp: process.env.STRIPE_TEST_CARD_EXP ?? '1234',
          cvc: process.env.STRIPE_TEST_CARD_CVC ?? '123'
        },
        { testIp: w.testData.ip }
      )
      await page.locator('[data-id="confirm-payment-button"]').first().click()
      await page.locator('[data-id="download"]').first().waitFor({ state: 'visible', timeout: 120_000 })
    }
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
  } else {
    await runEditorUploadRegisterAndVisaPayment(page, {
      email: w.email,
      homeQuery: homeQueryFromTestData(w.testData),
      homeLocale: w.testData.locale?.trim() || undefined
    })
    await openDashboardViaPaymentSuccessModal(page)
    await closeOnboarding(page)
  }
  w.currentPage = 'Dashboard'
}

export async function loadAccountPage(page: Page, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  const f = flow(w.testData)
  if (f === 'Direct') {
    await gotoLogin(page)
    await dismissCookiesIfPresent(page)
    await loginExistingUserFromLogin(page, w.email)
    await openDashboardViaPaymentSuccessModal(page).catch(() => {})
    await gotoAccount(page)
  } else if (f === 'Forms') {
    await runEditorUploadRegisterAndVisaPayment(page, { email: w.email })
    await openDashboardViaPaymentSuccessModal(page)
    await gotoAccount(page)
  } else {
    await loadDashboardPage(page, w)
    await gotoAccount(page)
  }
  w.currentPage = 'Account'
}

export async function loadContactPage(page: Page, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  await gotoMarketingPath(page, '/contact', { waitUntil: 'domcontentloaded' })
  await dismissCookiesIfPresent(page)
  w.currentPage = 'Contact'
}

export async function loadDownloadsPage(page: Page, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  await gotoMarketingPath(page, '/downloads', { waitUntil: 'domcontentloaded' })
  w.currentPage = 'Downloads'
}

export async function loadLandingProductPage(page: Page, slug: string, w: BddWorld): Promise<void> {
  await closeCrmPageIfOpen(w)
  await gotoLanding(page, slug)
  w.currentPage = 'Landing'
}

export async function loadCrmCustomersTable(page: Page, w: BddWorld, context: BrowserContext): Promise<void> {
  if (!w.crmPage || w.crmPage.isClosed()) {
    w.crmPage = await context.newPage()
  }
  await loginCrmAndOpenCustomers(w.crmPage!)
  w.currentPage = 'CrmCustomersTable'
}

export async function loadCrmCustomerForCurrentUser(page: Page, w: BddWorld, context: BrowserContext): Promise<void> {
  const email = w.email
  if (!email) throw new Error('Missing user email before CRM customer page')
  if (w.crmPage && !w.crmPage.isClosed()) {
    await w.crmPage.close().catch(() => {})
  }
  w.crmPage = await openCrmCustomerForEmail(context, email)
  w.currentPage = 'CrmCustomer'
}

export async function searchCurrentCustomerOnCrm(w: BddWorld): Promise<void> {
  const p = w.crmPage
  if (!p) throw new Error('CRM page not open')
  await searchAndOpenFirstCustomer(p, w.email)
}

export async function goAccountFromHome(page: Page, w: BddWorld): Promise<void> {
  await clickAccountMenu(page)
  await page.locator('[data-id="accountMenuAccount"]').first().click({ timeout: 10_000 }).catch(() => {})
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  w.currentPage = 'Account'
}

async function waitForHomeUploadIdle(page: Page): Promise<void> {
  await page.locator(home.uploadLoader).first().waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {})
  await page
    .locator(home.uploadLoadingOverlay)
    .first()
    .waitFor({ state: 'hidden', timeout: 120_000 })
    .catch(() => {})
}

export async function uploadDocumentForFormat(page: Page, w: BddWorld, format: string): Promise<void> {
  const upper = format.toUpperCase()
  const map: Record<string, 'PDF' | 'DOCX' | 'PNG' | 'JPG' | 'XLSX' | 'PPTX'> = {
    PDF: 'PDF',
    DOCX: 'DOCX',
    PNG: 'PNG',
    JPG: 'JPG',
    JPEG: 'JPG',
    XLSX: 'XLSX',
    PPTX: 'PPTX'
  }
  const key = map[upper] ?? 'PDF'
  const filePath = fixturePathFor(key)
  if (!filePath) throw new Error(`No fixture for format ${format}`)
  await waitForHomeUploadIdle(page)
  if (isPdfhintScenario()) {
    const hero = page.locator(home.uploadDocumentHeroInput).first()
    await hero.waitFor({ state: 'attached', timeout: 120_000 })
    await hero.setInputFiles(filePath)
    await page
      .locator(home.uploadLoadingOverlay)
      .first()
      .waitFor({ state: 'hidden', timeout: 120_000 })
      .catch(() => {})
    return
  }
  const dropzone = page.locator(home.uploadDocumentButton).first()
  await dropzone.waitFor({ state: 'attached', timeout: 120_000 })
  await dropzone.setInputFiles(filePath)
}

export async function applyForcedUrl(page: Page, rawJson: string): Promise<void> {
  const params = JSON.parse(rawJson) as Record<string, string>
  await forceUrlWithParameters(page, params)
}

export { forceWrongUrl }

export async function runCloseOnboarding(page: Page): Promise<void> {
  await closeOnboarding(page)
}

export async function runCloseOnboardingOnce(page: Page): Promise<void> {
  await closeOnboardingOnce(page)
}

export async function fillContactFormLikeLegacy(page: Page): Promise<void> {
  const email = `playwright+contact+${Date.now()}@example.com`
  await page.locator(contact.firstName).waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator(contact.firstName).fill('Playwright')
  await page.locator(contact.lastName).fill('QA')
  await page.locator(contact.email).fill(email)
  await page.locator(contact.transactionId).fill('E2E')
  const subject = page.locator(contact.subjectSelect)
  if (await subject.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await subject.selectOption({ index: 1 }).catch(() => {})
  }
  await page.locator(contact.message).fill('Automated contact message (bdd).')
  await page.locator(contact.acceptTerms).click()
  await page.locator(contact.sendButton).click()
}
