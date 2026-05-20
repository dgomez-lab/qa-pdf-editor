import type { Page } from '@playwright/test'
import { account } from './accountSelectors'
import * as accountActions from '../../helpers/accountActions'

export class AccountPage {
  constructor(private readonly page: Page) {}

  async fillAccountForm(data: { firstName?: string; lastName?: string; secondLastName?: string }): Promise<void> {
    await accountActions.fillAccountForm(this.page, data)
  }

  async clickSaveChanges(): Promise<void> {
    await accountActions.clickSaveChanges(this.page)
  }

  async gotoMembership(): Promise<void> {
    await accountActions.gotoMembership(this.page)
  }

  locatorFirstName(): ReturnType<Page['locator']> {
    return this.page.locator(account.firstNameInput)
  }
}
