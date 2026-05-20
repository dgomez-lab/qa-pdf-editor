import type { Page } from '@playwright/test'
import { loginCrmAndOpenCustomers, searchAndOpenFirstCustomer } from '../../../helpers/crmStaging'
import { crmHome } from '../crmSelectors'

export class CrmHomePage {
  constructor(private readonly page: Page) {}

  async login(email: string, password: string): Promise<void> {
    await this.page.locator(crmHome.loginEmailInput).waitFor({ state: 'visible', timeout: 60_000 })
    await this.page.locator(crmHome.loginEmailInput).fill(email)
    await this.page.locator(crmHome.loginPasswordInput).fill(password)
    await this.page.locator(crmHome.loginButton).click()
  }

  async loginAndOpenCustomerByEmail(customerEmail: string): Promise<void> {
    await loginCrmAndOpenCustomers(this.page)
    await searchAndOpenFirstCustomer(this.page, customerEmail)
  }
}
