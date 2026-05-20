import type { Page } from '@playwright/test'
import { crmCustomersTable } from '../crmSelectors'

export class CrmCustomersTablePage {
  constructor(private readonly page: Page) {}

  async searchByEmail(email: string): Promise<void> {
    await this.page.locator(crmCustomersTable.customersEmailSearchInput).fill(email)
    await this.page.locator(crmCustomersTable.customersSearchButton).click()
  }

  async openFirstCustomer(): Promise<void> {
    await this.page.locator(crmCustomersTable.customersFirstAccountIdLink).click({ timeout: 60_000 })
  }
}
