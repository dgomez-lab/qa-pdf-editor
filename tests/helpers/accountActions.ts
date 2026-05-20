import type { Page } from '@playwright/test'
import { appUrl, isPdfhintApp } from './appUrl'
import { gotoMarketingPath } from './mvpsUrl'

/**
 * Selectores de la página `account` y `account/membership`. El staging actual
 * añadió prefijo `sidebar` a los enlaces y sufijo `Account` a algunos textos:
 * - `membershipLink`     → `sidebarMembershipLink`
 * - `activeStatus`       → `statusActive`
 * - `transactionPrice`   → `transactionPriceAccount`
 *
 * Se mantiene retro-compat aceptando ambos data-id mediante combinador `,`.
 */
export const accountSelectors = {
  firstNameInput: '[data-id="firstNameForm"]',
  lastNameInput: '[data-id="lastNameForm"]',
  secondLastNameInput: '[data-id="secondLastNameForm"]',
  saveChangesCta: '[data-id="ctaSaveChanges"]',
  membershipLink: '[data-id="sidebarMembershipLink"], [data-id="membershipLink"]',
  activeStatus: '[data-id="statusActive"], [data-id="activeStatus"]',
  cancelSubscriptionLink: '[data-id="cancelSubscription"]',
  yesUnsubscribeButton: '[data-id="unsubscribeAccount"], [data-id="yesUnsubscribe"]',
  returnAccountButton: '[data-id="returnAccount"]',
  transactionPriceText: '[data-id="transactionPriceAccount"], [data-id="transactionPrice"]',
  transactionMonthlyPriceText: '[data-id="transactionMonthlyPriceAccount"], [data-id="transactionMonthlyPrice"]'
} as const

export async function fillAccountForm(
  page: Page,
  data: { firstName?: string; lastName?: string; secondLastName?: string }
): Promise<void> {
  if (data.firstName !== undefined) await page.locator(accountSelectors.firstNameInput).fill(data.firstName)
  if (data.lastName !== undefined) await page.locator(accountSelectors.lastNameInput).fill(data.lastName)
  if (data.secondLastName !== undefined)
    await page.locator(accountSelectors.secondLastNameInput).fill(data.secondLastName)
}

export async function clickSaveChanges(page: Page): Promise<void> {
  await page.locator(accountSelectors.saveChangesCta).click()
}

export async function gotoMembership(page: Page): Promise<void> {
  /**
   * El staging actual no expone `data-id="membershipLink"`; se prueba la cadena
   * de selectores y, como último recurso, navegación directa a `/account/membership`
   * (paridad con el href visible en el menú del legacy).
   */
  const candidates = [
    page.locator(accountSelectors.membershipLink).first(),
    page.getByRole('link', { name: /^membership$/i }).first(),
    page.locator('a[href$="/account/membership"]').first()
  ]
  for (const c of candidates) {
    if (await c.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await c.click({ timeout: 10_000 }).catch(() => {})
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      return
    }
  }
  const path = isPdfhintApp() ? '/en/account/membership' : '/account/membership'
  await gotoMarketingPath(page, appUrl(path), { waitUntil: 'domcontentloaded' })
}

/**
 * Cancela la suscripción desde la página de membership del usuario.
 *
 * En el staging actual los CTAs son `<div data-id="cancelSubscription">` y
 * `<div data-id="unsubscribeAccount">` (no `<button>`); un `force-click` de
 * Playwright no siempre dispara el handler React en elementos no-button. Para
 * garantizar que se ejecute la lógica de cancelación se hace `click()` normal y
 * adicionalmente se despachan eventos `mousedown/mouseup/click` nativos.
 */
async function realisticClick(page: Page, locator: ReturnType<Page['locator']>): Promise<void> {
  await locator.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {})
  await locator.hover({ timeout: 5_000 }).catch(() => {})
  await locator.click({ timeout: 8_000 }).catch(async () => {
    await locator.evaluate((el: Element) => {
      const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window, button: 0 }
      ;(el as HTMLElement).focus?.()
      el.dispatchEvent(new MouseEvent('mousedown', opts))
      el.dispatchEvent(new MouseEvent('mouseup', opts))
      el.dispatchEvent(new MouseEvent('click', opts))
    })
  })
}

export async function cancelSubscriptionFromAccount(page: Page): Promise<void> {
  await gotoMembership(page)
  const cancelCandidates = [
    page.locator(accountSelectors.cancelSubscriptionLink).first(),
    page.getByRole('button', { name: /cancel\s+subscription|cancel\s+membership|unsubscribe/i }).first(),
    page.getByRole('link', { name: /cancel\s+subscription|cancel\s+membership|unsubscribe/i }).first()
  ]
  for (const c of cancelCandidates) {
    if (await c.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await realisticClick(page, c)
      break
    }
  }
  await page.waitForTimeout(800)
  const yesCandidates = [
    page.locator(accountSelectors.yesUnsubscribeButton).first(),
    page.getByRole('button', { name: /yes,?\s*unsubscribe|cancel\s+(my\s+)?subscription|confirm/i }).first()
  ]
  for (const y of yesCandidates) {
    if (await y.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await realisticClick(page, y)
      break
    }
  }
  await page.locator(accountSelectors.yesUnsubscribeButton).first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {})
  const price = page.locator(accountSelectors.transactionPriceText).first()
  if (!(await price.isVisible({ timeout: 5_000 }).catch(() => false))) {
    await gotoMembership(page)
  }
}
