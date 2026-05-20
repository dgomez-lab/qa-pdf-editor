import type { Page } from '@playwright/test'
import * as dashboardActions from '../../helpers/dashboardActions'

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async closeOnboarding(): Promise<void> {
    await dashboardActions.closeOnboarding(this.page)
  }

  async closeOnboardingOnce(): Promise<void> {
    await dashboardActions.closeOnboardingOnce(this.page)
  }

  async gotoDashboard(): Promise<void> {
    await dashboardActions.gotoDashboard(this.page)
  }

  async gotoAccount(): Promise<void> {
    await dashboardActions.gotoAccount(this.page)
  }

  async gotoLogin(): Promise<void> {
    await dashboardActions.gotoLogin(this.page)
  }

  async expectUploadDocumentButton(): Promise<void> {
    await dashboardActions.expectUploadDocumentButton(this.page)
  }

  async clickAccountMenu(): Promise<void> {
    await dashboardActions.clickAccountMenu(this.page)
  }
}
