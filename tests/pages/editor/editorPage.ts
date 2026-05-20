import type { Page } from '@playwright/test'
import { editor } from '../editorSelectors'
import * as editorActions from '../../helpers/editorActions'

export class EditorPage {
  constructor(private readonly page: Page) {}

  async clickNextButton(): Promise<void> {
    await editorActions.clickNextButton(this.page)
  }

  async createNewUserFromEditor(email: string): Promise<void> {
    await editorActions.createNewUserFromEditor(this.page, email)
  }

  async loginExistingUserFromEditor(email: string): Promise<void> {
    await editorActions.loginExistingUserFromEditor(this.page, email)
  }

  async clickCloseModalButton(): Promise<void> {
    await editorActions.clickCloseModalButton(this.page)
  }

  async waitPaymentSuccessDownloadButton(): Promise<void> {
    await editorActions.waitPaymentSuccessDownloadButton(this.page)
  }

  async clickPaymentSuccessDownloadButton(): Promise<void> {
    await editorActions.clickPaymentSuccessDownloadButton(this.page)
  }

  transactionPriceLocator(): ReturnType<Page['locator']> {
    return this.page.locator(editor.transactionPrice)
  }

  monthlyTransactionPriceLocator(): ReturnType<Page['locator']> {
    return this.page.locator(editor.monthlyTransactionPrice)
  }
}
