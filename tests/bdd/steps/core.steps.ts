import type { DataTable } from 'playwright-bdd'
import { Given, When, Then, expect } from '../fixtures'
import {
  loadHomePage,
  loadLoginPage,
  loadEditorPage,
  loadDashboardPage,
  loadAccountPage,
  loadContactPage,
  loadDownloadsPage,
  loadLandingProductPage,
  loadCrmCustomersTable,
  loadCrmCustomerForCurrentUser,
  searchCurrentCustomerOnCrm,
  goAccountFromHome,
  uploadDocumentForFormat,
  applyForcedUrl,
  forceWrongUrl,
  runCloseOnboarding,
  runCloseOnboardingOnce,
  fillContactFormLikeLegacy
} from '../pageFactory'
import { getLocatorForPage } from '../elementRegistry'
import { bddLocator, bddPage, screenshotOpts, visualSnapshotBaseForPageLabel } from '../stepHelpers'
import { marketingPage } from '../activePage'
import { logBrowserRefresh, logElementAction } from '../bddLogger'
import { clickNextButton, createNewUserFromEditor, loginExistingUserFromEditor } from '../../helpers/editorActions'
import { registerNewUserFromLogin, loginExistingUserFromLogin, tryLoginBlockedUser } from '../../helpers/loginFlow'
import { fillStripePaymentLikeLegacy } from '../../helpers/stripePayment'
import { stripeCardForName } from '../stripeTestCards'
import { openDashboardViaPaymentSuccessModal } from '../../helpers/pdfhintEditorPaymentFlow'
import { gotoMembership, cancelSubscriptionFromAccount, accountSelectors } from '../../helpers/accountActions'
import {
  getSubscriptionId,
  getAccountId,
  refundLastPaymentLikeLegacy,
  assertLastPaymentTableDeepEqual,
  assertLastTransactionDatesAreToday,
  extractLastTransactionIdFromGrid,
  confirmSubscriptionCancellation,
  unsubscribeCustomer,
  waitForSubscriptionStatus,
  filterCrmCustomersByEmail
} from '../../helpers/crmStaging'
import { payLegacyRecurrence, waitForRecurrenceToFinish, blockCustomerApi } from '../../helpers/recurrencesApi'
import { appUrl } from '../../helpers/appUrl'
import { gotoMarketingPath } from '../../helpers/mvpsUrl'
import {
  toCatcherEmail,
  waitForMessageDetail,
  waitForMessageDetailSubjectMatchesOne,
  subjectFragmentFor,
  extractDownloadCode,
  extractFirstHttpsUrl
} from '../../helpers/mailpitClient'
import { assertAccountCreatedEmail } from '../../helpers/accountCreatedEmailAssertions'
import { assertMagicLinkEmailInExpectedLanguage } from '../../helpers/magicLinkEmailAssertions'
import { assertSubscriptionCancellationEmailLocalized } from '../../helpers/subscriptionCancellationEmailAssertions'
import {
  assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement,
  paymentConfirmationSubjectFragmentForLocale
} from '../../helpers/paymentConfirmationEmailStrictAssertions'
import {
  collectHeaderAbsoluteHrefErrors,
  collectLandingAbsoluteHrefErrors,
  collectFooterAbsoluteHrefErrors,
  collectFormsPageAbsoluteHrefErrors,
  waitForMvpsFormsGridHydration
} from '../../helpers/seoAbsoluteHrefs'
import {
  headerLinkChecksForBaseUrl,
  landingPathnamesForSite,
  footerPathnamesForSite,
  hrefPolicyForSite,
  footerRootSelectorForSite
} from '../../helpers/seoExpectations'
import { isPdfhintScenario } from '../../helpers/pdfhintScenario'
import { collectPdfhintHeaderSeoErrors } from '../../helpers/pdfhintHeaderSeo'

function normalized(s: string): string {
  return s.trim().toLowerCase()
}

function urlRegexForPage(pageName: string): RegExp {
  const n = normalized(pageName)
  if (n === 'home') return /\/([a-z]{2}\/)?($|\?)/i
  if (n === 'login') return /\/login/i
  if (n === 'editor') return /\/editor(\/|$|\?)/i
  if (n === 'dashboard') return /\/dashboard/i
  if (n === 'account') return /\/account/i
  if (n === 'downloads') return /\/downloads/i
  if (n === 'contact') return /\/contact/i
  return new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

async function assertElementTextContainsFromStep(
  locator: ReturnType<typeof bddLocator>,
  expected: string
): Promise<void> {
  await expect(locator.first()).toContainText(expected, { timeout: 120_000 })
}

Given('I am in Home page', async ({ page, bddWorld }) => {
  await loadHomePage(page, bddWorld)
})

Given('I am in Home page in locale {word}', async ({ page, bddWorld }, locale: string) => {
  bddWorld.testData.locale = locale
  await loadHomePage(page, bddWorld)
})

Given('I am in Login page', async ({ page, bddWorld }) => {
  await loadLoginPage(page, bddWorld)
})

Given('I am in Login page in the current test locale', async ({ page, bddWorld }) => {
  await loadLoginPage(page, bddWorld)
})

Given('I am in Editor page', async ({ page, bddWorld }) => {
  await loadEditorPage(page, bddWorld)
})

Given('I am in Dashboard page', async ({ page, bddWorld }) => {
  await loadDashboardPage(page, bddWorld)
})

Given('I am in Account page', async ({ page, bddWorld }) => {
  await loadAccountPage(page, bddWorld)
})

Given('I am in Contact page', async ({ page, bddWorld }) => {
  await loadContactPage(page, bddWorld)
})

Given('I am in Downloads page', async ({ page, bddWorld }) => {
  await loadDownloadsPage(page, bddWorld)
})

When('I am in product landing page {word}', async ({ page, bddWorld }, landingAlt: string) => {
  await loadLandingProductPage(page, landingAlt, bddWorld)
})

Given('I am in CrmCustomersTable page', async ({ page, context, bddWorld }) => {
  await loadCrmCustomersTable(page, bddWorld, context)
})

Given('I am in CrmCustomer page', async ({ page, context, bddWorld }) => {
  await loadCrmCustomerForCurrentUser(page, bddWorld, context)
})

When('I search the current customer', async ({ bddWorld }) => {
  if (!bddWorld.crmPage) throw new Error('CRM page is not open')
  await filterCrmCustomersByEmail(bddWorld.crmPage, bddWorld.email)
})

Then('I am redirected to {word} page', async ({ page, bddWorld }, target: string) => {
  const p = marketingPage(bddWorld, page)
  await expect(p).toHaveURL(urlRegexForPage(target), { timeout: 120_000 })
})

Then('I am redirected to {string} page', async ({ page, bddWorld }, target: string) => {
  const p = marketingPage(bddWorld, page)
  await expect(p).toHaveURL(urlRegexForPage(target), { timeout: 120_000 })
})

When('I click next button', async ({ page, bddWorld }) => {
  await clickNextButton(bddPage(bddWorld, page), { flow: bddWorld.testData.flow })
})

Then('I create a new user from the editor', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  await createNewUserFromEditor(p, bddWorld.email)
})

Then('I register a new user', async ({ page, bddWorld }) => {
  await registerNewUserFromLogin(bddPage(bddWorld, page), bddWorld.email)
})

When('I register a new user from login', async ({ page, bddWorld }) => {
  await registerNewUserFromLogin(bddPage(bddWorld, page), bddWorld.email)
})

When('I register a new user from login tracking account creation email', async ({ page, bddWorld }) => {
  bddWorld.accountCreatedEmailRequestedAtMs = Date.now()
  await registerNewUserFromLogin(bddPage(bddWorld, page), bddWorld.email)
})

Then('I login with an existing user', async ({ page, bddWorld }) => {
  await loginExistingUserFromLogin(bddPage(bddWorld, page), bddWorld.email)
})

Then('I login with the last user created', async ({ page, bddWorld }) => {
  await loginExistingUserFromEditor(bddPage(bddWorld, page), bddWorld.email)
})

Then('I try login with a blocked user', async ({ page, bddWorld }) => {
  await tryLoginBlockedUser(bddPage(bddWorld, page), bddWorld.email)
})

When('I upload a {word} document', async ({ page, bddWorld }, format: string) => {
  await uploadDocumentForFormat(bddPage(bddWorld, page), bddWorld, format)
})

When('I make the initial payment', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  const cardName = bddWorld.testData.card || 'Visa'
  const card = stripeCardForName(cardName)
  logElementAction('Filling', 'stripe card number input', `${cardName} → ${card.number}`)
  await fillStripePaymentLikeLegacy(p, card)
  await p.locator('[data-id="confirm-payment-button"]').first().click({ timeout: 15_000 }).catch(() => {})
  await p.waitForTimeout(2000)
})

Then('I save my document', async ({ page, bddWorld }) => {
  await openDashboardViaPaymentSuccessModal(bddPage(bddWorld, page))
  bddWorld.currentPage = 'Dashboard'
})

When('I wait for element {string}', async ({ page, bddWorld }, elementLabel: string) => {
  logElementAction('Waiting for', elementLabel)
  const p = bddPage(bddWorld, page)
  if (elementLabel === 'transaction price text' || elementLabel === 'transaction monthly price text') {
    await gotoMembership(p)
  }
  await bddLocator(bddWorld, page, elementLabel).first().waitFor({ state: 'visible', timeout: 120_000 })
})

When(/^I wait for element (.+)$/, async ({ page, bddWorld }, elementLabel: string) => {
  const label = elementLabel.trim()
  logElementAction('Waiting for', label)
  const p = bddPage(bddWorld, page)
  if (label === 'transaction price text' || label === 'transaction monthly price text') {
    await gotoMembership(p)
  }
  await bddLocator(bddWorld, page, label).first().waitFor({ state: 'visible', timeout: 120_000 })
})

When('I wait until hide element {string}', async ({ page, bddWorld }, elementLabel: string) => {
  await bddLocator(bddWorld, page, elementLabel).first().waitFor({ state: 'hidden', timeout: 120_000 })
})

When(/^I wait until hide element (.+)$/, async ({ page, bddWorld }, elementLabel: string) => {
  await bddLocator(bddWorld, page, elementLabel).first().waitFor({ state: 'hidden', timeout: 120_000 })
})

Then('The page does have element {string}', async ({ page, bddWorld }, elementLabel: string) => {
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toBeVisible({ timeout: 120_000 })
})

Then(/^The page does have element (.+)$/, async ({ page, bddWorld }, elementLabel: string) => {
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toBeVisible({ timeout: 120_000 })
})

Then('The page does not have element {string}', async ({ page, bddWorld }, elementLabel: string) => {
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toHaveCount(0, { timeout: 60_000 })
})

Then(/^The page does not have element (.+)$/, async ({ page, bddWorld }, elementLabel: string) => {
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toHaveCount(0, { timeout: 60_000 })
})

When('I click element {string}', async ({ page, bddWorld }, elementLabel: string) => {
  const p = bddPage(bddWorld, page)
  logElementAction('Clicking', elementLabel)
  const loc = bddLocator(bddWorld, page, elementLabel).first()
  await loc.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {})
  await loc.click({ timeout: 20_000 })
  if (elementLabel === 'yes unsubscribe button') {
    bddWorld.subscriptionPurchaseDateMs = Date.now()
  }
  if (elementLabel === 'account menu link') bddWorld.currentPage = 'Account'
  if (elementLabel === 'membership menu link') bddWorld.currentPage = 'Account'
  if (elementLabel === 'dashboard menu link') bddWorld.currentPage = 'Dashboard'
  if (elementLabel === 'logout menu link') bddWorld.currentPage = 'Login'
  await p.waitForTimeout(300)
})

When(/^I click element (.+)$/, async ({ page, bddWorld }, elementLabel: string) => {
  const p = bddPage(bddWorld, page)
  logElementAction('Clicking', elementLabel.trim())
  const loc = bddLocator(bddWorld, page, elementLabel).first()
  await loc.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {})
  await loc.click({ timeout: 20_000 })
  if (elementLabel === 'yes unsubscribe button') {
    bddWorld.subscriptionPurchaseDateMs = Date.now()
  }
  if (elementLabel === 'account menu link') bddWorld.currentPage = 'Account'
  if (elementLabel === 'membership menu link') bddWorld.currentPage = 'Account'
  if (elementLabel === 'dashboard menu link') bddWorld.currentPage = 'Dashboard'
  if (elementLabel === 'logout menu link') bddWorld.currentPage = 'Login'
  await p.waitForTimeout(300)
})

When('I wait and click element {string}', async ({ page, bddWorld }, elementLabel: string) => {
  const loc = bddLocator(bddWorld, page, elementLabel).first()
  await loc.waitFor({ state: 'visible', timeout: 120_000 })
  await loc.click({ timeout: 20_000 })
})

When(/^I wait and click element (.+)$/, async ({ page, bddWorld }, elementLabel: string) => {
  const loc = bddLocator(bddWorld, page, elementLabel).first()
  await loc.waitFor({ state: 'visible', timeout: 120_000 })
  await loc.click({ timeout: 20_000 })
})

When('I scroll to element {string}', async ({ page, bddWorld }, elementLabel: string) => {
  await bddLocator(bddWorld, page, elementLabel).first().scrollIntoViewIfNeeded()
})

When(/^I scroll to element (.+)$/, async ({ page, bddWorld }, elementLabel: string) => {
  await bddLocator(bddWorld, page, elementLabel).first().scrollIntoViewIfNeeded()
})

Then('The text of element {string} should be {string}', async ({ page, bddWorld }, elementLabel: string, expected: string) => {
  if (elementLabel === 'customer subscription status' && bddWorld.crmPage) {
    const rx = new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const value = await waitForSubscriptionStatus(bddWorld.crmPage, rx, {
      timeoutMs: 120_000,
      email: bddWorld.email
    })
    expect(value.toLowerCase()).toContain(expected.toLowerCase())
    return
  }
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toHaveText(expected, { timeout: 120_000 })
})

Then(/^The text of element (.+) should be (.+)$/, async ({ page, bddWorld }, elementLabel: string, expected: string) => {
  if (elementLabel === 'customer subscription status' && bddWorld.crmPage) {
    const rx = new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const value = await waitForSubscriptionStatus(bddWorld.crmPage, rx, {
      timeoutMs: 120_000,
      email: bddWorld.email
    })
    expect(value.toLowerCase()).toContain(expected.toLowerCase())
    return
  }
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toHaveText(expected, { timeout: 120_000 })
})

Then('The text of element {string} should contain {string}', async ({ page, bddWorld }, elementLabel: string, expected: string) => {
  await assertElementTextContainsFromStep(bddLocator(bddWorld, page, elementLabel), expected)
})

Then(/^The text of element (.+) should contain (.+)$/, async ({ page, bddWorld }, elementLabel: string, expected: string) => {
  await assertElementTextContainsFromStep(bddLocator(bddWorld, page, elementLabel), expected)
})

Then('The value of element {string} should be {string}', async ({ page, bddWorld }, elementLabel: string, expected: string) => {
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toHaveValue(expected, { timeout: 120_000 })
})

Then(/^The value of element (.+) should be (.+)$/, async ({ page, bddWorld }, elementLabel: string, expected: string) => {
  await expect(bddLocator(bddWorld, page, elementLabel).first()).toHaveValue(expected, { timeout: 120_000 })
})

When('I fill element {string} with {string}', async ({ page, bddWorld }, elementLabel: string, value: string) => {
  await bddLocator(bddWorld, page, elementLabel).first().fill(value)
})

When(/^I fill element (.+) with (.+)$/, async ({ page, bddWorld }, elementLabel: string, value: string) => {
  await bddLocator(bddWorld, page, elementLabel).first().fill(value)
})

When('I wait {int} seconds', async ({ page, bddWorld }, seconds: number) => {
  await bddPage(bddWorld, page).waitForTimeout(seconds * 1000)
})

When('I click browser refresh button', async ({ page, bddWorld }) => {
  logBrowserRefresh()
  await bddPage(bddWorld, page).reload({ waitUntil: 'domcontentloaded' })
})

When('I force URL with parameters', async ({ page, bddWorld }, rawJson: string) => {
  await applyForcedUrl(bddPage(bddWorld, page), rawJson)
})

When('I force a wrong URL', async ({ page, bddWorld }) => {
  await forceWrongUrl(bddPage(bddWorld, page))
})

When('I close the onboarding', async ({ page, bddWorld }) => {
  await runCloseOnboarding(bddPage(bddWorld, page))
})

When('I close the onboarding once', async ({ page, bddWorld }) => {
  await runCloseOnboardingOnce(bddPage(bddWorld, page))
})

When('I rename the first document', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  await bddLocator(bddWorld, p, 'rename element 0 button').first().click()
  await bddLocator(bddWorld, p, 'rename element input').first().fill('QA Rename')
  await bddLocator(bddWorld, p, 'rename element button').first().click()
})

When('I delete, restore back and delete definitely an element', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  const deleteBtn = bddLocator(bddWorld, p, 'delete element 0 button').first()
  if (await deleteBtn.isVisible({ timeout: 20_000 }).catch(() => false)) {
    await deleteBtn.click()
  }
  await bddLocator(bddWorld, p, 'dashboard trash side menu link').first().click({ timeout: 20_000 }).catch(() => {})
  const restore = bddLocator(bddWorld, p, 'restore element 0 bin button').first()
  if (await restore.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await restore.click()
  }
  const deleteAgain = bddLocator(bddWorld, p, 'delete element 0 button').first()
  if (await deleteAgain.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await deleteAgain.click()
  }
  await bddLocator(bddWorld, p, 'dashboard trash side menu link').first().click({ timeout: 20_000 }).catch(() => {})
  const permanent = bddLocator(bddWorld, p, 'delete modal button').first()
  if (await permanent.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await permanent.click()
  }
})

When('I delete a document and open delete modal', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  const deleteBtn = bddLocator(bddWorld, p, 'delete element 0 button').first()
  if (await deleteBtn.isVisible({ timeout: 20_000 }).catch(() => false)) await deleteBtn.click()
})

When('I open delete modal', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  const permanent = bddLocator(bddWorld, p, 'delete modal button').first()
  if (await permanent.isVisible({ timeout: 20_000 }).catch(() => false)) await permanent.click()
})

When('I fill contact form', async ({ page, bddWorld }) => {
  await fillContactFormLikeLegacy(bddPage(bddWorld, page))
})

When('I go to account', async ({ page, bddWorld }) => {
  await goAccountFromHome(bddPage(bddWorld, page), bddWorld)
})

Then('I cancel subscription', async ({ page, bddWorld }) => {
  await cancelSubscriptionFromAccount(bddPage(bddWorld, page))
})

When('I get the subscription ID from the customer', async ({ bddWorld }) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  bddWorld.subscriptionId = await getSubscriptionId(bddWorld.crmPage)
})

When('I get the account ID from the customer', async ({ bddWorld }) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  bddWorld.qaBlockCustomerId = await getAccountId(bddWorld.crmPage)
})

Then('I unsubscribe the customer', async ({ bddWorld }) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  await unsubscribeCustomer(bddWorld.crmPage)
})

Then('I block the user created', async ({ bddWorld }) => {
  if (!bddWorld.qaBlockCustomerId) throw new Error('Missing customer id to block')
  await blockCustomerApi(bddWorld.qaBlockCustomerId)
})

Then('I confirm the subscription cancellation', async ({ bddWorld }) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  await confirmSubscriptionCancellation(bddWorld.crmPage)
})

When('I refund the last payment', async ({ bddWorld }) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  await refundLastPaymentLikeLegacy(bddWorld.crmPage)
})

Then(/^the customer domain should be (.+)$/, async ({ bddWorld }, expectedDomain: string) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  const loc = getLocatorForPage(bddWorld.crmPage, 'CrmCustomer', 'customer domain')
  await expect(loc).toHaveText(expectedDomain.trim(), { timeout: 60_000 })
})

Then(
  'I check the last first transaction payment data:',
  async ({ bddWorld }, table: DataTable) => {
    if (!bddWorld.crmPage) throw new Error('CRM page not open')
    const row = table.hashes()[0] ?? {}
    await assertLastPaymentTableDeepEqual(bddWorld.crmPage, 'first transaction', row)
  }
)

Then(
  'I check the last refund payment data:',
  async ({ bddWorld }, table: DataTable) => {
    if (!bddWorld.crmPage) throw new Error('CRM page not open')
    const row = table.hashes()[0] ?? {}
    await assertLastPaymentTableDeepEqual(bddWorld.crmPage, 'refund', row)
  }
)

Then(
  'I check the last recurrency payment data:',
  async ({ bddWorld }, table: DataTable) => {
    if (!bddWorld.crmPage) throw new Error('CRM page not open')
    const row = table.hashes()[0] ?? {}
    await assertLastPaymentTableDeepEqual(bddWorld.crmPage, 'recurrency', row, {
      initialTransactionId: bddWorld.lastTransactionId
    })
  }
)

When('I pay the 14056 recurrency with status {word}', async ({ bddWorld }, status: string) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  if (!bddWorld.subscriptionId) throw new Error('Missing subscriptionId')
  bddWorld.lastTransactionId = await extractLastTransactionIdFromGrid(bddWorld.crmPage)
  const s = normalized(status)
  const kind = s === 'soft' ? 'soft' : s === 'hard' ? 'hard' : 'success'
  await payLegacyRecurrence(bddWorld.subscriptionId, kind)
})

When('I wait for recurrency process to finish', async () => {
  await waitForRecurrenceToFinish(60_000)
})

Then('all date fields of the last transaction should be today', async ({ bddWorld }) => {
  if (!bddWorld.crmPage) throw new Error('CRM page not open')
  await assertLastTransactionDatesAreToday(bddWorld.crmPage)
})

When('I request the magic link for the current user', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  bddWorld.magicLinkRequestedAtMs = Date.now()
  await p.locator('[data-id="emailForm"]').fill(bddWorld.email)
  await p.locator('[data-id="loginBtnSubmit"]').click()
})

When('I wait for the magic link email for the current user', async ({ bddWorld }) => {
  const detail = await waitForMessageDetail({
    search: toCatcherEmail(bddWorld.email),
    subjectIncludes: subjectFragmentFor('magicLink', bddWorld.testData.locale || 'en'),
    timeoutMs: 120_000,
    afterMs: bddWorld.magicLinkRequestedAtMs ?? 0
  })
  bddWorld.magicLinkMessage = { HTML: detail.HTML, Text: detail.Text }
})

Then('the magic link email is in the expected language', async ({ bddWorld }) => {
  if (!bddWorld.magicLinkMessage) throw new Error('Missing magic link email message')
  assertMagicLinkEmailInExpectedLanguage(bddWorld.magicLinkMessage, bddWorld.testData.locale || 'en')
})

When('I wait for the account created email in Mailpit', async ({ bddWorld }) => {
  bddWorld.accountCreatedEmailDetail = await waitForMessageDetail({
    search: toCatcherEmail(bddWorld.email),
    timeoutMs: 120_000,
    afterMs: bddWorld.accountCreatedEmailRequestedAtMs ?? 0
  })
})

Then('the account created email contains expected welcome content and get started CTA', async ({ bddWorld }) => {
  if (!bddWorld.accountCreatedEmailDetail) throw new Error('Missing account created email detail')
  assertAccountCreatedEmail(
    bddWorld.accountCreatedEmailDetail,
    bddWorld.testData.locale || 'en',
    bddWorld.email
  )
})

When('I wait for the payment confirmation email for the current user', async ({ bddWorld }) => {
  bddWorld.paymentConfirmationDetail = await waitForMessageDetailSubjectMatchesOne({
    search: toCatcherEmail(bddWorld.email),
    subjectSubstrings: [paymentConfirmationSubjectFragmentForLocale(bddWorld.testData.locale || 'en')],
    timeoutMs: 180_000
  })
})

Then(
  'the payment confirmation email contains the expected plan, amount, account and bank statement details',
  async ({ bddWorld }) => {
    if (!bddWorld.paymentConfirmationDetail) throw new Error('Missing payment confirmation detail')
    assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
      bddWorld.paymentConfirmationDetail,
      {
        registrationEmail: bddWorld.email,
        testIp: bddWorld.testData.ip || 'ES',
        locale: bddWorld.testData.locale || 'en'
      }
    )
  }
)

When('I send the document to the registration email from the payment success modal', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  bddWorld.documentSentEmailRequestedAtMs = Date.now()
  await p.locator('[data-id="sendByEmailButton"]').first().click({ timeout: 20_000 })
})

When('I wait for the mergedpdf new document email in Mailpit', async ({ bddWorld }) => {
  bddWorld.documentSentDetail = await waitForMessageDetail({
    search: toCatcherEmail(bddWorld.email),
    subjectIncludes: subjectFragmentFor('documentSent', bddWorld.testData.locale || 'en'),
    timeoutMs: 180_000,
    afterMs: bddWorld.documentSentEmailRequestedAtMs ?? 0
  })
})

When('I open the download URL from the mergedpdf document email', async ({ page, bddWorld }) => {
  if (!bddWorld.documentSentDetail) throw new Error('Missing document sent email detail')
  const url = extractFirstHttpsUrl(bddWorld.documentSentDetail, { matches: /\/downloads?\b/i })
  if (!url) throw new Error('Missing downloads URL in email')
  await gotoMarketingPath(page, url, { waitUntil: 'domcontentloaded' })
  bddWorld.currentPage = 'Downloads'
})

When('I enter the mergedpdf document verification code into download code input', async ({ page, bddWorld }) => {
  if (!bddWorld.documentSentDetail) throw new Error('Missing document sent email detail')
  const p = bddPage(bddWorld, page)
  const code = extractDownloadCode(bddWorld.documentSentDetail)
  if (!code) throw new Error('Missing download code in email')
  const input = p.locator('[data-id="downloadCodeInput"], [data-id="downloadCode"]').first()
  await input.fill(code)
})

When('I trigger the mergedpdf document download from the downloads page', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  await p.locator('[data-id="downloadCodeSubmit"], [data-id="ctaDownload"]').first().click({ timeout: 20_000 })
})

Then('the browser url should contain {word}', async ({ page, bddWorld }, token: string) => {
  await expect(marketingPage(bddWorld, page)).toHaveURL(new RegExp(token, 'i'), { timeout: 60_000 })
})

Then('The url of current page should contain {string}', async ({ page, bddWorld }, token: string) => {
  await expect(marketingPage(bddWorld, page)).toHaveURL(
    new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    { timeout: 60_000 }
  )
})

Then(/^The url of current page should contain (.+)$/, async ({ page, bddWorld }, token: string) => {
  await expect(marketingPage(bddWorld, page)).toHaveURL(
    new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    { timeout: 60_000 }
  )
})

When('The dashboard pdf preview should not show load failure', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  await expect(p.locator('[data-id="pdfPreviewFailure"]').first()).toHaveCount(0, { timeout: 20_000 })
})

When('I click yes unsubscribe button tracking subscription cancellation email', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  bddWorld.unsubscribeCancellationEmailRequestedAtMs = Date.now()
  await p.locator(accountSelectors.yesUnsubscribeButton).first().click({ timeout: 20_000 })
})

When('I record the subscription purchase moment for unsubscribe email', async ({ bddWorld }) => {
  bddWorld.subscriptionPurchaseDateMs = Date.now()
})

When('I wait for unsubscribe process to finish', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  await p
    .locator(`${accountSelectors.transactionPriceText}, [data-id="returnAccount"]`)
    .first()
    .waitFor({ state: 'visible', timeout: 120_000 })
})

When('I wait for the subscription cancellation email in Mailpit', async ({ bddWorld }) => {
  bddWorld.unsubscribeCancellationEmailDetail = await waitForMessageDetail({
    search: toCatcherEmail(bddWorld.email),
    subjectIncludes: subjectFragmentFor('subscriptionCancellation', bddWorld.testData.locale || 'en'),
    timeoutMs: 180_000,
    afterMs: bddWorld.unsubscribeCancellationEmailRequestedAtMs ?? bddWorld.subscriptionPurchaseDateMs ?? 0
  })
})

Then('the subscription cancellation email contains expected localized content', async ({ bddWorld }) => {
  if (!bddWorld.unsubscribeCancellationEmailDetail) throw new Error('Missing cancellation email detail')
  assertSubscriptionCancellationEmailLocalized(bddWorld.unsubscribeCancellationEmailDetail, {
    locale: bddWorld.testData.locale || 'en',
    registrationEmail: bddWorld.email,
    subscriptionPurchaseDateMs: bddWorld.subscriptionPurchaseDateMs
  })
})

Then('every link in the Home page header should have an absolute http or https URL', async ({ page }) => {
  if (isPdfhintScenario()) {
    expect(await collectPdfhintHeaderSeoErrors(page)).toEqual([])
    return
  }
  const errors = await collectHeaderAbsoluteHrefErrors(page, headerLinkChecksForBaseUrl(), {
    hrefPolicy: hrefPolicyForSite()
  })
  expect(errors).toEqual([])
})

Then('every landing page link on Home should have an absolute http or https URL', async ({ page }) => {
  const errors = await collectLandingAbsoluteHrefErrors(page, landingPathnamesForSite(), {
    hrefPolicy: hrefPolicyForSite()
  })
  expect(errors).toEqual([])
})

Then('every link in the Home page footer should have an absolute http or https URL', async ({ page }) => {
  const errors = await collectFooterAbsoluteHrefErrors(page, footerPathnamesForSite(), {
    hrefPolicy: hrefPolicyForSite(),
    footerSelector: footerRootSelectorForSite()
  })
  expect(errors).toEqual([])
})

When('I open the forms page for SEO link checks', async ({ page }) => {
  await gotoMarketingPath(page, appUrl('/forms'), { waitUntil: 'domcontentloaded' })
  await waitForMvpsFormsGridHydration(page)
})

Then('every most-used form link on the forms page should have an absolute http or https URL', async ({ page }) => {
  const errors = await collectFormsPageAbsoluteHrefErrors(page, { hrefPolicy: hrefPolicyForSite() })
  expect(errors).toEqual([])
})

When('I take a screenshot of the current page', async ({ page, bddWorld }) => {
  const p = bddPage(bddWorld, page)
  await p.waitForTimeout(1000)
})

Then('the comparison of {string} page should be correct', async ({ page, bddWorld }, pageLabel: string) => {
  const p = bddPage(bddWorld, page)
  const base = visualSnapshotBaseForPageLabel(pageLabel)
  await expect(p).toHaveScreenshot(`${base}.png`, screenshotOpts)
})

Then(/^the comparison of (.+) page should be correct$/, async ({ page, bddWorld }, pageLabel: string) => {
  const p = bddPage(bddWorld, page)
  const base = visualSnapshotBaseForPageLabel(pageLabel)
  await expect(p).toHaveScreenshot(`${base}.png`, screenshotOpts)
})

Then('I take a reference screenshot of {string} page', async ({ page, bddWorld }, pageLabel: string) => {
  const p = bddPage(bddWorld, page)
  const base = visualSnapshotBaseForPageLabel(pageLabel)
  await expect(p).toHaveScreenshot(`${base}.png`, screenshotOpts)
})

Then(/^I take a reference screenshot of (.+) page$/, async ({ page, bddWorld }, pageLabel: string) => {
  const p = bddPage(bddWorld, page)
  const base = visualSnapshotBaseForPageLabel(pageLabel)
  await expect(p).toHaveScreenshot(`${base}.png`, screenshotOpts)
})

When('I go into new opened window', async ({ context, page, bddWorld }) => {
  const existing = context.pages().find((p) => p !== page && !p.isClosed())
  if (existing) {
    bddWorld.popup = existing
    await existing.bringToFront().catch(() => {})
    return
  }
  const popup = await context.waitForEvent('page', { timeout: 60_000 })
  await popup.waitForLoadState('domcontentloaded').catch(() => {})
  bddWorld.popup = popup
  await popup.bringToFront().catch(() => {})
})

Then('I return to main window', async ({ page, bddWorld }) => {
  if (bddWorld.popup && !bddWorld.popup.isClosed()) {
    await bddWorld.popup.close().catch(() => {})
  }
  bddWorld.popup = null
  await page.bringToFront().catch(() => {})
})

Then('I return to main iframe', async ({ bddWorld }) => {
  bddWorld.popup = null
})
