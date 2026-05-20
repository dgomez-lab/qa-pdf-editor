import type { Page } from '@playwright/test'
import { dismissCookiesIfPresent } from '../../helpers/navigation'
import { pdfCommon } from './pdfCommonSelectors'

export class PdfCommonPage {
  constructor(protected readonly page: Page) {}

  async dismissCookiesIfPresent(): Promise<void> {
    await dismissCookiesIfPresent(this.page)
  }

  logoLocator(): ReturnType<Page['locator']> {
    return this.page.locator(pdfCommon.logo)
  }

  acceptCookiesLocator(): ReturnType<Page['locator']> {
    return this.page.locator(pdfCommon.acceptCookiesCta)
  }
}
