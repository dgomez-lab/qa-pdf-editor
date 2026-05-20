import type { Page } from '@playwright/test'
import { login } from './loginSelectors'

export class LoginPage {
  constructor(private readonly page: Page) {}

  async fillEmail(value: string): Promise<void> {
    await this.page.locator(login.emailInput).fill(value)
  }

  async fillPassword(value: string): Promise<void> {
    await this.page.locator(login.passwordInput).fill(value)
  }

  async submitLogin(): Promise<void> {
    await this.page.locator(login.loginCtaButton).click()
  }
}
