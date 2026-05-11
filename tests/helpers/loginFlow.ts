import type { Page } from '@playwright/test'
import { gotoLogin } from './dashboardActions'
import { dismissCookiesIfPresent } from './navigation'

export const loginSelectors = {
  emailForm: '[data-id="emailForm"]',
  loginSubmit: '[data-id="loginBtnSubmit"]',
  loginCtaButton: '[data-id="loginCtaButton"]',
  blockedUserMessage: '[data-id="blockedUserMessage"]'
} as const

/**
 * Registro / login simple desde la página de login (magic-link auth en pdfhint).
 * Paridad con `LoginPage.registerNewUser` / `loginWithAnExistingUser` legacy.
 */
export async function registerNewUserFromLogin(page: Page, email: string): Promise<void> {
  await gotoLogin(page)
  await dismissCookiesIfPresent(page)
  await page.locator(loginSelectors.emailForm).waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator(loginSelectors.emailForm).fill(email)
  await page.locator(loginSelectors.loginSubmit).click()
}

export async function loginExistingUserFromLogin(page: Page, email: string): Promise<void> {
  await registerNewUserFromLogin(page, email)
}

/**
 * Simulación de "try login with a blocked user": rellena un email y comprueba el mensaje de bloqueo.
 */
export async function tryLoginBlockedUser(page: Page, email: string): Promise<void> {
  await registerNewUserFromLogin(page, email)
}
