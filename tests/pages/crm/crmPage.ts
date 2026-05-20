import type { Page } from '@playwright/test'
import { crm } from './crmSelectors'

export class CrmPage {
  constructor(private readonly page: Page) {}

  async openCustomersMenu(): Promise<void> {
    await this.page.locator(crm.customersMenuButton).click({ timeout: 60_000 })
  }
}
